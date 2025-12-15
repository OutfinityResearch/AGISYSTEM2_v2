/**
 * AGISystem2 - Proof Engine
 * @module reasoning/prove
 *
 * Multi-step proof construction via backward chaining.
 * Handles transitive reasoning, rule matching, And/Or conditions.
 * Supports variable unification for quantified rules.
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

// Debug logging
const DEBUG = process.env.SYS2_DEBUG === 'true';
function dbg(category, ...args) {
  if (DEBUG) console.log(`[Prove:${category}]`, ...args);
}

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
   * Supports variable unification for quantified rules
   */
  tryRuleMatch(goal, rule, depth) {
    if (!rule.conclusion || !rule.condition) {
      return { valid: false };
    }

    // First try: vector similarity match (for rules without variables)
    const goalVec = this.session.executor.buildStatementVector(goal);
    this.session.reasoningStats.similarityChecks++;
    const conclusionSim = similarity(goalVec, rule.conclusion);

    if (conclusionSim > 0.7 && !rule.hasVariables) {
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

    // Second try: variable unification for quantified rules
    if (rule.hasVariables && rule.conclusionAST) {
      const unifyResult = this.tryUnification(goal, rule, depth);
      if (unifyResult.valid) {
        return unifyResult;
      }
    }

    return { valid: false };
  }

  /**
   * Try to unify goal with rule conclusion and prove instantiated condition
   */
  tryUnification(goal, rule, depth) {
    dbg('UNIFY', 'Trying unification for rule:', rule.name);

    // Extract goal structure
    const goalOp = this.extractOperatorName(goal);
    const goalArgs = (goal.args || []).map(a => this.extractArgName(a)).filter(Boolean);

    if (!goalOp || goalArgs.length === 0) {
      return { valid: false };
    }

    // Extract conclusion structure
    const concAST = rule.conclusionAST;
    const concOp = this.extractOperatorFromAST(concAST);
    const concArgs = this.extractArgsFromAST(concAST);

    // Operators must match
    if (goalOp !== concOp) {
      return { valid: false };
    }

    // Args count must match
    if (goalArgs.length !== concArgs.length) {
      return { valid: false };
    }

    // Build bindings from unification
    const bindings = new Map();
    for (let i = 0; i < goalArgs.length; i++) {
      const goalArg = goalArgs[i];
      const concArg = concArgs[i];

      if (concArg.isVariable) {
        // Variable in conclusion - bind to goal arg
        if (bindings.has(concArg.name)) {
          // Check consistency
          if (bindings.get(concArg.name) !== goalArg) {
            return { valid: false }; // Inconsistent binding
          }
        } else {
          bindings.set(concArg.name, goalArg);
        }
      } else {
        // Constant in conclusion - must match exactly
        if (concArg.name !== goalArg) {
          return { valid: false };
        }
      }
    }

    dbg('UNIFY', 'Bindings:', [...bindings.entries()]);

    // Now prove the instantiated condition
    const condResult = this.proveInstantiatedCondition(rule, bindings, depth + 1);

    if (condResult.valid) {
      this.logStep('unification_match', rule.name || rule.source);
      return {
        valid: true,
        method: 'backward_chain_unified',
        rule: rule.name,
        bindings: Object.fromEntries(bindings),
        confidence: condResult.confidence * 0.95,
        goal: goal.toString(),
        steps: [
          { operation: 'unification_match', rule: rule.name || rule.source, bindings: Object.fromEntries(bindings) },
          ...condResult.steps
        ]
      };
    }

    return { valid: false };
  }

  /**
   * Prove condition with variable bindings applied
   * Supports And conditions with partial variable bindings
   */
  proveInstantiatedCondition(rule, bindings, depth) {
    if (depth > this.options.maxDepth) {
      return { valid: false, reason: 'Depth limit' };
    }

    const condAST = rule.conditionAST;
    if (!condAST) {
      return { valid: false, reason: 'No condition AST' };
    }

    // Check if condition is a compound (And/Or) referenced by name
    if (rule.conditionParts) {
      return this.proveInstantiatedCompound(rule.conditionParts, bindings, depth);
    }

    // Simple condition - build instantiated string
    const instantiated = this.instantiateAST(condAST, bindings);
    dbg('UNIFY', 'Instantiated condition:', instantiated);

    // Check if there are unbound variables - need pattern search
    if (instantiated.includes('?')) {
      return this.proveWithUnboundVars(instantiated, bindings, depth);
    }

    // Search KB for matching fact
    const matchResult = this.findMatchingFact(instantiated);

    if (matchResult.found) {
      return {
        valid: true,
        method: 'instantiated_match',
        confidence: matchResult.confidence,
        steps: [{ operation: 'condition_instantiated', fact: instantiated, confidence: matchResult.confidence }]
      };
    }

    // Try recursive proving if condition is another rule application
    const subGoal = this.parseInstantiatedGoal(instantiated);
    if (subGoal) {
      const subResult = this.proveGoal(subGoal, depth);
      if (subResult.valid) {
        return {
          valid: true,
          method: 'recursive_prove',
          confidence: subResult.confidence * 0.95,
          steps: [
            { operation: 'prove_instantiated', fact: instantiated },
            ...subResult.steps
          ]
        };
      }
    }

    return { valid: false, reason: 'Cannot prove instantiated condition' };
  }

  /**
   * Prove compound (And/Or) condition with bindings
   */
  proveInstantiatedCompound(condParts, bindings, depth) {
    if (condParts.type === 'And') {
      return this.proveInstantiatedAnd(condParts.parts, new Map(bindings), depth);
    } else if (condParts.type === 'Or') {
      return this.proveInstantiatedOr(condParts.parts, bindings, depth);
    } else if (condParts.type === 'leaf') {
      // Leaf node - prove simple condition
      const leafAST = condParts.ast || condParts;
      if (leafAST.operator) {
        const inst = this.instantiateAST(leafAST, bindings);
        return this.proveSingleCondition(inst, bindings, depth);
      }
    }
    return { valid: false, reason: 'Unknown compound type' };
  }

  /**
   * Prove And condition - all parts must be true
   * Propagates variable bindings between parts
   * Supports backtracking when bindings don't work
   */
  proveInstantiatedAnd(parts, bindings, depth) {
    return this.proveAndWithBacktracking(parts, 0, new Map(bindings), [], depth);
  }

  /**
   * Recursive And proving with backtracking
   */
  proveAndWithBacktracking(parts, partIndex, bindings, accumulatedSteps, depth) {
    // Base case: all parts proven
    if (partIndex >= parts.length) {
      return {
        valid: true,
        method: 'and_instantiated',
        confidence: 0.9,
        steps: accumulatedSteps
      };
    }

    const part = parts[partIndex];

    // Get all possible matches for this part
    const matches = this.findAllMatches(part, bindings, depth);

    if (matches.length === 0) {
      return { valid: false, reason: `And part ${partIndex} has no matches` };
    }

    // Try each match with backtracking
    for (const match of matches) {
      // Create new bindings with this match's additions
      const newBindings = new Map(bindings);
      if (match.newBindings) {
        for (const [k, v] of match.newBindings) {
          newBindings.set(k, v);
        }
      }

      // Try to prove remaining parts with these bindings
      const remainingResult = this.proveAndWithBacktracking(
        parts,
        partIndex + 1,
        newBindings,
        [...accumulatedSteps, ...(match.steps || [])],
        depth
      );

      if (remainingResult.valid) {
        return remainingResult;
      }
      // If failed, try next match (backtrack)
    }

    return { valid: false, reason: 'Backtracking exhausted' };
  }

  /**
   * Find all possible matches for a condition part
   */
  findAllMatches(part, bindings, depth) {
    const matches = [];

    // Nested And/Or
    if (part.type === 'And' || part.type === 'Or') {
      const result = this.proveInstantiatedCompound(part, bindings, depth);
      if (result.valid) {
        matches.push(result);
      }
      return matches;
    }

    // Leaf with AST
    if (part.type === 'leaf' && part.ast) {
      const condStr = this.instantiateAST(part.ast, bindings);
      return this.findAllFactMatches(condStr, bindings);
    }

    return matches;
  }

  /**
   * Find all KB facts matching a pattern (for backtracking)
   */
  findAllFactMatches(condStr, bindings) {
    const matches = [];
    const parts = condStr.split(/\s+/);

    if (parts.length < 2) {
      return matches;
    }

    const op = parts[0];
    const args = parts.slice(1);

    for (const fact of this.session.kbFacts) {
      this.session.reasoningStats.kbScans++;
      const meta = fact.metadata;
      if (!meta || meta.operator !== op) continue;
      if (!meta.args || meta.args.length !== args.length) continue;

      const newBindings = new Map();
      let matchOk = true;

      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const factArg = meta.args[i];

        if (arg.startsWith('?')) {
          const varName = arg.substring(1);
          if (bindings.has(varName)) {
            if (bindings.get(varName) !== factArg) {
              matchOk = false;
              break;
            }
          } else {
            newBindings.set(varName, factArg);
          }
        } else {
          if (arg !== factArg) {
            matchOk = false;
            break;
          }
        }
      }

      if (matchOk) {
        matches.push({
          valid: true,
          confidence: 0.9,
          newBindings,
          steps: [{ operation: 'pattern_match', fact: `${op} ${meta.args.join(' ')}`, bindings: Object.fromEntries(newBindings) }]
        });
      }
    }

    // Also try transitive reasoning if no direct matches found and no variables
    if (matches.length === 0 && !condStr.includes('?')) {
      const transResult = this.tryTransitiveForCondition(condStr);
      if (transResult.valid) {
        matches.push({
          valid: true,
          confidence: transResult.confidence,
          newBindings: new Map(),
          steps: transResult.steps
        });
      }
    }

    return matches;
  }

  /**
   * Try transitive reasoning for a condition string
   */
  tryTransitiveForCondition(condStr) {
    const parts = condStr.split(/\s+/);
    if (parts.length !== 3) return { valid: false };

    const [op, subject, target] = parts;
    if (!TRANSITIVE_RELATIONS.has(op)) return { valid: false };

    // Build a simple goal-like structure for transitive chain
    const simpleGoal = {
      operator: { name: op },
      args: [
        { type: 'Identifier', name: subject },
        { type: 'Identifier', name: target }
      ],
      toString: () => condStr
    };

    // Reset visited for this sub-proof
    const savedVisited = new Set(this.visited);
    const result = this.tryTransitiveChain(simpleGoal, 0);
    this.visited = savedVisited;

    return result;
  }

  /**
   * Prove Or condition - at least one part must be true
   */
  proveInstantiatedOr(parts, bindings, depth) {
    for (const part of parts) {
      const partResult = this.proveCompoundPart(part, new Map(bindings), depth);
      if (partResult.valid) {
        return {
          valid: true,
          method: 'or_instantiated',
          confidence: partResult.confidence * 0.95,
          steps: partResult.steps
        };
      }
    }
    return { valid: false, reason: 'No Or branch succeeded' };
  }

  /**
   * Prove a single part of a compound condition
   */
  proveCompoundPart(part, bindings, depth) {
    // Nested And/Or
    if (part.type === 'And' || part.type === 'Or') {
      return this.proveInstantiatedCompound(part, bindings, depth);
    }

    // Leaf with vector - extract AST if available
    if (part.type === 'leaf') {
      // Need to reconstruct from original statement map
      // For now, search KB with pattern matching
      if (part.ast) {
        const inst = this.instantiateAST(part.ast, bindings);
        return this.proveSingleCondition(inst, bindings, depth);
      }
    }

    return { valid: false, reason: 'Cannot prove part' };
  }

  /**
   * Prove single condition string, potentially with unbound variables
   */
  proveSingleCondition(condStr, bindings, depth) {
    dbg('PROVE_SINGLE', 'Condition:', condStr, 'Bindings:', [...bindings.entries()]);

    // If fully instantiated (no ?vars), search KB directly
    if (!condStr.includes('?')) {
      const match = this.findMatchingFact(condStr);
      if (match.found) {
        return {
          valid: true,
          confidence: match.confidence,
          steps: [{ operation: 'fact_matched', fact: condStr }]
        };
      }

      // Try transitive reasoning for supported relations
      const transResult = this.tryTransitiveForCondition(condStr);
      if (transResult.valid) {
        return {
          valid: true,
          confidence: transResult.confidence * 0.95,
          steps: [{ operation: 'transitive_proof', fact: condStr }, ...(transResult.steps || [])]
        };
      }

      return { valid: false };
    }

    // Has unbound variables - pattern search in KB
    return this.proveWithUnboundVars(condStr, bindings, depth);
  }

  /**
   * Prove condition with unbound variables by pattern matching in KB
   */
  proveWithUnboundVars(condStr, bindings, depth) {
    const parts = condStr.split(/\s+/);
    if (parts.length < 2) {
      return { valid: false };
    }

    const op = parts[0];
    const args = parts.slice(1);

    // Find matching facts in KB
    for (const fact of this.session.kbFacts) {
      this.session.reasoningStats.kbScans++;
      const meta = fact.metadata;
      if (!meta || meta.operator !== op) continue;
      if (!meta.args || meta.args.length !== args.length) continue;

      // Try to unify
      const newBindings = new Map();
      let matches = true;

      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const factArg = meta.args[i];

        if (arg.startsWith('?')) {
          // Variable - check if already bound
          const varName = arg.substring(1);
          if (bindings.has(varName)) {
            if (bindings.get(varName) !== factArg) {
              matches = false;
              break;
            }
          } else {
            // New binding
            newBindings.set(varName, factArg);
          }
        } else {
          // Constant - must match exactly
          if (arg !== factArg) {
            matches = false;
            break;
          }
        }
      }

      if (matches) {
        dbg('PROVE_UNBOUND', 'Found match:', `${op} ${meta.args.join(' ')}`, 'New bindings:', [...newBindings.entries()]);
        return {
          valid: true,
          confidence: 0.9,
          newBindings,
          steps: [{ operation: 'pattern_match', fact: `${op} ${meta.args.join(' ')}`, bindings: Object.fromEntries(newBindings) }]
        };
      }
    }

    return { valid: false, reason: 'No pattern match found' };
  }

  /**
   * Extract operator from AST node
   */
  extractOperatorFromAST(ast) {
    if (!ast) return null;
    if (ast.type === 'Statement' && ast.operator) {
      return ast.operator.name || ast.operator.value || null;
    }
    if (ast.operator) {
      return ast.operator.name || ast.operator.value || null;
    }
    return null;
  }

  /**
   * Extract args from AST with variable info
   */
  extractArgsFromAST(ast) {
    if (!ast) return [];
    const args = ast.args || [];
    return args.map(arg => {
      if (arg.type === 'Hole') {
        return { name: arg.name, isVariable: true };
      }
      if (arg.type === 'Identifier') {
        return { name: arg.name, isVariable: false };
      }
      return { name: arg.name || arg.value || '', isVariable: false };
    });
  }

  /**
   * Instantiate AST with bindings to produce fact string
   */
  instantiateAST(ast, bindings) {
    if (!ast) return '';

    const op = this.extractOperatorFromAST(ast);
    if (!op) return '';

    const args = (ast.args || []).map(arg => {
      if (arg.type === 'Hole') {
        return bindings.get(arg.name) || `?${arg.name}`;
      }
      return arg.name || arg.value || '';
    });

    return `${op} ${args.join(' ')}`.trim();
  }

  /**
   * Find matching fact in KB
   */
  findMatchingFact(factStr) {
    const parts = factStr.split(/\s+/);
    if (parts.length < 2) {
      return { found: false };
    }

    const op = parts[0];
    const args = parts.slice(1);

    for (const fact of this.session.kbFacts) {
      this.session.reasoningStats.kbScans++;
      const meta = fact.metadata;
      if (!meta) continue;

      if (meta.operator === op && meta.args) {
        // Check if args match
        if (meta.args.length === args.length) {
          let match = true;
          for (let i = 0; i < args.length; i++) {
            if (meta.args[i] !== args[i]) {
              match = false;
              break;
            }
          }
          if (match) {
            return { found: true, confidence: 0.95, fact };
          }
        }
      }
    }

    return { found: false };
  }

  /**
   * Parse instantiated string back to a goal-like structure
   */
  parseInstantiatedGoal(factStr) {
    const parts = factStr.split(/\s+/);
    if (parts.length < 2) return null;

    return {
      operator: { name: parts[0], value: parts[0] },
      args: parts.slice(1).map(name => ({ type: 'Identifier', name })),
      toString: () => factStr
    };
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

    // Build chain incrementally, stopping when we find a disjoint container
    const chainResult = this.findContainmentChainUntilDisjoint(subjectName, targetName);

    if (chainResult.found) {
      return {
        valid: true,
        result: false,
        method: 'disjoint_proof',
        confidence: 0.95,
        goal: goal.toString(),
        steps: [
          ...chainResult.steps,
          { operation: 'disjoint_check', container: chainResult.disjointContainer, target: targetName }
        ]
      };
    }

    return { valid: false };
  }

  /**
   * Build containment chain until we find a disjoint container
   */
  findContainmentChainUntilDisjoint(subjectName, targetName) {
    const steps = [];
    const visited = new Set();
    let found = false;
    let disjointContainer = null;

    const buildChain = (name) => {
      if (visited.has(name) || found) return;
      visited.add(name);

      // Check if current location is disjoint from target
      if (this.checkDisjoint(name, targetName)) {
        found = true;
        disjointContainer = name;
        return;
      }

      const containers = this.findIntermediates('locatedIn', name);
      for (const container of containers) {
        if (found) return;

        // Add a chain step for proof output
        steps.push({
          operation: 'chain_step',
          from: name,
          to: container,
          fact: `locatedIn ${name} ${container}`
        });

        buildChain(container);
      }
    };

    buildChain(subjectName);
    return { found, disjointContainer, steps };
  }

  /**
   * Find containment chain
   */
  findContainmentChain(subjectName) {
    const result = this.findContainmentChainWithSteps(subjectName);
    return result.chain;
  }

  /**
   * Find containment chain with step details for proof output
   */
  findContainmentChainWithSteps(subjectName) {
    const chain = [];
    const steps = [];
    const visited = new Set();

    const findChain = (name) => {
      if (visited.has(name)) return;
      visited.add(name);
      const containers = this.findIntermediates('locatedIn', name);
      for (const container of containers) {
        chain.push(container);
        // Add a chain step for proof output
        steps.push({
          operation: 'chain_step',
          from: name,
          to: container,
          fact: `locatedIn ${name} ${container}`
        });
        findChain(container);
      }
    };

    findChain(subjectName);
    return { chain, steps };
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
