/**
 * EvalSuite - Test Runner
 * @module evalSuite/lib/runner
 *
 * Executes evaluation cases through NL->DSL, Reasoning, DSL->NL pipeline.
 * Supports actions: learn, query, prove, summarize, elaborate
 */

import { NLTransformer } from '../../src/nlp/transformer.mjs';
import { Session } from '../../src/runtime/session.mjs';

// Timeout for reasoning operations (ms)
const REASONING_TIMEOUT = 5000;

/**
 * @typedef {Object} PhaseResult
 * @property {boolean} passed - Phase passed
 * @property {boolean} skipped - Phase was skipped
 * @property {boolean} timeout - Phase timed out
 * @property {string} [error] - Error message
 * @property {*} [expected] - Expected value
 * @property {*} [actual] - Actual value
 * @property {number} [durationMs] - Execution time
 */

/**
 * @typedef {Object} CaseResult
 * @property {boolean} passed - All required phases passed
 * @property {Object<string, PhaseResult>} phases - Results per phase
 */

/**
 * Create NL transformer instance
 * @returns {NLTransformer}
 */
function createTransformer() {
  return new NLTransformer();
}

/**
 * Create Session instance
 * @returns {Session}
 */
function createSession() {
  return new Session({ geometry: 2048 });
}

/**
 * Run NL to DSL transformation phase
 * @param {Object} testCase - Test case
 * @param {NLTransformer} transformer - Transformer instance
 * @returns {PhaseResult}
 */
function runNlToDsl(testCase, transformer) {
  // If input_dsl is provided, skip NL transformation
  if (testCase.input_dsl) {
    return {
      passed: true,
      skipped: true,
      actual: testCase.input_dsl,
      note: 'Using input_dsl directly'
    };
  }

  if (!testCase.input_nl) {
    return { passed: true, skipped: true };
  }

  const start = Date.now();

  try {
    const result = transformer.transform(testCase.input_nl);

    // NL->DSL passes if we got non-empty DSL without fatal errors
    const hasOutput = result.dsl && result.dsl.trim().length > 0;
    const hasFatalErrors = result.errors.length > 0 && !result.success;

    if (hasFatalErrors || !hasOutput) {
      return {
        passed: false,
        error: result.errors.map(e => e.error).join('; ') || 'Empty DSL output',
        actual: result.dsl,
        durationMs: Date.now() - start
      };
    }

    return {
      passed: true,
      actual: result.dsl,
      parsed: result.parsed,
      durationMs: Date.now() - start
    };

  } catch (err) {
    return {
      passed: false,
      error: err.message,
      durationMs: Date.now() - start
    };
  }
}

/**
 * Run reasoning phase with real Session
 * @param {Object} testCase - Test case
 * @param {string} dsl - DSL to learn (from NL transform or input_dsl)
 * @param {Session} session - Session instance
 * @returns {Promise<PhaseResult>}
 */
async function runReasoning(testCase, dsl, session) {
  const start = Date.now();

  try {
    // Learn setup_dsl first if provided
    if (testCase.setup_dsl) {
      const setupResult = session.learn(testCase.setup_dsl);
      if (!setupResult.success) {
        return {
          passed: false,
          error: `Setup failed: ${setupResult.errors.join('; ')}`,
          durationMs: Date.now() - start
        };
      }
    }

    // Learn the main DSL
    if (dsl) {
      const learnResult = session.learn(dsl);

      // For 'learn' action, this IS the result
      if (testCase.action === 'learn') {
        return validateLearnResult(testCase, learnResult, Date.now() - start);
      }

      if (!learnResult.success) {
        return {
          passed: false,
          error: `Learn failed: ${learnResult.errors.join('; ')}`,
          actual: learnResult,
          durationMs: Date.now() - start
        };
      }
    }

    // No query - just learning
    if (!testCase.query_dsl && testCase.action !== 'query' && testCase.action !== 'prove') {
      return {
        passed: true,
        actual: { learned: true },
        durationMs: Date.now() - start
      };
    }

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), REASONING_TIMEOUT);
    });

    // Execute action
    let result;
    const actionPromise = (async () => {
      switch (testCase.action) {
        case 'query':
          return session.query(testCase.query_dsl);

        case 'prove':
          return session.prove(testCase.query_dsl);

        case 'summarize': {
          // First query, then summarize
          const qResult = session.query(testCase.query_dsl);
          if (!qResult.success) {
            return { success: false, reason: 'Query failed before summarize' };
          }
          // Get the vector and summarize
          const vec = session.scope.get(testCase.query_dsl.match(/@(\w+)/)?.[1] || 'q');
          if (vec) {
            const summary = session.summarize(vec);
            return { success: true, text: summary.text, queryResult: qResult };
          }
          return { success: false, reason: 'No vector to summarize' };
        }

        case 'elaborate': {
          const pResult = session.prove(testCase.query_dsl);
          const elaboration = session.elaborate(pResult);
          return { ...pResult, elaboration: elaboration.text };
        }

        default:
          return session.query(testCase.query_dsl);
      }
    })();

    result = await Promise.race([actionPromise, timeoutPromise]);

    // Validate result
    return validateReasoningResult(testCase, result, Date.now() - start);

  } catch (err) {
    if (err.message === 'TIMEOUT') {
      return {
        passed: false,
        timeout: true,
        durationMs: Date.now() - start
      };
    }

    return {
      passed: false,
      error: err.message,
      durationMs: Date.now() - start
    };
  }
}

/**
 * Validate learn result against expected
 */
function validateLearnResult(testCase, result, durationMs) {
  if (!testCase.expected_result) {
    return {
      passed: result.success,
      actual: result,
      durationMs
    };
  }

  const expected = testCase.expected_result;
  let passed = true;

  // Check success
  if (expected.success !== undefined && result.success !== expected.success) {
    passed = false;
  }

  // Check warnings (if expected)
  if (expected.warnings && Array.isArray(expected.warnings)) {
    const hasExpectedWarnings = expected.warnings.every(w =>
      result.warnings?.some(actual => actual.includes(w))
    );
    if (!hasExpectedWarnings) passed = false;
  }

  return {
    passed,
    expected: testCase.expected_result,
    actual: result,
    durationMs
  };
}

/**
 * Validate reasoning result against expected
 */
function validateReasoningResult(testCase, result, durationMs) {
  if (!testCase.expected_result) {
    // No expected result - just check operation succeeded
    const succeeded = testCase.action === 'prove'
      ? result.valid === true
      : result.success === true;

    return {
      passed: succeeded,
      actual: result,
      durationMs
    };
  }

  const expected = testCase.expected_result;
  let passed = true;

  // Check by type
  if (typeof expected === 'boolean') {
    passed = (result.valid === expected || result.success === expected);
  } else if (typeof expected === 'object') {
    // Check each expected field
    for (const [key, val] of Object.entries(expected)) {
      if (result[key] !== val) {
        passed = false;
        break;
      }
    }
  }

  return {
    passed,
    expected: testCase.expected_result,
    actual: result,
    durationMs
  };
}

/**
 * Generate NL text from query bindings
 * @param {Object} queryResult - Query result with bindings
 * @param {string} queryDsl - Original query DSL
 * @returns {string} Natural language text
 */
function textFromBindings(queryResult, queryDsl) {
  if (!queryResult?.bindings) return '';

  // Parse query to get operator and structure
  const parts = queryDsl.replace(/@\w+\s*/, '').trim().split(/\s+/);
  const operator = parts[0];
  const args = parts.slice(1);

  // Fill holes from bindings
  const filledArgs = args.map(arg => {
    if (arg.startsWith('?')) {
      const holeName = arg.substring(1);
      const binding = queryResult.bindings.get(holeName);
      return binding?.answer || arg;
    }
    return arg;
  });

  // Generate text using common templates
  const templates = {
    isA: (a) => a.length >= 2 ? `${a[0]} is a ${a[1]}` : `${operator}(${a.join(', ')})`,
    love: (a) => a.length >= 2 ? `${a[0]} loves ${a[1]}` : `${operator}(${a.join(', ')})`,
    has: (a) => a.length >= 2 ? `${a[0]} has ${a[1]}` : `${operator}(${a.join(', ')})`,
    hasProperty: (a) => a.length >= 2 ? `${a[0]} is ${a[1]}` : `${operator}(${a.join(', ')})`,
    locatedIn: (a) => a.length >= 2 ? `${a[0]} is in ${a[1]}` : `${operator}(${a.join(', ')})`,
    know: (a) => a.length >= 2 ? `${a[0]} knows ${a[1]}` : `${operator}(${a.join(', ')})`,
    help: (a) => a.length >= 2 ? `${a[0]} helps ${a[1]}` : `${operator}(${a.join(', ')})`,
    see: (a) => a.length >= 2 ? `${a[0]} sees ${a[1]}` : `${operator}(${a.join(', ')})`,
    give: (a) => a.length >= 3 ? `${a[0]} gave ${a[1]} ${a[2]}` : `${operator}(${a.join(', ')})`,
    sell: (a) => a.length >= 2 ? `${a[0]} sells ${a[1]}` : `${operator}(${a.join(', ')})`,
    like: (a) => a.length >= 2 ? `${a[0]} likes ${a[1]}` : `${operator}(${a.join(', ')})`
  };

  if (templates[operator]) {
    return templates[operator](filledArgs);
  }

  // Generic: subject operator object
  if (filledArgs.length >= 2) {
    return `${filledArgs[0]} ${operator} ${filledArgs.slice(1).join(' ')}`;
  }
  return `${operator}(${filledArgs.join(', ')})`;
}

/**
 * Generate NL text from prove result
 * @param {Object} proveResult - Prove result
 * @param {string} queryDsl - Original query DSL
 * @returns {string} Natural language text
 */
function textFromProof(proveResult, queryDsl) {
  if (!proveResult?.valid) {
    return 'Not proven';
  }

  // Parse query to extract structure
  const parts = queryDsl.replace(/@\w+\s*/, '').trim().split(/\s+/);
  const operator = parts[0];
  const args = parts.slice(1).filter(a => !a.startsWith('?'));

  const templates = {
    isA: (a) => a.length >= 2 ? `${a[0]} is a ${a[1]}` : `${a.join(' is ')}`,
    love: (a) => a.length >= 2 ? `${a[0]} loves ${a[1]}` : `${a.join(' loves ')}`,
    has: (a) => a.length >= 2 ? `${a[0]} has ${a[1]}` : `${a.join(' has ')}`,
    hasProperty: (a) => a.length >= 2 ? `${a[0]} is ${a[1]}` : `${a.join(' is ')}`,
    locatedIn: (a) => a.length >= 2 ? `${a[0]} is in ${a[1]}` : `${a.join(' is in ')}`,
    see: (a) => a.length >= 2 ? `${a[0]} sees ${a[1]}` : `${a.join(' sees ')}`
  };

  if (templates[operator]) {
    return templates[operator](args);
  }

  return `${args.join(' ')} (${operator})`;
}

/**
 * Run DSL to NL transformation phase (summarize)
 * @param {Object} testCase - Test case
 * @param {*} reasoningResult - Result from reasoning phase
 * @param {Session} session - Session instance
 * @returns {PhaseResult}
 */
function runDslToNl(testCase, reasoningResult, session) {
  if (!testCase.expected_nl) {
    return { passed: true, skipped: true };
  }

  const start = Date.now();

  try {
    let actualText = '';

    // Get text from reasoning result if available
    if (reasoningResult?.actual?.text) {
      actualText = reasoningResult.actual.text;
    } else if (reasoningResult?.actual?.elaboration) {
      actualText = reasoningResult.actual.elaboration;
    } else if (testCase.action === 'query' && reasoningResult?.actual?.bindings) {
      // Generate text from query bindings
      actualText = textFromBindings(reasoningResult.actual, testCase.query_dsl);
    } else if (testCase.action === 'prove' && reasoningResult?.actual) {
      // Generate text from proof result
      actualText = textFromProof(reasoningResult.actual, testCase.query_dsl);
    } else if (testCase.action === 'learn' && reasoningResult?.actual) {
      // Generate text for learn result
      const result = reasoningResult.actual;
      if (result.success) {
        actualText = `Learned ${result.facts} facts`;
        if (result.warnings?.length > 0) {
          actualText += `. Warnings: ${result.warnings.join(', ')}`;
        }
      } else {
        actualText = `Learn failed: ${result.errors?.join(', ') || 'unknown error'}`;
      }
    }

    if (!actualText) {
      return {
        passed: false,
        error: 'No text generated',
        expected: testCase.expected_nl,
        durationMs: Date.now() - start
      };
    }

    // Fuzzy match: normalize both strings
    const normalize = s => s.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    const normalizedExpected = normalize(testCase.expected_nl);
    const normalizedActual = normalize(actualText);

    // Check if actual contains expected (or vice versa)
    const passed = normalizedActual.includes(normalizedExpected) ||
                   normalizedExpected.includes(normalizedActual) ||
                   normalizedActual === normalizedExpected;

    return {
      passed,
      expected: testCase.expected_nl,
      actual: actualText,
      durationMs: Date.now() - start
    };

  } catch (err) {
    return {
      passed: false,
      error: err.message,
      expected: testCase.expected_nl,
      durationMs: Date.now() - start
    };
  }
}

/**
 * Run a single test case
 * @param {Object} testCase - Test case definition
 * @param {Session} [session] - Session instance (created if not provided)
 * @returns {Promise<CaseResult>}
 */
export async function runCase(testCase, session = null) {
  const transformer = createTransformer();
  const sess = session || createSession();
  const phases = {};

  // Phase 1: NL to DSL (or use input_dsl directly)
  phases.nlToDsl = runNlToDsl(testCase, transformer);

  // Get DSL to use for reasoning
  const dsl = phases.nlToDsl.actual;

  // Phase 2: Reasoning
  phases.reasoning = await runReasoning(testCase, dsl, sess);

  // Phase 3: DSL to NL (summarize/elaborate)
  phases.dslToNl = runDslToNl(testCase, phases.reasoning, sess);

  // Overall pass: all non-skipped phases must pass
  const passed = Object.values(phases).every(p => p.passed || p.skipped);

  return { passed, phases };
}

/**
 * Run all cases in a suite
 * @param {Object} suite - Suite data
 * @returns {Promise<{results: CaseResult[], summary: Object}>}
 */
export async function runSuite(suite) {
  const results = [];

  for (const testCase of suite.cases) {
    // Each case gets a fresh session
    const session = createSession();
    const result = await runCase(testCase, session);
    results.push(result);
  }

  // Calculate summary
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;

  // Partial pass: NL->DSL passed but reasoning failed
  const partialPass = results.filter(r =>
    !r.passed &&
    r.phases.nlToDsl?.passed &&
    !r.phases.nlToDsl?.skipped
  ).length;

  return {
    results,
    summary: {
      total,
      passed,
      failed,
      partialPass
    }
  };
}

export default {
  runCase,
  runSuite
};
