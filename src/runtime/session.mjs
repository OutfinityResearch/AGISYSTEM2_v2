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
import { DEFAULT_GEOMETRY, MAX_REASONING_STEPS } from '../core/constants.mjs';
import { parse } from '../parser/parser.mjs';
import { Scope } from './scope.mjs';
import { Vocabulary } from './vocabulary.mjs';
import { Executor } from './executor.mjs';
import { QueryEngine } from '../reasoning/query.mjs';

// Debug logging
const DEBUG = process.env.SYS2_DEBUG === 'true';
function dbg(category, ...args) {
  if (DEBUG) console.log(`[Session:${category}]`, ...args);
}

// Mutually exclusive property/state pairs for contradiction detection
const MUTUALLY_EXCLUSIVE = {
  hasState: [
    ['Open', 'Closed'],
    ['Alive', 'Dead'],
    ['On', 'Off'],
    ['Full', 'Empty'],
  ],
  hasProperty: [
    ['Hot', 'Cold'],
    ['Wet', 'Dry'],
  ],
  before: [['after']],  // before(A,B) contradicts after(A,B)
  after: [['before']],  // after(A,B) contradicts before(A,B)
};

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
    this.queryEngine = new QueryEngine(this);
    this.rules = [];
    this.kb = null;  // Knowledge base vector (bundled facts)
    this.kbFacts = [];  // Individual fact vectors for unbundling
    this.theories = new Map();
    this.operators = new Map();  // operator name -> vector
    this.reasoningSteps = 0;  // Step counter to prevent infinite loops
    this.warnings = [];  // Track warnings for contradiction detection

    // Detailed reasoning statistics
    this.reasoningStats = {
      queries: 0,
      proofs: 0,
      kbScans: 0,           // Each KB fact iteration
      similarityChecks: 0,  // Each similarity() call
      ruleAttempts: 0,      // Each rule match attempt
      transitiveSteps: 0,   // Each transitive chain step
      maxProofDepth: 0,     // Deepest proof chain
      totalProofSteps: 0,   // Sum of all proof steps (for avg)
      proofLengths: [],     // Array of individual proof lengths
      methods: {},          // method name -> count
      operations: {}        // operation type -> count
    };

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
    // Clear warnings from previous learn calls
    this.warnings = [];

    try {
      const ast = parse(dsl);
      const result = this.executor.executeProgram(ast);

      // Track rules (statements with Implies operator)
      // Extract condition and conclusion vectors for backward chaining
      for (const stmt of ast.statements) {
        const operatorName = this.extractOperatorName(stmt);
        if (operatorName === 'Implies' && stmt.args.length >= 2) {
          // Get condition and conclusion vectors from the args
          // Args can be References ($name) or other expressions
          const condVec = this.executor.resolveExpression(stmt.args[0]);
          const concVec = this.executor.resolveExpression(stmt.args[1]);

          // Check if condition is a compound (And/Or)
          let conditionParts = null;
          const condArg = stmt.args[0];
          if (condArg.type === 'Reference') {
            // Look up what this reference points to in scope
            const refName = condArg.name;
            // Search earlier statements to find what this reference is
            for (const earlierStmt of ast.statements) {
              if (earlierStmt.destination === refName) {
                const earlyOp = this.extractOperatorName(earlierStmt);
                if (earlyOp === 'And' || earlyOp === 'Or') {
                  // This is a compound condition - extract parts
                  conditionParts = {
                    type: earlyOp,
                    parts: earlierStmt.args.map(arg => this.executor.resolveExpression(arg))
                  };
                }
                break;
              }
            }
          }

          this.rules.push({
            name: stmt.destination,
            vector: this.executor.buildStatementVector(stmt),
            source: stmt.toString(),
            condition: condVec,
            conclusion: concVec,
            conditionParts: conditionParts  // { type: 'And'/'Or', parts: [vec1, vec2] }
          });
        }
      }

      return {
        success: result.success,
        facts: result.results.length,
        errors: result.errors.map(e => e.message),
        warnings: this.warnings.slice()  // Return collected warnings
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
   * Extract operator name from statement
   */
  extractOperatorName(stmt) {
    if (!stmt || !stmt.operator) return null;
    if (stmt.operator.name) return stmt.operator.name;
    if (stmt.operator.value) return stmt.operator.value;
    return null;
  }

  /**
   * Add vector to knowledge base
   * @param {Vector} vector - Fact vector
   * @param {string} [name] - Optional persistent name for the fact
   * @param {Object} [metadata] - Optional structured metadata {operator, args}
   */
  addToKB(vector, name = null, metadata = null) {
    // Check for contradictions before adding
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
   * Check if new fact contradicts existing facts
   * @param {Object} metadata - {operator, args} of the new fact
   * @returns {string|null} Warning message if contradiction found
   */
  checkContradiction(metadata) {
    if (!metadata || !metadata.operator || !metadata.args) return null;

    const { operator, args } = metadata;

    // Check for Not(P) when P exists (direct contradiction)
    if (operator === 'Not' && args.length >= 1) {
      // The argument references a scope variable - check if that fact exists
      const refName = args[0];
      const refVec = this.scope.get(refName);
      if (refVec) {
        // Check if this fact already exists in KB
        for (const fact of this.kbFacts) {
          if (fact.vector && similarity(fact.vector, refVec) > 0.9) {
            return 'Warning: direct contradiction detected';
          }
        }
      }
    }

    // Check for temporal contradictions (before/after) - check first
    if ((operator === 'before' || operator === 'after') && args.length >= 2) {
      const oppositeOp = operator === 'before' ? 'after' : 'before';
      for (const fact of this.kbFacts) {
        if (!fact.metadata) continue;
        if (fact.metadata.operator === oppositeOp &&
            fact.metadata.args[0] === args[0] &&
            fact.metadata.args[1] === args[1]) {
          return 'Warning: temporal contradiction';
        }
      }
    }

    // Check for mutually exclusive pairs (hasState, hasProperty)
    const exclusions = MUTUALLY_EXCLUSIVE[operator];
    if (!exclusions || args.length < 2) return null;

    const subject = args[0];  // e.g., "Box"
    const value = args[1];    // e.g., "Open" or "Closed"

    // Find mutually exclusive value
    let exclusiveValue = null;
    for (const pair of exclusions) {
      if (pair[0] === value && pair[1]) {
        exclusiveValue = pair[1];
        break;
      }
      if (pair[1] === value && pair[0]) {
        exclusiveValue = pair[0];
        break;
      }
    }

    if (!exclusiveValue) return null;

    // Check if the contradictory fact exists in KB
    for (const fact of this.kbFacts) {
      if (!fact.metadata) continue;
      if (fact.metadata.operator === operator &&
          fact.metadata.args[0] === subject &&
          fact.metadata.args[1] === exclusiveValue) {
        return `Warning: contradiction - ${subject} is both ${value} and ${exclusiveValue}`;
      }
    }

    return null;
  }

  /**
   * Execute query with holes
   * @param {string} dsl - Query DSL
   * @returns {Object} Query result with bindings
   */
  query(dsl) {
    dbg('QUERY', 'Starting:', dsl?.substring(0, 60));
    try {
      const ast = parse(dsl);
      if (ast.statements.length === 0) {
        dbg('QUERY', 'Empty query');
        return { success: false, reason: 'Empty query' };
      }

      const stmt = ast.statements[0];
      dbg('QUERY', 'Statement:', stmt.toString?.() || 'N/A');
      const result = this.executeQuery(stmt);
      dbg('QUERY', 'Result:', result.success, 'bindings:', result.bindings?.size || 0);

      // Track statistics
      this.reasoningStats.queries++;
      this.reasoningStats.totalSteps++;
      if (result.success) {
        this.trackMethod('query_match');
        this.trackOperation('query_search');
      }

      return result;
    } catch (e) {
      dbg('QUERY', 'Error:', e.message);
      return { success: false, reason: e.message };
    }
  }

  /**
   * Execute query from statement
   * Uses QueryEngine which searches individual facts for better accuracy
   * @param {Statement} stmt - Query statement
   * @returns {QueryResult} - includes allResults with all matching facts
   */
  executeQuery(stmt) {
    return this.queryEngine.execute(stmt);
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

    for (const fact of this.kbFacts) {
      const sim = similarity(queryVec, fact.vector);
      if (sim > 0.5) {
        matches.push({ similarity: sim, name: fact.name });
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
   * @param {Object} options - Options { timeout: 1000 }
   * @returns {Object} Proof result
   */
  prove(dsl, options = {}) {
    dbg('PROVE', 'Starting:', dsl?.substring(0, 60), 'timeout:', options.timeout);
    const startTime = Date.now();
    const timeout = options.timeout || 2000;

    try {
      const ast = parse(dsl);
      if (ast.statements.length === 0) {
        dbg('PROVE', 'Empty goal');
        return { valid: false, reason: 'Empty goal' };
      }

      // Reset step counter at the start of each prove
      this.reasoningSteps = 0;

      const goal = ast.statements[0];
      const goalString = goal.toString?.() || dsl;
      dbg('PROVE', 'Goal parsed:', goalString?.substring(0, 40));
      const result = this.proveGoal(goal, 0, new Set(), startTime, timeout);
      dbg('PROVE', 'Result:', result.valid, 'method:', result.method, 'steps:', this.reasoningSteps);

      // Always include goal in result for elaborate()
      result.goal = result.goal || goalString;

      // Track statistics
      this.reasoningStats.proofs++;
      const proofLength = result.steps ? result.steps.length : (result.valid ? 1 : 0);
      this.reasoningStats.proofLengths.push(proofLength);
      this.reasoningStats.totalProofSteps += proofLength;
      if (proofLength > this.reasoningStats.maxProofDepth) {
        this.reasoningStats.maxProofDepth = proofLength;
      }
      if (result.valid && result.method) {
        this.trackMethod(result.method);
      }
      if (result.steps) {
        for (const step of result.steps) {
          this.trackOperation(step.operation);
        }
      }

      return result;
    } catch (e) {
      return { valid: false, reason: e.message };
    }
  }

  /**
   * Track reasoning method usage
   */
  trackMethod(method) {
    this.reasoningStats.methods[method] = (this.reasoningStats.methods[method] || 0) + 1;
  }

  /**
   * Track operation usage
   */
  trackOperation(operation) {
    this.reasoningStats.operations[operation] = (this.reasoningStats.operations[operation] || 0) + 1;
  }

  /**
   * Get and optionally reset reasoning stats
   */
  getReasoningStats(reset = false) {
    // Calculate derived stats
    const stats = { ...this.reasoningStats };
    stats.avgProofLength = stats.proofLengths.length > 0
      ? (stats.totalProofSteps / stats.proofLengths.length).toFixed(1)
      : 0;
    // Don't include raw proofLengths array in output
    delete stats.proofLengths;

    if (reset) {
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
    }
    return stats;
  }

  /**
   * Transitive relations that support chaining
   */
  static TRANSITIVE_RELATIONS = new Set(['isA', 'locatedIn', 'partOf', 'subclassOf', 'containedIn']);

  /**
   * Prove a goal with depth tracking
   */
  proveGoal(goal, depth, visited, startTime, timeout) {
    const elapsed = Date.now() - startTime;
    dbg('proveGoal', `depth=${depth} step=${this.reasoningSteps} elapsed=${elapsed}ms goal=${goal.toString?.()?.substring(0, 40)}`);

    // Check timeout
    if (elapsed > timeout) {
      dbg('proveGoal', 'TIMEOUT');
      throw new Error('Proof timed out');
    }

    // Check step limit to prevent infinite loops
    this.reasoningSteps++;
    if (this.reasoningSteps > MAX_REASONING_STEPS) {
      dbg('proveGoal', 'STEP LIMIT EXCEEDED');
      return { valid: false, reason: 'Step limit exceeded (possible infinite loop)' };
    }

    if (depth > 10) {
      dbg('proveGoal', 'DEPTH LIMIT');
      return { valid: false, reason: 'Depth limit exceeded' };
    }

    const goalVec = this.executor.buildStatementVector(goal);
    const goalHash = goalVec.data.slice(0, 4).join(':');

    if (visited.has(goalHash)) {
      return { valid: false, reason: 'Cycle detected' };
    }
    visited.add(goalHash);

    // Try direct match first
    for (const fact of this.kbFacts) {
      this.reasoningStats.kbScans++;
      this.reasoningStats.similarityChecks++;
      const sim = similarity(goalVec, fact.vector);
      if (sim > 0.7) {
        return {
          valid: true,
          method: 'direct',
          confidence: sim,
          steps: [{ operation: 'direct_match', goal: goal.toString() }]
        };
      }
    }

    // Try transitive reasoning for supported relations
    const transitiveResult = this.tryTransitiveChain(goal, depth, visited, startTime, timeout);
    if (transitiveResult.valid) {
      return transitiveResult;
    }

    // Try rule matching
    for (const rule of this.rules) {
      this.reasoningStats.ruleAttempts++;
      const match = this.tryRuleMatch(goal, rule, depth, visited, startTime, timeout);
      if (match.valid) {
        return match;
      }
    }

    // Weaker direct match
    for (const fact of this.kbFacts) {
      this.reasoningStats.kbScans++;
      this.reasoningStats.similarityChecks++;
      const sim = similarity(goalVec, fact.vector);
      if (sim > 0.55) {
        return {
          valid: true,
          method: 'direct_weak',
          confidence: sim,
          steps: [{ operation: 'weak_match', goal: goal.toString() }]
        };
      }
    }

    // For spatial relations, try to prove disjointness (smarter "no")
    const disjointResult = this.tryDisjointProof(goal, depth);
    if (disjointResult.valid) {
      return disjointResult;
    }

    return { valid: false, reason: 'No proof found' };
  }

  /**
   * Try to prove disjointness for relations like locatedIn
   * If we can prove X is in A, and A is disjoint from B,
   * then we know X is NOT in B (with proof steps)
   */
  tryDisjointProof(goal, depth) {
    // Only for locatedIn relation
    const operatorName = goal.operator?.name || goal.operator?.value;
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

    // Find all containers in the subject's chain (not just root)
    const containers = this.findContainmentChain(subjectName);

    // Check if any container is disjoint from the target
    for (let i = 0; i < containers.length; i++) {
      const container = containers[i];
      const isDisjoint = this.checkDisjoint(container, targetName);
      if (isDisjoint) {
        // Build chain steps: subject -> c1 -> c2 -> ... -> disjoint container
        const chainSteps = [];
        const chainPart = containers.slice(0, i + 1);

        // First link: subject -> first container
        chainSteps.push({ operation: 'chain_step', from: subjectName, to: chainPart[0] });

        // Subsequent links
        for (let j = 0; j < chainPart.length - 1; j++) {
          chainSteps.push({ operation: 'chain_step', from: chainPart[j], to: chainPart[j + 1] });
        }

        return {
          valid: true,
          result: false,  // The answer is NO, but we PROVED it
          method: 'disjoint_proof',
          confidence: 0.95,
          steps: [
            ...chainSteps,
            { operation: 'disjoint_check', container: container, target: targetName, disjoint: true },
            { operation: 'concluded', result: `${subjectName} is NOT in ${targetName} because ${container} is disjoint from ${targetName}` }
          ]
        };
      }
    }

    return { valid: false };
  }

  /**
   * Find all containers in the chain for a subject (including intermediates)
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
   * Uses mutuallyDisjoint concept - if both belong to a mutually disjoint type, they're disjoint
   */
  checkDisjoint(a, b) {
    if (a === b) return false;

    // Find common types that are mutually disjoint
    const typesA = this.findTypes(a);
    const typesB = this.findTypes(b);

    for (const typeA of typesA) {
      for (const typeB of typesB) {
        if (typeA === typeB && this.isMutuallyDisjoint(typeA)) {
          // Both belong to same mutually disjoint type
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Find types of an entity (via isA relation)
   */
  findTypes(entity) {
    const types = [];
    for (const fact of this.kbFacts) {
      if (fact.metadata?.operator === 'isA' && fact.metadata.args[0] === entity) {
        types.push(fact.metadata.args[1]);
      }
    }
    return types;
  }

  /**
   * Check if a type is marked as mutually disjoint
   */
  isMutuallyDisjoint(typeName) {
    for (const fact of this.kbFacts) {
      if (fact.metadata?.operator === 'mutuallyDisjoint' && fact.metadata.args[0] === typeName) {
        return true;
      }
    }
    return false;
  }

  /**
   * Try to prove goal via transitive chain
   * For goal like "isA Socrates Human", finds intermediate:
   *   isA Socrates Philosopher (direct) + isA Philosopher Human (direct or chain)
   */
  tryTransitiveChain(goal, depth, visited, startTime, timeout) {
    // Extract operator and arguments from goal
    const operatorName = goal.operator?.name || goal.operator?.value;
    if (!operatorName || !Session.TRANSITIVE_RELATIONS.has(operatorName)) {
      return { valid: false };
    }

    // Need exactly 2 arguments for binary transitive relation
    if (!goal.args || goal.args.length !== 2) {
      return { valid: false };
    }

    const subjectName = this.extractArgName(goal.args[0]);
    const objectName = this.extractArgName(goal.args[1]);

    if (!subjectName || !objectName) {
      return { valid: false };
    }

    // Get operator vector for matching
    const operatorVec = this.vocabulary.get(operatorName);
    if (!operatorVec) {
      return { valid: false };
    }

    // Find all facts with this operator where subject matches arg1
    // These are potential "first links" in the chain
    const subjectVec = this.vocabulary.get(subjectName);
    if (!subjectVec) {
      return { valid: false };
    }

    // Search for intermediates: find facts like "operator subject ?intermediate"
    const intermediates = this.findIntermediates(operatorName, subjectName);

    // For each intermediate, try to prove "operator intermediate object"
    for (const intermediate of intermediates) {
      if (Date.now() - startTime > timeout) throw new Error('Proof timed out');
      
      this.reasoningStats.transitiveSteps++;
      if (intermediate === objectName) {
        // Direct match found via intermediate search
        const directFact = `${operatorName} ${subjectName} ${objectName}`;
        return {
          valid: true,
          method: 'transitive_direct',
          confidence: 0.9,
          steps: [{
            operation: 'transitive_found',
            goal: goal.toString(),
            fact: directFact,
            from: subjectName,
            to: objectName,
            operator: operatorName
          }]
        };
      }

      // Recursively try to prove intermediate -> object
      const chainResult = this.proveTransitiveStep(
        operatorName,
        intermediate,
        objectName,
        depth + 1,
        new Set(visited),
        startTime,
        timeout
      );

      if (chainResult.valid) {
        // Build the actual proposition for this step
        const stepFact = `${operatorName} ${subjectName} ${intermediate}`;
        return {
          valid: true,
          method: 'transitive_chain',
          confidence: chainResult.confidence * 0.98,  // High retention for transitive chains
          goal: goal.toString(),  // Include goal for elaborate()
          steps: [
            {
              operation: 'transitive_step',
              from: subjectName,
              to: intermediate,
              fact: stepFact,  // The actual proposition used
              operator: operatorName
            },
            ...chainResult.steps
          ]
        };
      }
    }

    return { valid: false };
  }

  /**
   * Extract argument name from AST node
   */
  extractArgName(arg) {
    if (!arg) return null;
    if (arg.type === 'Identifier') return arg.name;
    if (arg.type === 'Reference') return arg.name;
    if (arg.name) return arg.name;
    if (arg.value) return arg.value;
    return null;
  }

  /**
   * Reserved words that should not be considered as intermediates
   */
  static RESERVED_WORDS = new Set([
    'Implies', 'And', 'Or', 'Not', 'ForAll', 'Exists',
    'True', 'False', 'forall', 'exists', 'implies', 'and', 'or', 'not'
  ]);

  /**
   * Find intermediate values for a transitive relation
   * Given "isA Socrates ?", finds all Y where "isA Socrates Y" exists in KB
   * Uses stored metadata for reliable lookup
   */
  findIntermediates(operatorName, subjectName) {
    const intermediates = [];

    // Iterate through all KB facts using stored metadata
    for (const fact of this.kbFacts) {
      this.reasoningStats.kbScans++;
      // Use metadata if available (most reliable)
      if (fact.metadata) {
        const meta = fact.metadata;

        // Check if this fact has the right operator
        if (meta.operator !== operatorName) continue;

        // Check first argument matches subject
        if (!meta.args || meta.args.length < 2) continue;
        if (meta.args[0] !== subjectName) continue;

        // Second argument is the intermediate
        const intermediate = meta.args[1];
        if (!intermediate) continue;

        // Filter out reserved words and self-references
        if (Session.RESERVED_WORDS.has(intermediate)) continue;
        if (intermediate === subjectName) continue;
        if (intermediate === operatorName) continue;

        // Only add if not already present
        if (!intermediates.includes(intermediate)) {
          intermediates.push(intermediate);
        }
      }
    }

    return intermediates;
  }

  /**
   * Prove a single transitive step: operator intermediate object
   * Uses metadata verification to prevent false positives from swapped arguments
   */
  proveTransitiveStep(operatorName, intermediateName, objectName, depth, visited, startTime, timeout) {
    if (Date.now() - startTime > timeout) throw new Error('Proof timed out');
    
    // Check step limit
    this.reasoningSteps++;
    if (this.reasoningSteps > MAX_REASONING_STEPS) {
      return { valid: false, reason: 'Step limit exceeded' };
    }

    if (depth > 10) {
      return { valid: false, reason: 'Depth limit' };
    }

    // Check for cycle using string key (more reliable than vector hash)
    const cycleKey = `${operatorName}:${intermediateName}:${objectName}`;
    if (visited.has(cycleKey)) {
      return { valid: false, reason: 'Cycle' };
    }
    visited.add(cycleKey);

    // Try direct match using metadata (most reliable)
    for (const fact of this.kbFacts) {
      this.reasoningStats.kbScans++;
      if (fact.metadata) {
        const meta = fact.metadata;
        // Exact match: operator and both args must match in order
        if (meta.operator === operatorName &&
            meta.args && meta.args.length >= 2 &&
            meta.args[0] === intermediateName &&
            meta.args[1] === objectName) {
          // Build the actual proposition for this final step
          const finalFact = `${operatorName} ${intermediateName} ${objectName}`;
          return {
            valid: true,
            method: 'direct',
            confidence: 0.9,
            steps: [{
              operation: 'transitive_match',
              from: intermediateName,
              to: objectName,
              fact: finalFact,  // The actual proposition used
              operator: operatorName
            }]
          };
        }
      }
    }

    // Try further chaining
    const nextIntermediates = this.findIntermediates(operatorName, intermediateName);
    for (const next of nextIntermediates) {
      if (Date.now() - startTime > timeout) throw new Error('Proof timed out');
      
      this.reasoningStats.transitiveSteps++;
      if (next === objectName) {
        // Direct match found - build the fact for this step
        const stepFact = `${operatorName} ${intermediateName} ${next}`;
        return {
          valid: true,
          method: 'transitive_found',
          confidence: 0.85,
          steps: [{
            operation: 'transitive_found',
            from: intermediateName,
            to: next,
            fact: stepFact,
            operator: operatorName
          }]
        };
      }

      const chainResult = this.proveTransitiveStep(operatorName, next, objectName, depth + 1, visited, startTime, timeout);
      if (chainResult.valid) {
        // Build the fact for this intermediate step
        const stepFact = `${operatorName} ${intermediateName} ${next}`;
        return {
          valid: true,
          method: 'transitive_chain',
          confidence: chainResult.confidence * 0.98,  // High retention for transitive chains
          steps: [
            {
              operation: 'transitive_step',
              from: intermediateName,
              to: next,
              fact: stepFact,
              operator: operatorName
            },
            ...chainResult.steps
          ]
        };
      }
    }

    return { valid: false };
  }

  /**
   * Try to match and apply a rule using backward chaining
   * 1. Check if goal matches the rule's conclusion
   * 2. If so, recursively prove the rule's condition
   */
  tryRuleMatch(goal, rule, depth, visited, startTime, timeout) {
    if (Date.now() - startTime > timeout) throw new Error('Proof timed out');
    
    // Skip rules without extracted condition/conclusion
    if (!rule.conclusion || !rule.condition) {
      return { valid: false };
    }

    // Check if goal matches the rule's conclusion
    const goalVec = this.executor.buildStatementVector(goal);
    this.reasoningStats.similarityChecks++;
    const conclusionSim = similarity(goalVec, rule.conclusion);

    if (conclusionSim > 0.7) {
      // Conclusion matches! Now prove the condition recursively
      const conditionResult = this.proveCondition(rule.condition, depth + 1, visited, startTime, timeout);

      if (conditionResult.valid) {
        return {
          valid: true,
          method: 'backward_chain',
          rule: rule.name,
          confidence: Math.min(conclusionSim, conditionResult.confidence) * 0.95,
          steps: [
            { operation: 'rule_match', goal: goal.toString(), rule: rule.name || rule.source },
            ...conditionResult.steps
          ]
        };
      }
    }

    return { valid: false };
  }

  /**
   * Prove a condition vector by searching KB or applying rules recursively
   */
  proveCondition(conditionVec, depth, visited, startTime, timeout) {
    if (Date.now() - startTime > timeout) throw new Error('Proof timed out');
    
    // Check step limit
    this.reasoningSteps++;
    if (this.reasoningSteps > MAX_REASONING_STEPS) {
      return { valid: false, reason: 'Step limit exceeded' };
    }

    if (depth > 10) {
      return { valid: false, reason: 'Depth limit exceeded' };
    }

    // Track visited to prevent cycles
    const condHash = conditionVec.data.slice(0, 4).join(':');
    if (visited.has(condHash)) {
      return { valid: false, reason: 'Cycle detected' };
    }
    visited.add(condHash);

    // Try direct match in KB first
    for (const fact of this.kbFacts) {
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

    // Check if this is an And condition by finding matching And structures
    // An And condition is stored as: And(arg1, arg2)
    // We look for And in scope/KB that matches this condition
    const andResult = this.tryProveAndCondition(conditionVec, depth, visited, startTime, timeout);
    if (andResult.valid) {
      return andResult;
    }

    // Try to derive via another rule (recursive backward chaining)
    for (const rule of this.rules) {
      if (!rule.conclusion || !rule.condition) continue;

      // Does this rule's conclusion match our condition?
      const conclusionSim = similarity(conditionVec, rule.conclusion);
      if (conclusionSim > 0.7) {
        // Recursively prove this rule's condition
        const subResult = this.proveCondition(rule.condition, depth + 1, new Set(visited), startTime, timeout);

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
   * Try to prove an And condition by checking if both parts are satisfied
   * Uses stored conditionParts from rule learning
   */
  tryProveAndCondition(conditionVec, depth, visited, startTime, timeout) {
    if (Date.now() - startTime > timeout) throw new Error('Proof timed out');
    
    // Look for rules whose condition matches this vector
    for (const rule of this.rules) {
      if (!rule.condition) continue;

      const condSim = similarity(conditionVec, rule.condition);
      if (condSim > 0.8 && rule.conditionParts) {
        // This is a compound condition (And/Or)
        if (rule.conditionParts.type === 'And') {
          // For And: both parts must be true
          const parts = rule.conditionParts.parts;
          const partResults = [];

          for (const part of parts) {
            const partResult = this.proveCondition(part, depth + 1, new Set(visited), startTime, timeout);
            if (!partResult.valid) {
              // And fails if any part fails
              return { valid: false, reason: 'And condition: part not satisfied' };
            }
            partResults.push(partResult);
          }

          // All parts proved!
          const minConfidence = Math.min(...partResults.map(r => r.confidence));
          const allSteps = partResults.flatMap(r => r.steps);

          return {
            valid: true,
            method: 'and_condition',
            confidence: minConfidence * 0.95,
            steps: [
              { operation: 'proving_and_condition', parts: parts.length },
              ...allSteps
            ]
          };
        } else if (rule.conditionParts.type === 'Or') {
          // For Or: at least one part must be true
          const parts = rule.conditionParts.parts;

          for (const part of parts) {
            const partResult = this.proveCondition(part, depth + 1, new Set(visited), startTime, timeout);
            if (partResult.valid) {
              return {
                valid: true,
                method: 'or_condition',
                confidence: partResult.confidence * 0.95,
                steps: [
                  { operation: 'proving_or_condition' },
                  ...partResult.steps
                ]
              };
            }
          }

          return { valid: false, reason: 'Or condition: no part satisfied' };
        }
      }
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
    // Handle both string args and object args with .value
    const argValues = args.map(a => typeof a === 'string' ? a : a?.value || a);

    // Helper: select "a" or "an" based on word
    const article = (word) => /^[aeiou]/i.test(word) ? 'an' : 'a';

    // Helper: add 's' for third person singular verbs
    const thirdPerson = (verb) => {
      // Modal verbs and temporal prepositions don't conjugate
      const noConjugate = [
        'can', 'cannot', 'could', 'may', 'might', 'must', 'shall', 'should', 'will', 'would',
        'before', 'after', 'during', 'until', 'since', 'while', 'between'
      ];
      if (noConjugate.includes(verb.toLowerCase())) {
        return verb;
      }
      // If verb contains camelCase (like isParentOf), don't modify - it's a compound name
      if (/[a-z][A-Z]/.test(verb)) {
        return verb;
      }
      // If verb already ends in 's', assume it's already third person (produces, requires, feeds)
      if (verb.endsWith('s')) {
        return verb;
      }
      // Standard conjugation rules for base form verbs
      if (verb.endsWith('x') || verb.endsWith('ch') || verb.endsWith('sh') || verb.endsWith('o')) {
        return verb + 'es';
      }
      if (verb.endsWith('y') && !/[aeiou]y$/.test(verb)) {
        return verb.slice(0, -1) + 'ies';
      }
      return verb + 's';
    };

    // Common templates
    const templates = {
      // Relationships
      love: (a) => a.length >= 2 ? `${a[0]} loves ${a[1]}.` : `love(${a.join(', ')})`,
      loves: (a) => a.length >= 2 ? `${a[0]} loves ${a[1]}.` : `loves(${a.join(', ')})`,
      know: (a) => a.length >= 2 ? `${a[0]} knows ${a[1]}.` : `know(${a.join(', ')})`,
      help: (a) => a.length >= 2 ? `${a[0]} helps ${a[1]}.` : `help(${a.join(', ')})`,

      // Ownership and transactions
      has: (a) => a.length >= 2 ? `${a[0]} has ${article(a[1])} ${a[1].toLowerCase()}.` : `has(${a.join(', ')})`,
      give: (a) => a.length >= 3 ? `${a[0]} gave ${a[1]} ${article(a[2])} ${a[2].toLowerCase()}.` : `give(${a.join(', ')})`,
      sells: (a) => a.length >= 3 ? `${a[0]} sold ${a[2]} to ${a[1]}.` : `sells(${a.join(', ')})`,

      // Classification
      isA: (a) => a.length >= 2 ? `${a[0]} is ${article(a[1])} ${a[1].toLowerCase()}.` : `isA(${a.join(', ')})`,

      // Properties
      hasProperty: (a) => a.length >= 2 ? `${a[0]} is ${a[1].toLowerCase()}.` : `hasProperty(${a.join(', ')})`,

      // Location
      locatedIn: (a) => a.length >= 2 ? `${a[0]} is in ${a[1]}.` : `locatedIn(${a.join(', ')})`,
      livesIn: (a) => a.length >= 2 ? `${a[0]} is in ${a[1]}.` : `livesIn(${a.join(', ')})`,
      in: (a) => a.length >= 2 ? `${a[0]} is in ${a[1]}.` : `in(${a.join(', ')})`,

      // Family
      parent: (a) => a.length >= 2 ? `${a[0]} is a parent of ${a[1]}.` : `parent(${a.join(', ')})`,

      // Status
      hasStatus: (a) => a.length >= 2 ? `${a[0]} is ${a[1].toLowerCase()}.` : `hasStatus(${a.join(', ')})`,

      // Comparison
      greaterThan: (a) => a.length >= 2 ? `${a[0]} is greater than ${a[1]}.` : `greaterThan(${a.join(', ')})`
    };

    if (templates[operator]) {
      return templates[operator](argValues);
    }

    // Generic template with verb conjugation for binary relations
    if (argValues.length === 0) {
      return `${operator}.`;
    }
    if (argValues.length === 1) {
      return `${argValues[0]} is ${operator}.`;
    }
    if (argValues.length === 2) {
      // For binary relations, conjugate the verb
      return `${argValues[0]} ${thirdPerson(operator)} ${argValues[1]}.`;
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
      // Generate natural language for the goal that couldn't be proven
      let goalText = proof.goal || proof.reason || 'statement';
      if (proof.goal) {
        const parts = proof.goal.trim().split(/\s+/).filter(p => !p.startsWith('@'));
        if (parts.length >= 2) {
          goalText = this.generateText(parts[0], parts.slice(1)).replace(/\.$/, '');
        }
      }
      return { text: 'Cannot prove: ' + goalText };
    }

    // Extract the goal and convert to natural language
    const steps = proof.steps || [];
    let goalText = '';

    // Find the goal from proof.goal or first step
    const goalString = proof.goal || (steps.length > 0 && steps[0].goal);
    if (goalString) {
      // Parse goal like "@goal isA Rex Dog" -> operator="isA", args=["Rex", "Dog"]
      const parts = goalString.trim().split(/\s+/).filter(p => !p.startsWith('@'));
      if (parts.length >= 1) {
        const operator = parts[0];
        const args = parts.slice(1);
        goalText = this.generateText(operator, args);
        // Remove trailing period for cleaner output
        goalText = goalText.replace(/\.$/, '');
      }
    }

    // Build proof chain from step facts
    const proofSteps = [];
    for (const step of steps) {
      if (step.fact) {
        // Parse the DSL fact: "operator arg1 arg2"
        const factParts = step.fact.trim().split(/\s+/);
        if (factParts.length >= 2) {
          const stepOperator = factParts[0];
          const stepArgs = factParts.slice(1);
          const stepText = this.generateText(stepOperator, stepArgs).replace(/\.$/, '');
          if (stepText && !proofSteps.includes(stepText)) {
            proofSteps.push(stepText);
          }
        }
      }
    }

    // If we have proof steps, include them in the output
    if (goalText && proofSteps.length > 0) {
      return {
        text: `True: ${goalText}`,
        proofChain: proofSteps,
        fullProof: `True: ${goalText}. Proof: ${proofSteps.join('. ')}.`
      };
    }

    if (goalText) {
      return { text: `True: ${goalText}` };
    }

    // Fallback to technical format if parsing fails
    const lines = [`Proof by ${proof.method}:`];
    for (const step of steps) {
      lines.push(`  - ${step.operation}: ${step.goal || step.fact || ''}`);
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
