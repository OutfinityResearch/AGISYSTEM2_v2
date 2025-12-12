/**
 * AGISystem2 - Query Engine
 * @module reasoning/query
 *
 * Single-step query execution with holes (?variables).
 */

import { bind, topKSimilar, similarity } from '../core/operations.mjs';
import { withPosition, removePosition } from '../core/position.mjs';
import { MAX_HOLES, SIMILARITY_THRESHOLD } from '../core/constants.mjs';

export class QueryEngine {
  /**
   * Create query engine
   * @param {Session} session - Parent session
   */
  constructor(session) {
    this.session = session;
  }

  /**
   * Execute query statement
   * @param {Statement} statement - Query statement with holes
   * @returns {QueryResult}
   */
  execute(statement) {
    // Step 1: Identify holes and knowns
    const holes = [];
    const knowns = [];
    const operator = this.session.resolve(statement.operator);

    for (let i = 0; i < statement.args.length; i++) {
      const arg = statement.args[i];
      if (arg.type === 'Hole') {
        holes.push({ index: i + 1, name: arg.name });
      } else {
        knowns.push({
          index: i + 1,
          vector: this.session.resolve(arg)
        });
      }
    }

    if (holes.length === 0) {
      return this.directMatch(operator, knowns, statement);
    }

    if (holes.length > MAX_HOLES) {
      return {
        success: false,
        reason: `Too many holes (max ${MAX_HOLES})`,
        bindings: new Map()
      };
    }

    // Step 2: Build partial vector (operator + known args)
    let partial = operator;
    for (const known of knowns) {
      partial = bind(partial, withPosition(known.index, known.vector));
    }

    // Step 3: Unbind from KB
    if (!this.session.kb) {
      return {
        success: false,
        reason: 'Empty knowledge base',
        bindings: new Map()
      };
    }

    const candidate = bind(this.session.kb, partial);

    // Step 4: Extract answers for each hole
    const bindings = new Map();

    for (const hole of holes) {
      const raw = removePosition(hole.index, candidate);
      const matches = topKSimilar(raw, this.session.vocabulary.atoms, 5);

      if (matches.length > 0 && matches[0].similarity > SIMILARITY_THRESHOLD) {
        bindings.set(hole.name, {
          answer: matches[0].name,
          similarity: matches[0].similarity,
          alternatives: matches.slice(1, 4).map(m => ({
            value: m.name,
            similarity: m.similarity
          }))
        });
      } else {
        bindings.set(hole.name, {
          answer: null,
          similarity: 0,
          alternatives: matches.slice(0, 3).map(m => ({
            value: m.name,
            similarity: m.similarity
          }))
        });
      }
    }

    // Step 5: Calculate confidence
    const confidence = this.calculateConfidence(bindings, holes.length);
    const ambiguous = this.hasAmbiguity(bindings);

    return {
      success: this.allHolesFilled(bindings),
      bindings,
      confidence,
      ambiguous
    };
  }

  /**
   * Direct match query (no holes)
   */
  directMatch(operator, knowns, statement) {
    // Build full query vector
    let queryVec = operator;
    for (const known of knowns) {
      queryVec = bind(queryVec, withPosition(known.index, known.vector));
    }

    // Search KB for matches
    const matches = [];
    for (const factVec of this.session.kbFacts) {
      const sim = similarity(queryVec, factVec);
      if (sim > SIMILARITY_THRESHOLD) {
        matches.push({ similarity: sim });
      }
    }

    matches.sort((a, b) => b.similarity - a.similarity);

    return {
      success: matches.length > 0,
      matches,
      confidence: matches.length > 0 ? matches[0].similarity : 0,
      bindings: new Map()
    };
  }

  /**
   * Calculate overall confidence
   */
  calculateConfidence(bindings, numHoles) {
    if (bindings.size === 0) return 0;

    let totalSim = 0;
    for (const binding of bindings.values()) {
      totalSim += binding.similarity;
    }
    const avgSim = totalSim / bindings.size;

    // Penalty for multiple holes
    const holePenalty = 1.0 - (numHoles - 1) * 0.1;

    // Penalty for ambiguity
    let ambiguityPenalty = 1.0;
    for (const binding of bindings.values()) {
      if (binding.alternatives && binding.alternatives.length > 0 &&
          binding.alternatives[0].similarity > binding.similarity - 0.05) {
        ambiguityPenalty *= 0.9;
      }
    }

    return avgSim * Math.max(0.5, holePenalty) * ambiguityPenalty;
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
   * Check if all holes have answers
   */
  allHolesFilled(bindings) {
    for (const binding of bindings.values()) {
      if (!binding.answer) return false;
    }
    return true;
  }
}

export default QueryEngine;
