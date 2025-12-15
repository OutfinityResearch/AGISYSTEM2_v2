/**
 * AGISystem2 - Proof Engine
 * @module reasoning/prove
 *
 * Multi-step proof construction via backward chaining.
 * Handles transitive reasoning, rule matching, And/Or conditions.
 */

import { similarity } from '../core/operations.mjs';
import { MAX_PROOF_DEPTH, PROOF_TIMEOUT_MS, MAX_REASONING_STEPS } from '../core/constants.mjs';

/**
 * Transitive relations that support chaining
 */
const TRANSITIVE_RELATIONS = new Set(['isA', 'locatedIn', 'partOf', 'subclassOf', 'containedIn']);

/**
 * Reserved words to exclude from intermediates
 */
const RESERVED_WORDS = new Set([
  'Implies', 'And', 'Or', 'Not', 'ForAll', 'Exists',
  'True', 'False', 'forall', 'exists', 'implies', 'and', 'or', 'not'
]);

export class ProofEngine {
  /**
   * Create proof engine
   * @param {Session} session - Parent session
   * @param {Object} options - Proof options
   */
  constructor(session, options = {}) {
    this.session = session;
    this.options = {
      maxDepth: options.maxDepth || MAX_PROOF_DEPTH,
      timeout: options.timeout || PROOF_TIMEOUT_MS
    };
    this.steps = [];
    this.visited = new Set();
    this.startTime = 0;
    this.reasoningSteps = 0;
  }

  /**
   * Prove a goal statement
   * @param {Statement} goal - Goal to prove
   * @returns {ProofResult}
   */
  prove(goal) {
    this.steps = [];
    this.visited = new Set();
    this.startTime = Date.now();
    this.reasoningSteps = 0;

    try {
      const result = this.proveGoal(goal, 0);
      result.goal = result.goal || goal.toString?.() || '';
      // Keep result.steps if they exist (they have 'fact' property), else use logged steps
      if (!result.steps || result.steps.length === 0) {
        result.steps = this.steps;
      }
      return result;
    } catch (e) {
      return {
        valid: false,
        reason: e.message,
        goal: goal.toString?.() || '',
        steps: this.steps
      };
    }
  }

  /**
   * Main proof loop with depth tracking
   */
  proveGoal(goal, depth) {
    // Timeout check
    if (Date.now() - this.startTime > this.options.timeout) {
      throw new Error('Proof timed out');
    }

    // Step limit
    this.reasoningSteps++;
    if (this.reasoningSteps > MAX_REASONING_STEPS) {
      return { valid: false, reason: 'Step limit exceeded' };
    }

    // Depth limit
    if (depth > this.options.maxDepth) {
      return { valid: false, reason: 'Depth limit exceeded' };
    }

    const goalVec = this.session.executor.buildStatementVector(goal);
    const goalHash = this.hashVector(goalVec);

    // Cycle detection
    if (this.visited.has(goalHash)) {
      return { valid: false, reason: 'Cycle detected' };
    }
    this.visited.add(goalHash);

    // 1. Try direct KB match (strong)
    const goalStr = goal.toString();
    const directResult = this.tryDirectMatch(goalVec, goalStr);
    if (directResult.valid && directResult.confidence > 0.7) {
      // Add fact property for runner
      directResult.steps = [{ operation: 'direct_match', fact: this.goalToFact(goal) }];
      return directResult;
    }

    // 2. Try transitive reasoning
    const transitiveResult = this.tryTransitiveChain(goal, depth);
    if (transitiveResult.valid) {
      return transitiveResult;
    }

    // 3. Try rule matching (backward chaining)
    for (const rule of this.session.rules) {
      this.session.reasoningStats.ruleAttempts++;
      const ruleResult = this.tryRuleMatch(goal, rule, depth);
      if (ruleResult.valid) {
        return ruleResult;
      }
    }

    // 4. Try weaker direct match
    if (directResult.valid && directResult.confidence > 0.55) {
      directResult.steps = [{ operation: 'weak_match', fact: this.goalToFact(goal) }];
      return directResult;
    }

    // 5. Try disjoint proof for spatial relations
    const disjointResult = this.tryDisjointProof(goal, depth);
    if (disjointResult.valid) {
      return disjointResult;
    }

    return { valid: false, reason: 'No proof found' };
  }

  /**
   * Try direct match against KB
   */
  tryDirectMatch(goalVec, goalStr) {
    if (!goalVec?.data) {
      return { valid: false, confidence: 0 };
    }

    let bestSim = 0;
    for (const fact of this.session.kbFacts) {
      if (!fact.vector) continue;
      this.session.reasoningStats.kbScans++;
      this.session.reasoningStats.similarityChecks++;
      const sim = similarity(goalVec, fact.vector);
      if (sim > bestSim) {
        bestSim = sim;
      }
    }

    if (bestSim > 0.5) {
      return {
        valid: true,
        method: 'direct',
        confidence: bestSim,
        goal: goalStr
      };
    }

    return { valid: false, confidence: bestSim };
  }

  /**
   * Try transitive chain for supported relations
   */
  tryTransitiveChain(goal, depth) {
    const operatorName = this.extractOperatorName(goal);
    if (!operatorName || !TRANSITIVE_RELATIONS.has(operatorName)) {
      return { valid: false };
    }

    if (!goal.args || goal.args.length !== 2) {
      return { valid: false };
    }

    const subjectName = this.extractArgName(goal.args[0]);
    const objectName = this.extractArgName(goal.args[1]);
    if (!subjectName || !objectName) {
      return { valid: false };
    }

    // Find intermediates
    const intermediates = this.findIntermediates(operatorName, subjectName);

    for (const intermediate of intermediates) {
      if (Date.now() - this.startTime > this.options.timeout) {
        throw new Error('Proof timed out');
      }

      this.session.reasoningStats.transitiveSteps++;

      if (intermediate === objectName) {
        // Direct match found
        const stepFact = `${operatorName} ${subjectName} ${objectName}`;
        this.logStep('transitive_found', stepFact);
        return {
          valid: true,
          method: 'transitive_direct',
          confidence: 0.9,
          goal: goal.toString(),
          steps: [{ operation: 'transitive_found', fact: stepFact }]
        };
      }

      // Recursively prove intermediate -> object
      const chainResult = this.proveTransitiveStep(
        operatorName, intermediate, objectName, depth + 1
      );

      if (chainResult.valid) {
        const stepFact = `${operatorName} ${subjectName} ${intermediate}`;
        this.logStep('transitive_step', stepFact);
        return {
          valid: true,
          method: 'transitive_chain',
          confidence: chainResult.confidence * 0.98,
          goal: goal.toString(),
          steps: [
            { operation: 'transitive_step', fact: stepFact },
            ...chainResult.steps
          ]
        };
      }
    }

    return { valid: false };
  }

  /**
   * Prove a single transitive step
   */
  proveTransitiveStep(operatorName, from, to, depth) {
    if (Date.now() - this.startTime > this.options.timeout) {
      throw new Error('Proof timed out');
    }

    this.reasoningSteps++;
    if (this.reasoningSteps > MAX_REASONING_STEPS) {
      return { valid: false, reason: 'Step limit' };
    }

    if (depth > this.options.maxDepth) {
      return { valid: false, reason: 'Depth limit' };
    }

    const cycleKey = `${operatorName}:${from}:${to}`;
    if (this.visited.has(cycleKey)) {
      return { valid: false, reason: 'Cycle' };
    }
    this.visited.add(cycleKey);

    // Direct match using metadata
    for (const fact of this.session.kbFacts) {
      this.session.reasoningStats.kbScans++;
      if (fact.metadata?.operator === operatorName &&
          fact.metadata.args?.[0] === from &&
          fact.metadata.args?.[1] === to) {
        const stepFact = `${operatorName} ${from} ${to}`;
        return {
          valid: true,
          method: 'direct',
          confidence: 0.9,
          steps: [{ operation: 'transitive_match', fact: stepFact }]
        };
      }
    }

    // Try further chaining
    const nextIntermediates = this.findIntermediates(operatorName, from);
    for (const next of nextIntermediates) {
      this.session.reasoningStats.transitiveSteps++;

      if (next === to) {
        const stepFact = `${operatorName} ${from} ${next}`;
        return {
          valid: true,
          method: 'transitive_found',
          confidence: 0.85,
          steps: [{ operation: 'transitive_found', fact: stepFact }]
        };
      }

      const chainResult = this.proveTransitiveStep(operatorName, next, to, depth + 1);
      if (chainResult.valid) {
        const stepFact = `${operatorName} ${from} ${next}`;
        return {
          valid: true,
          method: 'transitive_chain',
          confidence: chainResult.confidence * 0.98,
          steps: [
            { operation: 'transitive_step', fact: stepFact },
            ...chainResult.steps
          ]
        };
      }
    }

    return { valid: false };
  }

  /**
   * Find intermediate values for transitive relation
   */
  findIntermediates(operatorName, subjectName) {
    const intermediates = [];

    for (const fact of this.session.kbFacts) {
      this.session.reasoningStats.kbScans++;
      const meta = fact.metadata;
      if (!meta || meta.operator !== operatorName) continue;
      if (!meta.args || meta.args.length < 2) continue;
      if (meta.args[0] !== subjectName) continue;

      const intermediate = meta.args[1];
      if (!intermediate) continue;
      if (RESERVED_WORDS.has(intermediate)) continue;
      if (intermediate === subjectName || intermediate === operatorName) continue;

      if (!intermediates.includes(intermediate)) {
        intermediates.push(intermediate);
      }
    }

    return intermediates;
  }

  /**
   * Try to match and apply a rule (backward chaining)
   */
  tryRuleMatch(goal, rule, depth) {
    if (!rule.conclusion || !rule.condition) {
      return { valid: false };
    }

    const goalVec = this.session.executor.buildStatementVector(goal);
    this.session.reasoningStats.similarityChecks++;
    const conclusionSim = similarity(goalVec, rule.conclusion);

    if (conclusionSim > 0.7) {
      // Conclusion matches - prove the condition
      const conditionResult = this.proveCondition(rule, depth + 1);

      if (conditionResult.valid) {
        this.logStep('rule_match', rule.name || rule.source);
        return {
          valid: true,
          method: 'backward_chain',
          rule: rule.name,
          confidence: Math.min(conclusionSim, conditionResult.confidence) * 0.95,
          goal: goal.toString(),
          steps: [
            { operation: 'rule_match', rule: rule.name || rule.source },
            ...conditionResult.steps
          ]
        };
      }
    }

    return { valid: false };
  }

  /**
   * Prove a rule's condition (handles And/Or)
   */
  proveCondition(rule, depth) {
    if (Date.now() - this.startTime > this.options.timeout) {
      throw new Error('Proof timed out');
    }

    this.reasoningSteps++;
    if (this.reasoningSteps > MAX_REASONING_STEPS) {
      return { valid: false, reason: 'Step limit' };
    }

    if (depth > this.options.maxDepth) {
      return { valid: false, reason: 'Depth limit' };
    }

    // If rule has compound conditions (And/Or), use them
    if (rule.conditionParts) {
      return this.proveCompoundCondition(rule.conditionParts, depth);
    }

    // Simple condition - try direct match
    return this.proveSimpleCondition(rule.condition, depth);
  }

  /**
   * Prove simple condition vector
   */
  proveSimpleCondition(conditionVec, depth) {
    if (!conditionVec?.data) {
      return { valid: false, reason: 'Invalid condition' };
    }

    const condHash = this.hashVector(conditionVec);
    if (this.visited.has(condHash)) {
      return { valid: false, reason: 'Cycle' };
    }
    this.visited.add(condHash);

    // Try direct KB match
    for (const fact of this.session.kbFacts) {
      if (!fact.vector) continue;
      const sim = similarity(conditionVec, fact.vector);
      if (sim > 0.7) {
        return {
          valid: true,
          method: 'direct',
          confidence: sim,
          steps: [{ operation: 'condition_satisfied', confidence: sim }]
        };
      }
    }

    // Try to derive via another rule
    for (const rule of this.session.rules) {
      if (!rule.conclusion) continue;
      const conclusionSim = similarity(conditionVec, rule.conclusion);
      if (conclusionSim > 0.7) {
        const subResult = this.proveCondition(rule, depth + 1);
        if (subResult.valid) {
          return {
            valid: true,
            method: 'chained_rule',
            confidence: Math.min(conclusionSim, subResult.confidence) * 0.95,
            steps: [
              { operation: 'chain_via_rule', rule: rule.name || rule.source },
              ...subResult.steps
            ]
          };
        }
      }
    }

    return { valid: false, reason: 'Cannot prove condition' };
  }

  /**
   * Prove compound condition (And/Or) - recursive
   */
  proveCompoundCondition(conditionParts, depth) {
    const { type, parts } = conditionParts;

    if (type === 'And') {
      return this.proveAndCondition(parts, depth);
    } else if (type === 'Or') {
      return this.proveOrCondition(parts, depth);
    } else if (type === 'leaf') {
      return this.proveSimpleCondition(conditionParts.vector, depth);
    }

    return { valid: false, reason: 'Unknown condition type' };
  }

  /**
   * Prove AND condition - all parts must be true
   */
  proveAndCondition(parts, depth) {
    const allSteps = [];
    let minConfidence = 1.0;

    this.logStep('proving_and', `${parts.length} conditions`);

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const result = this.provePart(part, depth);

      if (!result.valid) {
        this.logStep('and_failed', `condition ${i + 1}`);
        return { valid: false, reason: `And condition ${i + 1} failed` };
      }

      allSteps.push(...(result.steps || []));
      if (result.confidence < minConfidence) {
        minConfidence = result.confidence;
      }
    }

    this.logStep('and_success', `${parts.length} conditions`);
    return {
      valid: true,
      method: 'and_condition',
      confidence: minConfidence * 0.95,
      steps: [{ operation: 'proving_and_condition', parts: parts.length }, ...allSteps]
    };
  }

  /**
   * Prove OR condition - at least one part must be true
   */
  proveOrCondition(parts, depth) {
    this.logStep('proving_or', `${parts.length} conditions`);

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const result = this.provePart(part, depth);

      if (result.valid) {
        this.logStep('or_success', `condition ${i + 1}`);
        return {
          valid: true,
          method: 'or_condition',
          confidence: result.confidence * 0.95,
          steps: [{ operation: 'proving_or_condition' }, ...(result.steps || [])]
        };
      }
    }

    this.logStep('or_failed', `${parts.length} conditions`);
    return { valid: false, reason: 'No Or branch succeeded' };
  }

  /**
   * Prove a single part - can be nested or leaf
   */
  provePart(part, depth) {
    // Nested compound (And/Or)
    if (part.type === 'And' || part.type === 'Or') {
      return this.proveCompoundCondition(part, depth);
    }
    // Leaf node
    if (part.type === 'leaf' && part.vector) {
      return this.proveSimpleCondition(part.vector, depth);
    }
    // Raw vector (legacy)
    if (part.data) {
      return this.proveSimpleCondition(part, depth);
    }
    return { valid: false, reason: 'Invalid part structure' };
  }

  /**
   * Try disjoint proof for spatial relations
   */
  tryDisjointProof(goal, depth) {
    const operatorName = this.extractOperatorName(goal);
    if (operatorName !== 'locatedIn') {
      return { valid: false };
    }

    if (!goal.args || goal.args.length !== 2) {
      return { valid: false };
    }

    const subjectName = this.extractArgName(goal.args[0]);
    const targetName = this.extractArgName(goal.args[1]);
    if (!subjectName || !targetName) {
      return { valid: false };
    }

    // Find containment chain
    const containers = this.findContainmentChain(subjectName);

    for (let i = 0; i < containers.length; i++) {
      const container = containers[i];
      if (this.checkDisjoint(container, targetName)) {
        return {
          valid: true,
          result: false,
          method: 'disjoint_proof',
          confidence: 0.95,
          steps: [
            { operation: 'disjoint_check', container, target: targetName }
          ]
        };
      }
    }

    return { valid: false };
  }

  /**
   * Find containment chain
   */
  findContainmentChain(subjectName) {
    const chain = [];
    const visited = new Set();

    const findChain = (name) => {
      if (visited.has(name)) return;
      visited.add(name);
      const containers = this.findIntermediates('locatedIn', name);
      for (const container of containers) {
        chain.push(container);
        findChain(container);
      }
    };

    findChain(subjectName);
    return chain;
  }

  /**
   * Check if two entities are disjoint
   */
  checkDisjoint(a, b) {
    if (a === b) return false;

    const typesA = this.findTypes(a);
    const typesB = this.findTypes(b);

    for (const typeA of typesA) {
      for (const typeB of typesB) {
        if (typeA === typeB && this.isMutuallyDisjoint(typeA)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Find types of an entity
   */
  findTypes(entity) {
    const types = [];
    for (const fact of this.session.kbFacts) {
      if (fact.metadata?.operator === 'isA' && fact.metadata.args?.[0] === entity) {
        types.push(fact.metadata.args[1]);
      }
    }
    return types;
  }

  /**
   * Check if type is mutually disjoint
   */
  isMutuallyDisjoint(typeName) {
    for (const fact of this.session.kbFacts) {
      if (fact.metadata?.operator === 'mutuallyDisjoint' && fact.metadata.args?.[0] === typeName) {
        return true;
      }
    }
    return false;
  }

  // Helper methods

  /**
   * Convert goal statement to DSL fact string (e.g., "isA Rex Dog")
   */
  goalToFact(goal) {
    const op = this.extractOperatorName(goal);
    if (!op) return '';
    const args = (goal.args || []).map(a => this.extractArgName(a) || '').filter(Boolean);
    return `${op} ${args.join(' ')}`.trim();
  }

  extractOperatorName(stmt) {
    if (!stmt?.operator) return null;
    return stmt.operator.name || stmt.operator.value || null;
  }

  extractArgName(arg) {
    if (!arg) return null;
    if (arg.type === 'Identifier') return arg.name;
    if (arg.type === 'Reference') return arg.name;
    return arg.name || arg.value || null;
  }

  hashVector(vec) {
    if (!vec?.data) return 'invalid:' + Math.random().toString(36);
    const parts = [];
    for (let i = 0; i < Math.min(4, vec.words || 0); i++) {
      parts.push(vec.data[i]?.toString(16) || '0');
    }
    return parts.join(':');
  }

  logStep(operation, detail) {
    this.steps.push({
      operation,
      detail,
      timestamp: Date.now() - this.startTime
    });
  }
}

export default ProofEngine;
