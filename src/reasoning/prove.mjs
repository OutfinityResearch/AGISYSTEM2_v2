/**
 * AGISystem2 - Proof Engine
 * @module reasoning/prove
 *
 * Multi-step proof construction via backward chaining.
 */

import { similarity, bind } from '../core/operations.mjs';
import { MAX_PROOF_DEPTH, PROOF_TIMEOUT_MS, STRONG_CONFIDENCE } from '../core/constants.mjs';

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
  }

  /**
   * Prove a goal statement
   * @param {Statement} statement - Goal to prove
   * @returns {ProveResult}
   */
  prove(statement) {
    this.steps = [];
    this.visited = new Set();
    this.startTime = Date.now();

    const goalVector = this.session.executor.buildStatementVector(statement);
    const result = this.backwardChain(goalVector, statement.toString(), 0);

    return {
      valid: result.success,
      proof: result.tree,
      steps: this.steps,
      confidence: result.confidence,
      reason: result.reason
    };
  }

  /**
   * Backward chain from goal to premises
   */
  backwardChain(goalVector, goalStr, depth) {
    // Check timeout
    if (Date.now() - this.startTime > this.options.timeout) {
      return { success: false, reason: 'timeout' };
    }

    // Check depth limit
    if (depth > this.options.maxDepth) {
      this.logStep('depth_limit', goalStr, 'exceeded');
      return { success: false, reason: 'depth limit' };
    }

    // Cycle detection
    const goalHash = this.hashGoal(goalVector);
    if (this.visited.has(goalHash)) {
      this.logStep('cycle', goalStr, 'detected');
      return { success: false, reason: 'cycle' };
    }
    this.visited.add(goalHash);

    // Try strong direct KB lookup
    const directResult = this.tryDirectMatch(goalVector, goalStr);
    if (directResult.success && directResult.confidence > STRONG_CONFIDENCE) {
      this.logStep('direct', goalStr, 'found');
      return directResult;
    }

    // Try rule matching
    const rules = this.findMatchingRules(goalVector, goalStr);
    for (const rule of rules) {
      this.logStep('try_rule', goalStr, rule.name);

      // Simplified: assume rule matches if conclusion is similar
      // Full implementation would extract premises and prove each
      const ruleResult = this.tryRule(rule, goalVector, goalStr, depth);
      if (ruleResult.success) {
        return ruleResult;
      }
    }

    // Try weaker direct match
    if (directResult.success && directResult.confidence > 0.55) {
      this.logStep('direct_weak', goalStr, 'accepted');
      return directResult;
    }

    this.logStep('failed', goalStr, 'no proof');
    return { success: false, reason: 'no proof found' };
  }

  /**
   * Try direct match against KB
   */
  tryDirectMatch(goalVector, goalStr) {
    let bestMatch = null;
    let bestSim = 0;

    for (const factVec of this.session.kbFacts) {
      const sim = similarity(goalVector, factVec);
      if (sim > bestSim) {
        bestSim = sim;
        bestMatch = factVec;
      }
    }

    if (bestSim > 0.5) {
      return {
        success: true,
        tree: {
          goal: goalStr,
          method: 'direct',
          confidence: bestSim
        },
        confidence: bestSim
      };
    }

    return { success: false, confidence: 0 };
  }

  /**
   * Find rules that might prove this goal
   */
  findMatchingRules(goalVector, goalStr) {
    const matchingRules = [];

    for (const rule of this.session.getAllRules()) {
      // Check if goal is similar to rule vector
      // (simplified - real impl would check conclusion specifically)
      const sim = similarity(goalVector, rule.vector);
      if (sim > 0.4) {
        matchingRules.push({
          ...rule,
          similarity: sim
        });
      }
    }

    // Sort by similarity
    matchingRules.sort((a, b) => b.similarity - a.similarity);
    return matchingRules;
  }

  /**
   * Try to apply a rule
   */
  tryRule(rule, goalVector, goalStr, depth) {
    // Simplified rule application
    // In full implementation, would:
    // 1. Unify goal with rule conclusion
    // 2. Extract premises with bindings
    // 3. Recursively prove each premise

    const confidence = rule.similarity * 0.95;

    if (rule.similarity > 0.6) {
      this.logStep('rule_success', goalStr, rule.name);
      return {
        success: true,
        tree: {
          goal: goalStr,
          method: 'rule',
          rule: rule.name,
          premises: [],
          confidence
        },
        confidence
      };
    }

    return { success: false };
  }

  /**
   * Hash goal for cycle detection
   */
  hashGoal(goalVector) {
    const parts = [];
    for (let i = 0; i < Math.min(4, goalVector.words); i++) {
      parts.push(goalVector.data[i].toString(16));
    }
    return parts.join(':');
  }

  /**
   * Log proof step
   */
  logStep(operation, goal, result) {
    this.steps.push({
      operation,
      goal,
      result,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Combine confidences from multiple premises
   */
  combineConfidences(results) {
    if (results.length === 0) return 1.0;

    let minConf = 1.0;
    for (const r of results) {
      if (r.confidence < minConf) {
        minConf = r.confidence;
      }
    }

    // Slight penalty for chain length
    return minConf * Math.pow(0.98, results.length);
  }
}

export default ProofEngine;
