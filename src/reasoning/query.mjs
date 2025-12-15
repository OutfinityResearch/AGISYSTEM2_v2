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
   * @returns {QueryResult} - includes allResults array with all matching facts
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
        bindings: new Map(),
        allResults: []
      };
    }

    // Step 2: Check KB not empty
    if (this.session.kbFacts.length === 0) {
      return {
        success: false,
        reason: 'Empty knowledge base',
        bindings: new Map(),
        allResults: []
      };
    }

    // Step 3: Build partial vector for matching (operator + known args)
    let partialQuery = operator;
    for (const known of knowns) {
      partialQuery = bind(partialQuery, withPosition(known.index, known.vector));
    }

    // Step 4: Search each fact individually for matches
    const allResults = [];

    for (const fact of this.session.kbFacts) {
      // Unbind partial query from fact to get candidate
      const candidate = bind(fact.vector, partialQuery);

      // Extract potential answers for each hole
      const factBindings = new Map();
      let factScore = 0;
      let validFact = true;

      for (const hole of holes) {
        const raw = removePosition(hole.index, candidate);
        const matches = topKSimilar(raw, this.session.vocabulary.atoms, 3);

        if (matches.length > 0 && matches[0].similarity > SIMILARITY_THRESHOLD) {
          factBindings.set(hole.name, {
            answer: matches[0].name,
            similarity: matches[0].similarity
          });
          factScore += matches[0].similarity;
        } else {
          validFact = false;
          break;
        }
      }

      if (validFact && factBindings.size === holes.length) {
        allResults.push({
          bindings: factBindings,
          score: factScore / holes.length,
          factName: fact.name
        });
      }
    }

    // Sort by score descending
    allResults.sort((a, b) => b.score - a.score);

    // Step 5: Build primary bindings from best result
    const bindings = new Map();

    if (allResults.length > 0) {
      const best = allResults[0];
      for (const [holeName, binding] of best.bindings) {
        // Collect alternatives from other results
        const alternatives = allResults.slice(1)
          .map(r => r.bindings.get(holeName))
          .filter(b => b && b.answer !== binding.answer)
          .slice(0, 3)
          .map(b => ({ value: b.answer, similarity: b.similarity }));

        bindings.set(holeName, {
          answer: binding.answer,
          similarity: binding.similarity,
          alternatives
        });
      }
    }

    // Step 6: Calculate confidence
    const confidence = allResults.length > 0 ? allResults[0].score : 0;
    const ambiguous = allResults.length > 1 &&
                      (allResults[0].score - allResults[1].score) < 0.1;

    return {
      success: allResults.length > 0,
      bindings,
      confidence,
      ambiguous,
      allResults  // NEW: return all matching results
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
    for (const fact of this.session.kbFacts) {
      const sim = similarity(queryVec, fact.vector);
      if (sim > SIMILARITY_THRESHOLD) {
        matches.push({ similarity: sim, name: fact.name });
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
