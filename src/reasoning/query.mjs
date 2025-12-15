/**
 * AGISystem2 - Query Engine
 * @module reasoning/query
 *
 * TRUE HOLOGRAPHIC COMPUTING QUERY!
 * Uses Master Equation: Answer = KB ⊕ Query⁻¹
 * Plus transitive chains and rule derivations.
 */

import { bind, unbind, bundle, topKSimilar, similarity } from '../core/operations.mjs';
import { withPosition, removePosition, getPositionVector } from '../core/position.mjs';
import { MAX_HOLES, SIMILARITY_THRESHOLD } from '../core/constants.mjs';
import { TRANSITIVE_RELATIONS } from './transitive.mjs';

// Debug logging
const DEBUG = process.env.SYS2_DEBUG === 'true';
function dbg(category, ...args) {
  if (DEBUG) console.log(`[Query:${category}]`, ...args);
}

export class QueryEngine {
  /**
   * Create query engine
   * @param {Session} session - Parent session
   */
  constructor(session) {
    this.session = session;
  }

  /**
   * Execute query using HDC Master Equation + Symbolic Reasoning
   * @param {Statement} statement - Query statement with holes
   * @returns {QueryResult} - includes allResults from HDC and symbolic
   */
  execute(statement) {
    // Step 1: Identify holes and knowns
    const holes = [];
    const knowns = [];
    const operator = this.session.resolve(statement.operator);
    const operatorName = statement.operator?.name || statement.operator?.value;

    for (let i = 0; i < statement.args.length; i++) {
      const arg = statement.args[i];
      if (arg.type === 'Hole') {
        holes.push({ index: i + 1, name: arg.name });
      } else {
        knowns.push({
          index: i + 1,
          name: arg.name || arg.value,
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

    // Step 2: Collect results from multiple sources
    const allResults = [];

    // SOURCE 1: HDC Master Equation (true holographic computing)
    const hdcMatches = this.searchHDC(operatorName, knowns, holes, operator);
    allResults.push(...hdcMatches);
    dbg('HDC', `Found ${hdcMatches.length} HDC matches`);

    // SOURCE 2: Direct KB matches (symbolic, exact) - HIGHEST PRIORITY
    const directMatches = this.searchKBDirect(operatorName, knowns, holes);
    // Replace HDC duplicates with direct (direct is more reliable)
    for (const dm of directMatches) {
      const existingIdx = allResults.findIndex(r =>
        this.sameBindings(r.bindings, dm.bindings, holes)
      );
      if (existingIdx >= 0) {
        // Replace HDC with direct if direct has higher priority
        if (allResults[existingIdx].method === 'hdc') {
          allResults[existingIdx] = dm;
        }
      } else {
        allResults.push(dm);
      }
    }
    dbg('DIRECT', `Found ${directMatches.length} direct matches`);

    // SOURCE 3: Transitive reasoning (for isA, locatedIn, partOf, etc.)
    // Now supports 1 or 2 holes
    if (TRANSITIVE_RELATIONS.has(operatorName) && holes.length <= 2) {
      const transitiveMatches = this.searchTransitive(operatorName, knowns, holes);
      // Replace HDC duplicates with transitive (transitive is more reliable)
      for (const tm of transitiveMatches) {
        const existingIdx = allResults.findIndex(r =>
          this.sameBindings(r.bindings, tm.bindings, holes)
        );
        if (existingIdx >= 0) {
          // Replace HDC with transitive
          if (allResults[existingIdx].method === 'hdc') {
            allResults[existingIdx] = tm;
          }
        } else {
          allResults.push(tm);
        }
      }
      dbg('TRANS', `Found ${transitiveMatches.length} transitive matches`);
    }

    // Source 3: Rule-derived results
    const ruleMatches = this.searchViaRules(operatorName, knowns, holes);
    for (const rm of ruleMatches) {
      const exists = allResults.some(r =>
        r.bindings.get(holes[0]?.name)?.answer === rm.bindings.get(holes[0]?.name)?.answer
      );
      if (!exists) {
        allResults.push(rm);
      }
    }
    dbg('RULES', `Found ${ruleMatches.length} rule-derived matches`);

    // Filter out type classes for modal operators (can, must, cannot)
    // Only apply to operators where we expect individual entities, not type classes
    const modalOps = new Set(['can', 'must', 'cannot', 'hasStatus']);
    const filteredResults = allResults.filter(result => {
      if (!modalOps.has(operatorName)) return true;
      for (const [holeName, binding] of result.bindings) {
        const value = binding.answer;
        // Check if this is a type class (has sub-types)
        if (this.isTypeClass(value)) {
          dbg('FILTER', `Excluding type class from modal: ${value}`);
          return false;
        }
      }
      return true;
    });

    // Also filter negated facts for rule_derived and hdc
    const nonNegatedResults = filteredResults.filter(result => {
      const args = [];
      for (const [holeName, binding] of result.bindings) {
        args.push(binding.answer);
      }
      // Add knowns
      for (const known of knowns) {
        args[known.index - 1] = known.name;
      }
      if (this.isFactNegated(operatorName, args)) {
        dbg('FILTER', `Excluding negated: ${operatorName} ${args.join(' ')}`);
        return false;
      }
      return true;
    });

    // Sort by: 1) method priority (direct > transitive > hdc > rule), 2) score
    const methodPriority = { direct: 4, transitive: 3, rule_derived: 2, hdc: 1 };
    nonNegatedResults.sort((a, b) => {
      const pa = methodPriority[a.method] || 0;
      const pb = methodPriority[b.method] || 0;
      if (pa !== pb) return pb - pa; // Higher priority first
      return b.score - a.score; // Then by score
    });
    const allResults2 = nonNegatedResults;

    // Build primary bindings from best result
    const bindings = new Map();

    if (allResults2.length > 0) {
      const best = allResults2[0];
      for (const [holeName, binding] of best.bindings) {
        const alternatives = allResults2.slice(1)
          .map(r => r.bindings.get(holeName))
          .filter(b => b && b.answer !== binding.answer)
          .slice(0, 3)
          .map(b => ({ value: b.answer, similarity: b.similarity }));

        bindings.set(holeName, {
          answer: binding.answer,
          similarity: binding.similarity,
          alternatives,
          method: binding.method || 'direct'
        });
      }
    }

    const confidence = allResults2.length > 0 ? allResults2[0].score : 0;
    const ambiguous = allResults2.length > 1 &&
                      (allResults2[0].score - allResults2[1].score) < 0.1;

    return {
      success: allResults2.length > 0,
      bindings,
      confidence,
      ambiguous,
      allResults: allResults2
    };
  }

  /**
   * Check if a name is a type class (has sub-types)
   */
  isTypeClass(name) {
    for (const fact of this.session.kbFacts) {
      const meta = fact.metadata;
      if (meta?.operator === 'isA' && meta.args?.[1] === name) {
        return true;
      }
    }
    return false;
  }

  /**
   * Compare if two binding maps have same answers for all holes
   */
  sameBindings(bindings1, bindings2, holes) {
    for (const hole of holes) {
      const a1 = bindings1.get(hole.name)?.answer;
      const a2 = bindings2.get(hole.name)?.answer;
      if (a1 !== a2) return false;
    }
    return true;
  }

  /**
   * Reserved words to filter from HDC results
   */
  static RESERVED = new Set([
    'Implies', 'And', 'Or', 'Not', 'ForAll', 'Exists',
    'True', 'False', 'can', 'cannot', 'must', 'has', 'isA',
    'hasProperty', 'locatedIn', 'partOf', 'before', 'after',
    'causes', 'enables', 'prevents', '__Relation', '__Role',
    'Pay', 'Fly', 'Run', 'Swim',  // Skip action verbs as subjects
    // Common object nouns that shouldn't be subjects
    'Violations', 'License', 'Motive', 'Opportunity', 'Means',
    'Cash', 'Card', 'Crypto', 'Nothing', 'ID', 'Passport',
    'Fever', 'Cough', 'Educated', 'Caring', 'GoodDriver'
  ]);

  /**
   * Check if a name is a valid entity (not reserved/internal)
   */
  isValidEntity(name) {
    if (!name || typeof name !== 'string') return false;
    if (name.startsWith('_') || name.startsWith('?')) return false;
    if (name.startsWith('$') || name.startsWith('@')) return false;
    if (name.match(/^[a-z]+$/)) return false; // lowercase only = operator
    if (QueryEngine.RESERVED.has(name)) return false;
    return true;
  }

  /**
   * Verify HDC candidate can be proved or exists in KB
   * @param {string} operatorName - Operator
   * @param {Array} knowns - Known arguments
   * @param {string} holeName - Hole position name
   * @param {string} candidate - Candidate value
   * @param {number} holeIndex - Hole position (1-based)
   * @returns {boolean} True if verifiable
   */
  verifyHDCCandidate(operatorName, knowns, candidate, holeIndex) {
    // Build args array with candidate in hole position
    const args = [];
    const totalArgs = Math.max(holeIndex, ...knowns.map(k => k.index));

    for (let i = 1; i <= totalArgs; i++) {
      if (i === holeIndex) {
        args.push(candidate);
      } else {
        const known = knowns.find(k => k.index === i);
        args.push(known?.name || null);
      }
    }

    // Check if this exact fact exists in KB
    for (const fact of this.session.kbFacts) {
      const meta = fact.metadata;
      if (!meta || meta.operator !== operatorName) continue;
      if (!meta.args || meta.args.length !== args.length) continue;

      let match = true;
      for (let i = 0; i < args.length; i++) {
        if (args[i] !== null && meta.args[i] !== args[i]) {
          match = false;
          break;
        }
      }
      if (match) return true;
    }

    // For "can" operator, check if derivable via rules (entity must be right type)
    if (operatorName === 'can' || operatorName === 'must') {
      // Candidate should be something that has isA relations (a named entity)
      for (const fact of this.session.kbFacts) {
        const meta = fact.metadata;
        if (meta?.operator === 'isA' && meta.args?.[0] === candidate) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * HDC Master Equation search: Answer = KB ⊕ Query⁻¹
   * Results are filtered and verified.
   */
  searchHDC(operatorName, knowns, holes, operatorVec) {
    const results = [];

    if (this.session.kbFacts.length === 0) return results;

    // Build partial vector (everything except holes)
    let partial = operatorVec;
    for (const known of knowns) {
      const posVec = getPositionVector(known.index, this.session.geometry);
      partial = bind(partial, bind(known.vector, posVec));
    }

    // Bundle all KB facts into single KB vector
    const factVectors = this.session.kbFacts.map(f => f.vector).filter(v => v);
    if (factVectors.length === 0) return results;

    const kbBundle = bundle(factVectors);

    // Master Equation: Answer = KB ⊕ Query⁻¹ (for XOR: unbind = bind)
    const answer = unbind(kbBundle, partial);

    // For single hole - extract directly
    if (holes.length === 1) {
      const hole = holes[0];
      const posVec = getPositionVector(hole.index, this.session.geometry);
      const candidate = unbind(answer, posVec);

      // Find top K matches in vocabulary
      const matches = topKSimilar(candidate, this.session.vocabulary.atoms, 15);

      for (const match of matches) {
        // Higher threshold, filter invalid entities, and verify candidate
        if (match.similarity > 0.5 && this.isValidEntity(match.name)) {
          // Verify the candidate actually makes sense
          if (!this.verifyHDCCandidate(operatorName, knowns, match.name, hole.index)) {
            dbg('HDC', `Rejecting unverifiable candidate: ${match.name}`);
            continue;
          }

          const factBindings = new Map();
          factBindings.set(hole.name, {
            answer: match.name,
            similarity: match.similarity,
            method: 'hdc'
          });

          results.push({
            bindings: factBindings,
            score: match.similarity,
            method: 'hdc'
          });
        }
      }
    }

    // For multiple holes - extract each
    if (holes.length >= 2) {
      // For each combination of top candidates per hole
      const holeCandidates = [];
      for (const hole of holes) {
        const posVec = getPositionVector(hole.index, this.session.geometry);
        const candidate = unbind(answer, posVec);
        const matches = topKSimilar(candidate, this.session.vocabulary.atoms, 5);
        holeCandidates.push({
          hole,
          matches: matches.filter(m => m.similarity > 0.25)
        });
      }

      // Generate combinations (limit to avoid explosion)
      const combinations = this.generateCombinations(holeCandidates, 20);
      for (const combo of combinations) {
        const factBindings = new Map();
        let totalScore = 0;
        let validCombo = true;

        for (const { hole, match } of combo) {
          if (!match) {
            validCombo = false;
            break;
          }
          factBindings.set(hole.name, {
            answer: match.name,
            similarity: match.similarity,
            method: 'hdc'
          });
          totalScore += match.similarity;
        }

        if (validCombo) {
          results.push({
            bindings: factBindings,
            score: totalScore / combo.length,
            method: 'hdc'
          });
        }
      }
    }

    return results;
  }

  /**
   * Generate limited combinations of candidates for multiple holes
   */
  generateCombinations(holeCandidates, limit) {
    if (holeCandidates.length === 0) return [];
    if (holeCandidates.length === 1) {
      return holeCandidates[0].matches.slice(0, limit).map(m => [
        { hole: holeCandidates[0].hole, match: m }
      ]);
    }

    const combinations = [];
    const first = holeCandidates[0];
    const rest = holeCandidates.slice(1);
    const restCombos = this.generateCombinations(rest, Math.ceil(limit / Math.max(1, first.matches.length)));

    for (const match of first.matches.slice(0, 5)) {
      for (const restCombo of restCombos) {
        if (combinations.length >= limit) break;
        combinations.push([{ hole: first.hole, match }, ...restCombo]);
      }
      if (combinations.length >= limit) break;
    }

    return combinations;
  }

  /**
   * Search KB directly for matches (symbolic, exact)
   */
  searchKBDirect(operatorName, knowns, holes) {
    const results = [];

    for (const fact of this.session.kbFacts) {
      const meta = fact.metadata;
      if (!meta || meta.operator !== operatorName) continue;
      if (!meta.args) continue;

      // Check if knowns match
      let matches = true;
      for (const known of knowns) {
        const argIndex = known.index - 1;
        if (meta.args[argIndex] !== known.name) {
          matches = false;
          break;
        }
      }

      if (matches) {
        const factBindings = new Map();
        for (const hole of holes) {
          const argIndex = hole.index - 1;
          if (meta.args[argIndex]) {
            factBindings.set(hole.name, {
              answer: meta.args[argIndex],
              similarity: 0.95,
              method: 'direct'
            });
          }
        }

        if (factBindings.size === holes.length) {
          results.push({
            bindings: factBindings,
            score: 0.95,
            factName: fact.name,
            method: 'direct'
          });
        }
      }
    }

    return results;
  }

  /**
   * Search via transitive reasoning
   * Handles 1, 2, or more holes
   */
  searchTransitive(operatorName, knowns, holes) {
    const results = [];

    // Case 1: "isA Subject ?var" - find all transitive targets (1 hole, subject known)
    if (holes.length === 1 && knowns.length === 1 && knowns[0].index === 1) {
      const subject = knowns[0].name;
      const targets = this.findAllTransitiveTargets(operatorName, subject);

      for (const target of targets) {
        const factBindings = new Map();
        factBindings.set(holes[0].name, {
          answer: target.value,
          similarity: 0.9 - (target.depth * 0.05),
          method: 'transitive',
          steps: target.steps
        });

        results.push({
          bindings: factBindings,
          score: 0.9 - (target.depth * 0.05),
          method: 'transitive',
          depth: target.depth
        });
      }
    }

    // Case 2: "isA ?var Target" - find all subjects (1 hole, target known)
    if (holes.length === 1 && knowns.length === 1 && knowns[0].index === 2) {
      const target = knowns[0].name;
      const subjects = this.findAllTransitiveSources(operatorName, target);

      for (const subject of subjects) {
        const factBindings = new Map();
        factBindings.set(holes[0].name, {
          answer: subject.value,
          similarity: 0.9 - (subject.depth * 0.05),
          method: 'transitive',
          steps: subject.steps
        });

        results.push({
          bindings: factBindings,
          score: 0.9 - (subject.depth * 0.05),
          method: 'transitive',
          depth: subject.depth
        });
      }
    }

    // Case 3: "isA ?x ?y" - find ALL transitive pairs (2 holes, nothing known)
    if (holes.length === 2 && knowns.length === 0) {
      const hole1 = holes.find(h => h.index === 1);
      const hole2 = holes.find(h => h.index === 2);
      if (hole1 && hole2) {
        const pairs = this.findAllTransitivePairs(operatorName);
        for (const pair of pairs) {
          const factBindings = new Map();
          factBindings.set(hole1.name, {
            answer: pair.subject,
            similarity: 0.85 - (pair.depth * 0.05),
            method: 'transitive'
          });
          factBindings.set(hole2.name, {
            answer: pair.target,
            similarity: 0.85 - (pair.depth * 0.05),
            method: 'transitive'
          });

          results.push({
            bindings: factBindings,
            score: 0.85 - (pair.depth * 0.05),
            method: 'transitive',
            depth: pair.depth
          });
        }
      }
    }

    return results;
  }

  /**
   * Find all transitive pairs (subject, target) for a relation
   */
  findAllTransitivePairs(relation) {
    const pairs = [];
    const visited = new Set();

    // Start from all subjects
    const allSubjects = new Set();
    for (const fact of this.session.kbFacts) {
      const meta = fact.metadata;
      if (meta?.operator === relation && meta.args) {
        allSubjects.add(meta.args[0]);
      }
    }

    // For each subject, find all transitive targets
    for (const subject of allSubjects) {
      const targets = this.findAllTransitiveTargets(relation, subject);
      for (const target of targets) {
        const key = `${subject}:${target.value}`;
        if (!visited.has(key)) {
          visited.add(key);
          pairs.push({
            subject,
            target: target.value,
            depth: target.depth,
            steps: target.steps
          });
        }
      }
    }

    return pairs;
  }

  /**
   * Find all transitive targets for a subject
   */
  findAllTransitiveTargets(relation, subject) {
    const targets = [];
    const visited = new Set();
    const queue = [{ value: subject, depth: 0, steps: [] }];

    while (queue.length > 0) {
      const { value: current, depth, steps } = queue.shift();

      if (visited.has(current)) continue;
      visited.add(current);

      // Find direct relations
      for (const fact of this.session.kbFacts) {
        const meta = fact.metadata;
        if (!meta || meta.operator !== relation) continue;
        if (!meta.args || meta.args[0] !== current) continue;

        const target = meta.args[1];
        if (!visited.has(target)) {
          const newSteps = [...steps, `${relation} ${current} ${target}`];
          targets.push({ value: target, depth: depth + 1, steps: newSteps });
          queue.push({ value: target, depth: depth + 1, steps: newSteps });
        }
      }
    }

    return targets;
  }

  /**
   * Find all subjects that have transitive relation to target
   */
  findAllTransitiveSources(relation, target) {
    const sources = [];
    const visited = new Set();

    // Build reverse graph first
    const reverseEdges = new Map(); // target -> [sources]
    for (const fact of this.session.kbFacts) {
      const meta = fact.metadata;
      if (!meta || meta.operator !== relation) continue;
      if (!meta.args) continue;

      const src = meta.args[0];
      const tgt = meta.args[1];
      if (!reverseEdges.has(tgt)) {
        reverseEdges.set(tgt, []);
      }
      reverseEdges.get(tgt).push(src);
    }

    // BFS from target backwards
    const queue = [{ value: target, depth: 0, steps: [] }];

    while (queue.length > 0) {
      const { value: current, depth, steps } = queue.shift();

      const srcs = reverseEdges.get(current) || [];
      for (const src of srcs) {
        if (!visited.has(src)) {
          visited.add(src);
          const newSteps = [`${relation} ${src} ${current}`, ...steps];
          sources.push({ value: src, depth: depth + 1, steps: newSteps });
          queue.push({ value: src, depth: depth + 1, steps: newSteps });
        }
      }
    }

    return sources;
  }

  /**
   * Search via rule derivations
   */
  searchViaRules(operatorName, knowns, holes) {
    const results = [];

    // Try each rule whose conclusion matches our query operator
    for (const rule of this.session.rules) {
      if (!rule.hasVariables || !rule.conclusionAST) continue;

      const concOp = this.extractOperator(rule.conclusionAST);
      if (concOp !== operatorName) continue;

      const concArgs = this.extractArgs(rule.conclusionAST);
      if (concArgs.length !== knowns.length + holes.length) continue;

      // Try to unify known arguments
      const bindings = new Map();
      let unifyOk = true;

      for (const known of knowns) {
        const argIndex = known.index - 1;
        const concArg = concArgs[argIndex];
        if (concArg?.isVariable) {
          bindings.set(concArg.name, known.name);
        } else if (concArg?.name !== known.name) {
          unifyOk = false;
          break;
        }
      }

      if (!unifyOk) continue;

      // Try to find values for holes by proving conditions
      const holeVarNames = [];
      for (const hole of holes) {
        const argIndex = hole.index - 1;
        const concArg = concArgs[argIndex];
        if (concArg?.isVariable) {
          holeVarNames.push({ holeName: hole.name, varName: concArg.name });
        }
      }

      // Try proving the rule's condition with various substitutions
      const conditionMatches = this.findConditionMatches(rule, bindings);

      for (const cm of conditionMatches) {
        const factBindings = new Map();
        let valid = true;

        for (const { holeName, varName } of holeVarNames) {
          const value = cm.get(varName);
          if (value) {
            factBindings.set(holeName, {
              answer: value,
              similarity: 0.85,
              method: 'rule_derived'
            });
          } else {
            valid = false;
            break;
          }
        }

        if (valid && factBindings.size === holes.length) {
          // Check if this derived fact is negated
          const args = [];
          for (const concArg of concArgs) {
            if (concArg.isVariable) {
              args.push(cm.get(concArg.name));
            } else {
              args.push(concArg.name);
            }
          }

          if (this.isFactNegated(operatorName, args)) {
            dbg('RULES', `Skipping negated: ${operatorName} ${args.join(' ')}`);
            continue;
          }

          results.push({
            bindings: factBindings,
            score: 0.85,
            method: 'rule_derived',
            rule: rule.name
          });
        }
      }
    }

    return results;
  }

  /**
   * Check if a fact is explicitly negated in KB
   * @param {string} operator - Fact operator
   * @param {Array} args - Fact arguments
   * @returns {boolean} True if negated
   */
  isFactNegated(operator, args) {
    for (const fact of this.session.kbFacts) {
      const meta = fact.metadata;
      if (meta?.operator !== 'Not') continue;

      // Get the reference that Not is applied to
      const refName = meta.args?.[0]?.replace('$', '');
      if (!refName) continue;

      // Look up what that reference points to
      const refText = this.session.referenceTexts?.get(refName);
      if (!refText) continue;

      // Check if it matches our fact
      const expectedText = `${operator} ${args.join(' ')}`;
      if (refText === expectedText) {
        return true;
      }
    }
    return false;
  }

  /**
   * Find all condition matches for a rule
   * Enhanced to handle compound Or/And conditions and transitive relations
   */
  findConditionMatches(rule, initialBindings) {
    // Use conditionParts if available (handles compound conditions)
    if (rule.conditionParts) {
      return this.findCompoundMatches(rule.conditionParts, initialBindings);
    }

    // Simple condition - use conditionAST
    const condAST = rule.conditionAST;
    if (!condAST) return [];

    return this.findLeafConditionMatches(condAST, initialBindings);
  }

  /**
   * Recursively find matches for compound condition structures (Or/And/leaf)
   */
  findCompoundMatches(condPart, initialBindings) {
    const addedBindings = new Set();
    const addMatch = (matches, binding) => {
      const key = [...binding.entries()].sort().map(([k, v]) => `${k}=${v}`).join(',');
      if (!addedBindings.has(key)) {
        addedBindings.add(key);
        matches.push(binding);
      }
    };

    // Leaf node - find direct matches
    if (condPart.type === 'leaf' && condPart.ast) {
      return this.findLeafConditionMatches(condPart.ast, initialBindings);
    }

    // Or node - union all matches from all branches (recursive)
    if (condPart.type === 'Or' && condPart.parts) {
      const matches = [];
      for (const part of condPart.parts) {
        const branchMatches = this.findCompoundMatches(part, initialBindings);
        for (const binding of branchMatches) {
          addMatch(matches, binding);
        }
      }
      return matches;
    }

    // And node - intersection of all branches (recursive)
    if (condPart.type === 'And' && condPart.parts) {
      let candidateBindings = null;

      for (const part of condPart.parts) {
        const branchMatches = this.findCompoundMatches(part, initialBindings);

        if (candidateBindings === null) {
          candidateBindings = branchMatches;
        } else {
          // Intersect: keep only bindings compatible with branch
          candidateBindings = candidateBindings.filter(cb => {
            return branchMatches.some(bm => this.bindingsCompatible(cb, bm));
          });
        }
      }

      return candidateBindings || [];
    }

    return [];
  }

  /**
   * Check if two binding maps are compatible (same values for shared keys)
   */
  bindingsCompatible(bindings1, bindings2) {
    for (const [key, val1] of bindings1) {
      if (bindings2.has(key) && bindings2.get(key) !== val1) {
        return false;
      }
    }
    return true;
  }

  /**
   * Find matches for a single (leaf) condition AST
   */
  findLeafConditionMatches(condAST, initialBindings) {
    const matches = [];
    const addedBindings = new Set();

    const condOp = this.extractOperator(condAST);
    const condArgs = this.extractArgs(condAST);

    // Search KB for facts matching condition pattern (direct matches)
    for (const fact of this.session.kbFacts) {
      const meta = fact.metadata;
      if (!meta || meta.operator !== condOp) continue;
      if (!meta.args || meta.args.length !== condArgs.length) continue;

      const newBindings = new Map(initialBindings);
      let matchOk = true;

      for (let i = 0; i < condArgs.length; i++) {
        const condArg = condArgs[i];
        const factArg = meta.args[i];

        if (condArg?.isVariable) {
          const existing = newBindings.get(condArg.name);
          if (existing && existing !== factArg) {
            matchOk = false;
            break;
          }
          newBindings.set(condArg.name, factArg);
        } else if (condArg?.name !== factArg) {
          matchOk = false;
          break;
        }
      }

      if (matchOk) {
        const key = [...newBindings.entries()].sort().map(([k, v]) => `${k}=${v}`).join(',');
        if (!addedBindings.has(key)) {
          addedBindings.add(key);
          matches.push(newBindings);
        }
      }
    }

    // For transitive relations, also find entities that match via chains
    if (TRANSITIVE_RELATIONS.has(condOp) && condArgs.length === 2) {
      const arg0 = condArgs[0];
      const arg1 = condArgs[1];

      // Case: "isA ?x Target" - find all entities that are transitively Target
      if (arg0?.isVariable && !arg1?.isVariable) {
        const targetValue = arg1.name;
        const checkedEntities = new Set();
        for (const fact of this.session.kbFacts) {
          const meta = fact.metadata;
          if (meta?.operator === condOp && meta.args?.[0]) {
            const entity = meta.args[0];
            if (checkedEntities.has(entity)) continue;
            checkedEntities.add(entity);

            if (this.reachesTransitively(condOp, entity, targetValue)) {
              const newBindings = new Map(initialBindings);
              newBindings.set(arg0.name, entity);
              const key = [...newBindings.entries()].sort().map(([k, v]) => `${k}=${v}`).join(',');
              if (!addedBindings.has(key)) {
                addedBindings.add(key);
                matches.push(newBindings);
              }
            }
          }
        }
      }
    }

    return matches;
  }

  /**
   * Check if entity transitively reaches target via relation
   */
  reachesTransitively(relation, entity, target, visited = new Set()) {
    if (visited.has(entity)) return false;
    visited.add(entity);

    for (const fact of this.session.kbFacts) {
      const meta = fact.metadata;
      if (meta?.operator !== relation) continue;
      if (meta.args?.[0] !== entity) continue;

      const nextValue = meta.args[1];
      if (nextValue === target) return true;
      if (this.reachesTransitively(relation, nextValue, target, visited)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Extract operator from AST
   */
  extractOperator(ast) {
    if (!ast) return null;
    if (ast.operator?.name) return ast.operator.name;
    if (ast.operator?.value) return ast.operator.value;
    if (ast.name) return ast.name;
    return null;
  }

  /**
   * Extract args from AST
   */
  extractArgs(ast) {
    if (!ast?.args) return [];
    return ast.args.map(arg => ({
      name: arg.name || arg.value,
      isVariable: arg.type === 'Variable' || arg.type === 'Hole' || (arg.name && arg.name.startsWith('$'))
    }));
  }

  /**
   * Direct match query (no holes) - existence check
   */
  directMatch(operator, knowns, statement) {
    let queryVec = operator;
    for (const known of knowns) {
      queryVec = bind(queryVec, withPosition(known.index, known.vector));
    }

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
}

export default QueryEngine;
