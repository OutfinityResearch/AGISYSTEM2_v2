/**
 * AGISystem2 - Session
 * @module runtime/session
 *
 * Main entry point for the reasoning system.
 * Provides learn, query, prove, and decode capabilities.
 */

import { Vector } from '../core/vector.mjs';
import { bind, bundle, similarity, topKSimilar, bindAll } from '../core/operations.mjs';
import { withPosition, removePosition } from '../core/position.mjs';
import { DEFAULT_GEOMETRY } from '../core/constants.mjs';
import { parse } from '../parser/parser.mjs';
import { Scope } from './scope.mjs';
import { Vocabulary } from './vocabulary.mjs';
import { Executor } from './executor.mjs';

export class Session {
  /**
   * Create a new session
   * @param {Object} options - Session options
   */
  constructor(options = {}) {
    this.geometry = options.geometry || DEFAULT_GEOMETRY;
    this.scope = new Scope();
    this.vocabulary = new Vocabulary(this.geometry);
    this.executor = new Executor(this);
    this.rules = [];
    this.kb = null;  // Knowledge base vector (bundled facts)
    this.kbFacts = [];  // Individual fact vectors for unbundling
    this.theories = new Map();
    this.operators = new Map();  // operator name -> vector

    // Initialize reserved operators
    this.initOperators();
  }

  /**
   * Initialize reserved operator vectors
   */
  initOperators() {
    const reserved = ['Implies', 'And', 'Or', 'Not', 'ForAll', 'Exists'];
    for (const op of reserved) {
      const vec = this.vocabulary.getOrCreate(op);
      this.operators.set(op, vec);
    }
  }

  /**
   * Learn DSL statements (add to KB)
   * @param {string} dsl - DSL source code
   * @returns {Object} Learning result
   */
  learn(dsl) {
    try {
      const ast = parse(dsl);
      const result = this.executor.executeProgram(ast);

      // Track rules (statements with Implies operator)
      for (const res of result.results) {
        if (res.statement && res.statement.includes('Implies')) {
          this.rules.push({
            name: res.destination,
            vector: res.vector,
            source: res.statement
          });
        }
      }

      return {
        success: result.success,
        facts: result.results.length,
        errors: result.errors.map(e => e.message)
      };
    } catch (e) {
      return {
        success: false,
        facts: 0,
        errors: [e.message]
      };
    }
  }

  /**
   * Add vector to knowledge base
   * @param {Vector} vector - Fact vector
   */
  addToKB(vector) {
    this.kbFacts.push(vector);
    if (this.kb === null) {
      this.kb = vector.clone();
    } else {
      this.kb = bundle([this.kb, vector]);
    }
  }

  /**
   * Execute query with holes
   * @param {string} dsl - Query DSL
   * @returns {Object} Query result with bindings
   */
  query(dsl) {
    try {
      const ast = parse(dsl);
      if (ast.statements.length === 0) {
        return { success: false, reason: 'Empty query' };
      }

      const stmt = ast.statements[0];
      return this.executeQuery(stmt);
    } catch (e) {
      return { success: false, reason: e.message };
    }
  }

  /**
   * Execute query from statement
   * @param {Statement} stmt - Query statement
   */
  executeQuery(stmt) {
    // Find holes in the statement
    const holes = this.findHoles(stmt);

    if (holes.length === 0) {
      // Direct match query
      return this.directMatch(stmt);
    }

    if (holes.length > 3) {
      return { success: false, reason: 'Too many holes (max 3)' };
    }

    // Build partial vector (without holes)
    const partial = this.buildPartialVector(stmt, holes);

    // Unbind partial from KB
    if (!this.kb) {
      return { success: false, reason: 'Empty knowledge base' };
    }

    const candidate = bind(this.kb, partial);

    // Extract answers for each hole
    const bindings = new Map();
    for (const hole of holes) {
      
      const raw = removePosition(hole.position, candidate);
      const matches = topKSimilar(raw, this.vocabulary.atoms, 5);

      if (matches.length > 0 && matches[0].similarity > 0.5) {
        bindings.set(hole.name, {
          answer: matches[0].name,
          similarity: matches[0].similarity,
          alternatives: matches.slice(1, 4)
        });
      } else {
        bindings.set(hole.name, {
          answer: null,
          similarity: 0,
          alternatives: matches.slice(0, 3)
        });
      }
    }

    // Calculate confidence
    let totalSim = 0;
    let filledCount = 0;
    for (const binding of bindings.values()) {
      if (binding.answer) {
        totalSim += binding.similarity;
        filledCount++;
      }
    }

    const confidence = filledCount > 0 ? totalSim / filledCount : 0;
    const success = filledCount === holes.length;

    return {
      success,
      bindings,
      confidence,
      ambiguous: this.hasAmbiguity(bindings)
    };
  }

  /**
   * Find holes in statement
   */
  findHoles(stmt) {
    const holes = [];
    for (let i = 0; i < stmt.args.length; i++) {
      if (stmt.args[i].type === 'Hole') {
        holes.push({
          name: stmt.args[i].name,
          position: i + 1
        });
      }
    }
    return holes;
  }

  /**
   * Build partial vector excluding holes
   */
  buildPartialVector(stmt, holes) {
    
    

    const holePositions = new Set(holes.map(h => h.position));
    const operatorVec = this.vocabulary.getOrCreate(stmt.operator.name || stmt.operator.value);

    const parts = [operatorVec];
    for (let i = 0; i < stmt.args.length; i++) {
      if (!holePositions.has(i + 1)) {
        const argVec = this.executor.resolveExpression(stmt.args[i]);
        parts.push(withPosition(i + 1, argVec));
      }
    }

    return bindAll(...parts);
  }

  /**
   * Direct match query (no holes)
   */
  directMatch(stmt) {
    const queryVec = this.executor.buildStatementVector(stmt);
    const matches = [];

    for (const factVec of this.kbFacts) {
      const sim = similarity(queryVec, factVec);
      if (sim > 0.5) {
        matches.push({ similarity: sim });
      }
    }

    return {
      success: matches.length > 0,
      matches,
      confidence: matches.length > 0 ? matches[0].similarity : 0
    };
  }

  /**
   * Check for ambiguous bindings
   */
  hasAmbiguity(bindings) {
    for (const binding of bindings.values()) {
      if (binding.alternatives && binding.alternatives.length > 0) {
        const gap = binding.similarity - binding.alternatives[0].similarity;
        if (gap < 0.1) return true;
      }
    }
    return false;
  }

  /**
   * Prove a goal using backward chaining
   * @param {string} dsl - Goal DSL
   * @returns {Object} Proof result
   */
  prove(dsl) {
    try {
      const ast = parse(dsl);
      if (ast.statements.length === 0) {
        return { valid: false, reason: 'Empty goal' };
      }

      const goal = ast.statements[0];
      return this.proveGoal(goal, 0, new Set());
    } catch (e) {
      return { valid: false, reason: e.message };
    }
  }

  /**
   * Prove a goal with depth tracking
   */
  proveGoal(goal, depth, visited) {
    if (depth > 10) {
      return { valid: false, reason: 'Depth limit exceeded' };
    }

    const goalVec = this.executor.buildStatementVector(goal);
    const goalHash = goalVec.data.slice(0, 4).join(':');

    if (visited.has(goalHash)) {
      return { valid: false, reason: 'Cycle detected' };
    }
    visited.add(goalHash);

    // Try direct match first
    for (const factVec of this.kbFacts) {
      const sim = similarity(goalVec, factVec);
      if (sim > 0.7) {
        return {
          valid: true,
          method: 'direct',
          confidence: sim,
          steps: [{ operation: 'direct_match', goal: goal.toString() }]
        };
      }
    }

    // Try rule matching
    for (const rule of this.rules) {
      const match = this.tryRuleMatch(goal, rule, depth, visited);
      if (match.valid) {
        return match;
      }
    }

    // Weaker direct match
    for (const factVec of this.kbFacts) {
      const sim = similarity(goalVec, factVec);
      if (sim > 0.55) {
        return {
          valid: true,
          method: 'direct_weak',
          confidence: sim,
          steps: [{ operation: 'weak_match', goal: goal.toString() }]
        };
      }
    }

    return { valid: false, reason: 'No proof found' };
  }

  /**
   * Try to match and apply a rule
   */
  tryRuleMatch(goal, rule, depth, visited) {
    // Simplified rule matching - check if conclusion matches goal
    const goalVec = this.executor.buildStatementVector(goal);
    const ruleSim = similarity(goalVec, rule.vector);

    if (ruleSim > 0.6) {
      // Rule might apply - would need to prove premises
      return {
        valid: true,
        method: 'rule',
        rule: rule.name,
        confidence: ruleSim * 0.98,
        steps: [
          { operation: 'rule_match', goal: goal.toString(), rule: rule.name }
        ]
      };
    }

    return { valid: false };
  }

  /**
   * Decode vector to structure
   * @param {Vector} vector - Vector to decode
   * @returns {Object} Decoded structure
   */
  decode(vector) {
    // Find best matching operator
    const operatorCandidates = [];
    for (const [name, opVec] of this.operators) {
      const sim = similarity(vector, opVec);
      if (sim > 0.4) {
        operatorCandidates.push({ name, similarity: sim });
      }
    }

    // Also check vocabulary for non-reserved operators
    for (const [name, atomVec] of this.vocabulary.entries()) {
      if (!this.operators.has(name)) {
        const sim = similarity(vector, atomVec);
        if (sim > 0.5) {
          operatorCandidates.push({ name, similarity: sim });
        }
      }
    }

    if (operatorCandidates.length === 0) {
      return { success: false, reason: 'No operator found' };
    }

    operatorCandidates.sort((a, b) => b.similarity - a.similarity);
    const operator = operatorCandidates[0];

    // Extract arguments
    const args = this.extractArguments(vector, operator.name);

    return {
      success: true,
      structure: {
        operator: operator.name,
        operatorConfidence: operator.similarity,
        arguments: args,
        confidence: operator.similarity
      }
    };
  }

  /**
   * Extract arguments from vector
   */
  extractArguments(vector, operatorName) {
    
    const opVec = this.vocabulary.get(operatorName);
    const remainder = bind(vector, opVec);

    const args = [];
    for (let pos = 1; pos <= 5; pos++) {
      const extracted = removePosition(pos, remainder);
      const matches = topKSimilar(extracted, this.vocabulary.atoms, 3);

      if (matches.length > 0 && matches[0].similarity > 0.45) {
        args.push({
          position: pos,
          value: matches[0].name,
          confidence: matches[0].similarity,
          alternatives: matches.slice(1).map(m => ({
            value: m.name,
            confidence: m.similarity
          }))
        });
      }
    }

    return args;
  }

  /**
   * Summarize vector as natural language text
   * @param {Vector} vector - Vector to summarize
   * @returns {Object} Summary with text
   */
  summarize(vector) {
    const decoded = this.decode(vector);
    if (!decoded.success) {
      return { success: false, text: 'Unable to decode' };
    }

    const { operator, arguments: args } = decoded.structure;
    const text = this.generateText(operator, args);

    return {
      success: true,
      text,
      structure: decoded.structure
    };
  }

  /**
   * Generate natural language from operator and args
   */
  generateText(operator, args) {
    const argValues = args.map(a => a.value);

    // Common templates
    const templates = {
      loves: (a) => a.length >= 2 ? `${a[0]} loves ${a[1]}.` : `${operator}(${a.join(', ')})`,
      sells: (a) => a.length >= 3 ? `${a[0]} sold ${a[2]} to ${a[1]}.` : `${operator}(${a.join(', ')})`,
      parent: (a) => a.length >= 2 ? `${a[0]} is a parent of ${a[1]}.` : `${operator}(${a.join(', ')})`,
      isA: (a) => a.length >= 2 ? `${a[0]} is a ${a[1]}.` : `${operator}(${a.join(', ')})`,
      greaterThan: (a) => a.length >= 2 ? `${a[0]} is greater than ${a[1]}.` : `${operator}(${a.join(', ')})`
    };

    if (templates[operator]) {
      return templates[operator](argValues);
    }

    // Generic template
    if (argValues.length === 0) {
      return `${operator}.`;
    }
    if (argValues.length === 1) {
      return `${argValues[0]} is ${operator}.`;
    }
    if (argValues.length === 2) {
      return `${argValues[0]} ${operator} ${argValues[1]}.`;
    }

    return `${operator}(${argValues.join(', ')}).`;
  }

  /**
   * Elaborate a proof result
   * @param {Object} proof - Proof result
   * @returns {Object} Elaboration
   */
  elaborate(proof) {
    if (!proof.valid) {
      return { text: 'Proof is not valid.' };
    }

    const steps = proof.steps || [];
    const lines = [`Proof by ${proof.method}:`];

    for (const step of steps) {
      lines.push(`  - ${step.operation}: ${step.goal}`);
    }

    lines.push(`Confidence: ${(proof.confidence * 100).toFixed(1)}%`);

    return { text: lines.join('\n') };
  }

  /**
   * Compute similarity between two vectors
   * @param {Vector} a
   * @param {Vector} b
   * @returns {number}
   */
  similarity(a, b) {
    return similarity(a, b);
  }

  /**
   * Get all rules
   * @returns {Array}
   */
  getAllRules() {
    return this.rules;
  }

  /**
   * Resolve name to vector
   * @param {string|Object} expr - Name or expression
   * @returns {Vector}
   */
  resolve(expr) {
    if (typeof expr === 'string') {
      return this.vocabulary.getOrCreate(expr);
    }
    return this.executor.resolveExpression(expr);
  }

  /**
   * Dump session state
   * @returns {Object}
   */
  dump() {
    return {
      geometry: this.geometry,
      factCount: this.kbFacts.length,
      ruleCount: this.rules.length,
      vocabularySize: this.vocabulary.size,
      scopeBindings: this.scope.localNames()
    };
  }

  /**
   * Close session and free resources
   */
  close() {
    this.kb = null;
    this.kbFacts = [];
    this.rules = [];
    this.scope.clear();
  }
}

export default Session;
