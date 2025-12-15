/**
 * AGISystem2 - Session
 * @module runtime/session
 *
 * Main entry point for the reasoning system.
 * Coordinates learn, query, prove, and decode capabilities.
 */

import { Vector } from '../core/vector.mjs';
import { bind, bundle, similarity, topKSimilar, bindAll } from '../core/operations.mjs';
import { withPosition, removePosition } from '../core/position.mjs';
import { DEFAULT_GEOMETRY } from '../core/constants.mjs';
import { parse } from '../parser/parser.mjs';
import { Scope } from './scope.mjs';
import { Vocabulary } from './vocabulary.mjs';
import { Executor } from './executor.mjs';
import { QueryEngine } from '../reasoning/query.mjs';
import { ProofEngine } from '../reasoning/prove.mjs';
import { textGenerator } from '../output/text-generator.mjs';

// Debug logging
const DEBUG = process.env.SYS2_DEBUG === 'true';
function dbg(category, ...args) {
  if (DEBUG) console.log(`[Session:${category}]`, ...args);
}

// Mutually exclusive property/state pairs for contradiction detection
const MUTUALLY_EXCLUSIVE = {
  hasState: [['Open', 'Closed'], ['Alive', 'Dead'], ['On', 'Off'], ['Full', 'Empty']],
  hasProperty: [['Hot', 'Cold'], ['Wet', 'Dry']],
  before: [['after']],
  after: [['before']]
};

export class Session {
  constructor(options = {}) {
    this.geometry = options.geometry || DEFAULT_GEOMETRY;
    this.scope = new Scope();
    this.vocabulary = new Vocabulary(this.geometry);
    this.executor = new Executor(this);
    this.queryEngine = new QueryEngine(this);
    this.rules = [];
    this.kb = null;
    this.kbFacts = [];
    this.theories = new Map();
    this.operators = new Map();
    this.warnings = [];

    // Reasoning statistics
    this.reasoningStats = {
      queries: 0,
      proofs: 0,
      kbScans: 0,
      similarityChecks: 0,
      ruleAttempts: 0,
      transitiveSteps: 0,
      maxProofDepth: 0,
      totalProofSteps: 0,
      proofLengths: [],
      methods: {},
      operations: {}
    };

    this.initOperators();
  }

  /**
   * Initialize reserved operator vectors
   */
  initOperators() {
    const reserved = ['Implies', 'And', 'Or', 'Not', 'ForAll', 'Exists'];
    for (const op of reserved) {
      this.operators.set(op, this.vocabulary.getOrCreate(op));
    }
  }

  /**
   * Learn DSL statements
   * @param {string} dsl - DSL source code
   * @returns {Object} Learning result
   */
  learn(dsl) {
    this.warnings = [];

    try {
      const ast = parse(dsl);
      const result = this.executor.executeProgram(ast);

      // Track rules (Implies statements)
      this.trackRules(ast);

      return {
        success: result.success,
        facts: result.results.length,
        errors: result.errors.map(e => e.message),
        warnings: this.warnings.slice()
      };
    } catch (e) {
      return {
        success: false,
        facts: 0,
        errors: [e.message],
        warnings: this.warnings.slice()
      };
    }
  }

  /**
   * Track Implies rules from AST
   */
  trackRules(ast) {
    const stmtMap = new Map();
    for (const stmt of ast.statements) {
      if (stmt.destination) {
        stmtMap.set(stmt.destination, stmt);
      }
    }

    for (const stmt of ast.statements) {
      const operatorName = this.extractOperatorName(stmt);
      if (operatorName === 'Implies' && stmt.args.length >= 2) {
        const condVec = this.executor.resolveExpression(stmt.args[0]);
        const concVec = this.executor.resolveExpression(stmt.args[1]);
        const conditionParts = this.extractCompoundCondition(stmt.args[0], stmtMap);

        this.rules.push({
          name: stmt.destination,
          vector: this.executor.buildStatementVector(stmt),
          source: stmt.toString(),
          condition: condVec,
          conclusion: concVec,
          conditionParts
        });
      }
    }
  }

  /**
   * Extract operator name from statement
   */
  extractOperatorName(stmt) {
    if (!stmt?.operator) return null;
    return stmt.operator.name || stmt.operator.value || null;
  }

  /**
   * Recursively extract compound condition (And/Or)
   */
  extractCompoundCondition(expr, stmtMap) {
    if (expr.type === 'Reference') {
      const stmt = stmtMap.get(expr.name);
      if (stmt) {
        const op = this.extractOperatorName(stmt);
        if (op === 'And' || op === 'Or') {
          const parts = stmt.args.map(arg => {
            const nested = this.extractCompoundCondition(arg, stmtMap);
            if (nested) return nested;
            return { type: 'leaf', vector: this.executor.resolveExpression(arg) };
          });
          return { type: op, parts };
        }
      }
    }
    return null;
  }

  /**
   * Add vector to knowledge base
   */
  addToKB(vector, name = null, metadata = null) {
    const contradiction = this.checkContradiction(metadata);
    if (contradiction) {
      this.warnings.push(contradiction);
    }

    this.kbFacts.push({ vector, name, metadata });
    if (this.kb === null) {
      this.kb = vector.clone();
    } else {
      this.kb = bundle([this.kb, vector]);
    }
  }

  /**
   * Check for contradictions
   */
  checkContradiction(metadata) {
    if (!metadata?.operator || !metadata?.args) return null;
    const { operator, args } = metadata;

    // Check Not(P) when P exists
    if (operator === 'Not' && args.length >= 1) {
      const refVec = this.scope.get(args[0]);
      if (refVec) {
        for (const fact of this.kbFacts) {
          if (fact.vector && similarity(fact.vector, refVec) > 0.9) {
            return 'Warning: direct contradiction detected';
          }
        }
      }
    }

    // Check temporal contradictions
    if ((operator === 'before' || operator === 'after') && args.length >= 2) {
      const oppositeOp = operator === 'before' ? 'after' : 'before';
      for (const fact of this.kbFacts) {
        if (fact.metadata?.operator === oppositeOp &&
            fact.metadata.args[0] === args[0] &&
            fact.metadata.args[1] === args[1]) {
          return 'Warning: temporal contradiction';
        }
      }
    }

    // Check mutually exclusive pairs
    const exclusions = MUTUALLY_EXCLUSIVE[operator];
    if (!exclusions || args.length < 2) return null;

    const subject = args[0];
    const value = args[1];

    let exclusiveValue = null;
    for (const pair of exclusions) {
      if (pair[0] === value) { exclusiveValue = pair[1]; break; }
      if (pair[1] === value) { exclusiveValue = pair[0]; break; }
    }

    if (!exclusiveValue) return null;

    for (const fact of this.kbFacts) {
      if (fact.metadata?.operator === operator &&
          fact.metadata.args[0] === subject &&
          fact.metadata.args[1] === exclusiveValue) {
        return `Warning: contradiction - ${subject} is both ${value} and ${exclusiveValue}`;
      }
    }

    return null;
  }

  /**
   * Execute query
   * @param {string} dsl - Query DSL
   * @returns {Object} Query result
   */
  query(dsl) {
    dbg('QUERY', 'Starting:', dsl?.substring(0, 60));
    try {
      const ast = parse(dsl);
      if (ast.statements.length === 0) {
        return { success: false, reason: 'Empty query' };
      }

      const result = this.queryEngine.execute(ast.statements[0]);
      this.reasoningStats.queries++;
      if (result.success) {
        this.trackMethod('query_match');
        this.trackOperation('query_search');
      }

      return result;
    } catch (e) {
      return { success: false, reason: e.message };
    }
  }

  /**
   * Prove a goal
   * @param {string} dsl - Goal DSL
   * @param {Object} options - Options
   * @returns {Object} Proof result
   */
  prove(dsl, options = {}) {
    dbg('PROVE', 'Starting:', dsl?.substring(0, 60));
    try {
      const ast = parse(dsl);
      if (ast.statements.length === 0) {
        return { valid: false, reason: 'Empty goal' };
      }

      const engine = new ProofEngine(this, { timeout: options.timeout || 2000 });
      const result = engine.prove(ast.statements[0]);

      // Track statistics
      this.reasoningStats.proofs++;
      const proofLength = result.steps?.length || (result.valid ? 1 : 0);
      this.reasoningStats.proofLengths.push(proofLength);
      this.reasoningStats.totalProofSteps += proofLength;
      if (proofLength > this.reasoningStats.maxProofDepth) {
        this.reasoningStats.maxProofDepth = proofLength;
      }
      if (result.valid && result.method) {
        this.trackMethod(result.method);
      }

      return result;
    } catch (e) {
      return { valid: false, reason: e.message };
    }
  }

  /**
   * Generate natural language text
   */
  generateText(operator, args) {
    return textGenerator.generate(operator, args);
  }

  /**
   * Elaborate proof result
   */
  elaborate(proof) {
    return textGenerator.elaborate(proof);
  }

  /**
   * Decode vector to structure
   */
  decode(vector) {
    const operatorCandidates = [];

    for (const [name, opVec] of this.operators) {
      const sim = similarity(vector, opVec);
      if (sim > 0.4) operatorCandidates.push({ name, similarity: sim });
    }

    for (const [name, atomVec] of this.vocabulary.entries()) {
      if (!this.operators.has(name)) {
        const sim = similarity(vector, atomVec);
        if (sim > 0.5) operatorCandidates.push({ name, similarity: sim });
      }
    }

    if (operatorCandidates.length === 0) {
      return { success: false, reason: 'No operator found' };
    }

    operatorCandidates.sort((a, b) => b.similarity - a.similarity);
    const operator = operatorCandidates[0];
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
          alternatives: matches.slice(1).map(m => ({ value: m.name, confidence: m.similarity }))
        });
      }
    }

    return args;
  }

  /**
   * Summarize vector as natural language
   */
  summarize(vector) {
    const decoded = this.decode(vector);
    if (!decoded.success) {
      return { success: false, text: 'Unable to decode' };
    }

    const { operator, arguments: args } = decoded.structure;
    const text = this.generateText(operator, args);

    return { success: true, text, structure: decoded.structure };
  }

  // Statistics tracking

  trackMethod(method) {
    this.reasoningStats.methods[method] = (this.reasoningStats.methods[method] || 0) + 1;
  }

  trackOperation(operation) {
    this.reasoningStats.operations[operation] = (this.reasoningStats.operations[operation] || 0) + 1;
  }

  getReasoningStats(reset = false) {
    const stats = { ...this.reasoningStats };
    stats.avgProofLength = stats.proofLengths.length > 0
      ? (stats.totalProofSteps / stats.proofLengths.length).toFixed(1)
      : 0;
    delete stats.proofLengths;

    if (reset) {
      this.reasoningStats = {
        queries: 0, proofs: 0, kbScans: 0, similarityChecks: 0,
        ruleAttempts: 0, transitiveSteps: 0, maxProofDepth: 0,
        totalProofSteps: 0, proofLengths: [], methods: {}, operations: {}
      };
    }
    return stats;
  }

  // Utility methods

  getAllRules() {
    return this.rules;
  }

  similarity(a, b) {
    return similarity(a, b);
  }

  resolve(expr) {
    if (typeof expr === 'string') {
      return this.vocabulary.getOrCreate(expr);
    }
    return this.executor.resolveExpression(expr);
  }

  dump() {
    return {
      geometry: this.geometry,
      factCount: this.kbFacts.length,
      ruleCount: this.rules.length,
      vocabularySize: this.vocabulary.size,
      scopeBindings: this.scope.localNames()
    };
  }

  close() {
    this.kb = null;
    this.kbFacts = [];
    this.rules = [];
    this.scope.clear();
  }
}

export default Session;
