# AGISystem2 - System Specifications

# Chapter 14: Evaluation Suite Framework

**Document Version:** 1.0
**Status:** Draft Specification
**Focus:** Automated Evaluation and Benchmark Suite

---

## 14.1 Purpose

This specification defines an **Evaluation Suite Framework** that provides systematic evaluation of AGISystem2 capabilities. The framework enables:

1. **Natural Language → DSL Transformation Testing** - Validate NLP module accuracy
2. **Reasoning Verification** - Test query and prove operations
3. **End-to-End Pipeline Validation** - Full NL → DSL → Reasoning → NL flow
4. **Regression Detection** - Track capability over time
5. **Visual Reporting** - Color-coded terminal output with pass/fail rates

---

## 14.2 Directory Structure

```
evalSuite/
├── run.js                           # Main runner script
├── lib/
│   ├── runner.mjs                   # Suite execution engine
│   ├── reporter.mjs                 # Terminal reporter with colors
│   └── loader.mjs                   # Suite/case loader
│
├── suite01_basic_facts/
│   ├── cases.mjs                    # Test cases for this suite
│   └── theory.dsl                   # Optional domain theory
│
├── suite02_family_relations/
│   ├── cases.mjs
│   └── theory.dsl
│
├── suite03_rule_reasoning/
│   ├── cases.mjs
│   └── theory.dsl
│
├── suite04_taxonomies/
│   ├── cases.mjs
│   └── theory.dsl
│
└── suite05_negation_logic/
    ├── cases.mjs
    └── theory.dsl
```

---

## 14.3 Test Case Format

### 14.3.1 Case Definition (cases.mjs)

```javascript
/**
 * Suite definition
 */
export default {
  name: 'Suite Name',
  description: 'Suite description',

  // Optional: DSL theory to load before tests
  theory: 'theory.dsl',  // or null if inline

  // Test cases
  cases: [
    {
      id: 'case_01',
      description: 'Test description',

      // Input: Natural language (English)
      input_nl: 'John loves Mary.',

      // Expected DSL output (for NL→DSL validation)
      expected_dsl: '@f1 love John Mary',

      // Action to perform
      action: 'learn',  // 'learn' | 'query' | 'prove'

      // For query/prove: the query to execute
      query_dsl: null,  // e.g., '@q love ?who Mary'

      // Expected result (for query/prove)
      expected_result: null,  // e.g., { who: 'John' }

      // Expected natural language output
      result_nl: null,  // e.g., 'John loves Mary'

      // Timeout in ms
      timeout: 5000
    },
    // ... more cases
  ]
};
```

### 14.3.2 Action Types

| Action | Description | Input | Output |
|--------|-------------|-------|--------|
| `learn` | Add facts to KB | NL sentence | DSL transformation |
| `query` | Query the KB | DSL query | Bindings + NL result |
| `prove` | Prove a goal | DSL goal | Proof + NL explanation |

---

## 14.4 Evaluation Metrics

### 14.4.1 Per-Case Metrics

| Metric | Description | Status |
|--------|-------------|--------|
| `nl_to_dsl` | NL correctly transformed to DSL | PASS/FAIL/SKIP |
| `reasoning` | Query/prove returned correct result | PASS/FAIL/TIMEOUT |
| `dsl_to_nl` | Result correctly phrased in NL | PASS/FAIL/SKIP |

### 14.4.2 Suite Summary

```
Suite: basic_facts (10 cases)
┌────────┬─────────────┬───────────┬───────────┐
│ Case   │ NL→DSL      │ Reasoning │ DSL→NL    │
├────────┼─────────────┼───────────┼───────────┤
│ case_01│ ✓ PASS      │ ✓ PASS    │ ✓ PASS    │
│ case_02│ ✓ PASS      │ ✓ PASS    │ ✓ PASS    │
│ case_03│ ✗ FAIL      │ - SKIP    │ - SKIP    │
│ case_04│ ✓ PASS      │ ⏱ TIMEOUT │ - SKIP    │
│ ...    │             │           │           │
└────────┴─────────────┴───────────┴───────────┘

Summary: 7/10 NL→DSL, 6/10 Reasoning, 5/10 DSL→NL
Overall: 60% pass rate
```

---

## 14.5 Runner Implementation

### 14.5.1 run.js Entry Point

```javascript
#!/usr/bin/env node

import { runAllSuites } from './lib/runner.mjs';
import { Reporter } from './lib/reporter.mjs';

async function main() {
  const reporter = new Reporter();

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('              AGISystem2 Evaluation Suite');
  console.log('═══════════════════════════════════════════════════════\n');

  const results = await runAllSuites({
    suiteDir: import.meta.dirname,
    reporter,
    timeout: 10000  // Default timeout per case
  });

  reporter.printFinalSummary(results);

  // Exit code based on pass rate
  const passRate = results.totalPassed / results.totalCases;
  process.exit(passRate >= 0.8 ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
```

### 14.5.2 Runner Engine

```javascript
import { Session } from '../../src/runtime/session.mjs';
import { NLTransformer } from '../../src/nlp/index.mjs';
import { loadSuites } from './loader.mjs';

export async function runAllSuites(options) {
  const { suiteDir, reporter, timeout } = options;
  const suites = await loadSuites(suiteDir);

  const results = {
    suites: [],
    totalCases: 0,
    totalPassed: 0
  };

  for (const suite of suites) {
    const suiteResult = await runSuite(suite, { reporter, timeout });
    results.suites.push(suiteResult);
    results.totalCases += suiteResult.cases.length;
    results.totalPassed += suiteResult.passed;
  }

  return results;
}

async function runSuite(suite, options) {
  const { reporter, timeout } = options;

  reporter.suiteStart(suite.name, suite.cases.length);

  // Create fresh session for each suite
  const session = new Session({ geometry: 4096 });
  const transformer = new NLTransformer();

  // Load theory if provided
  if (suite.theory) {
    session.learn(suite.theory);
  }

  const caseResults = [];
  let passed = 0;

  for (const testCase of suite.cases) {
    const result = await runCase(testCase, { session, transformer, timeout });
    caseResults.push(result);

    if (result.overall === 'PASS') passed++;

    reporter.caseResult(result);
  }

  session.close();

  reporter.suiteEnd(suite.name, passed, suite.cases.length);

  return {
    name: suite.name,
    cases: caseResults,
    passed,
    total: suite.cases.length
  };
}

async function runCase(testCase, options) {
  const { session, transformer, timeout } = options;

  const result = {
    id: testCase.id,
    description: testCase.description,
    nl_to_dsl: 'SKIP',
    reasoning: 'SKIP',
    dsl_to_nl: 'SKIP',
    overall: 'SKIP',
    details: {}
  };

  try {
    // Step 1: NL → DSL transformation
    if (testCase.input_nl) {
      const transformResult = await withTimeout(
        () => transformer.transform(testCase.input_nl),
        timeout
      );

      result.details.transformed_dsl = transformResult.dsl;

      if (testCase.expected_dsl) {
        result.nl_to_dsl = dslMatches(transformResult.dsl, testCase.expected_dsl)
          ? 'PASS' : 'FAIL';
      }

      // Learn the transformed DSL
      if (testCase.action === 'learn' && transformResult.success) {
        session.learn(transformResult.dsl);
      }
    }

    // Step 2: Reasoning (query or prove)
    if (testCase.action === 'query' && testCase.query_dsl) {
      const queryResult = await withTimeout(
        () => session.query(testCase.query_dsl),
        timeout
      );

      result.details.query_result = queryResult;

      if (testCase.expected_result) {
        result.reasoning = resultMatches(queryResult, testCase.expected_result)
          ? 'PASS' : 'FAIL';
      }
    }

    if (testCase.action === 'prove' && testCase.query_dsl) {
      const proveResult = await withTimeout(
        () => session.prove(testCase.query_dsl),
        timeout
      );

      result.details.prove_result = proveResult;

      if (testCase.expected_result !== undefined) {
        result.reasoning = proveResult.valid === testCase.expected_result
          ? 'PASS' : 'FAIL';
      }
    }

    // Step 3: DSL → NL (summarize)
    if (testCase.result_nl && result.details.query_result) {
      const summary = session.summarize(result.details.query_result.vector);
      result.details.summary = summary;

      result.dsl_to_nl = textMatches(summary.text, testCase.result_nl)
        ? 'PASS' : 'FAIL';
    }

  } catch (err) {
    if (err.message === 'TIMEOUT') {
      result.reasoning = 'TIMEOUT';
    } else {
      result.overall = 'ERROR';
      result.details.error = err.message;
    }
  }

  // Calculate overall
  result.overall = calculateOverall(result);

  return result;
}

function calculateOverall(result) {
  const metrics = [result.nl_to_dsl, result.reasoning, result.dsl_to_nl];
  const active = metrics.filter(m => m !== 'SKIP');

  if (active.length === 0) return 'SKIP';
  if (active.some(m => m === 'FAIL' || m === 'ERROR')) return 'FAIL';
  if (active.some(m => m === 'TIMEOUT')) return 'TIMEOUT';
  return 'PASS';
}

async function withTimeout(fn, ms) {
  return Promise.race([
    fn(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), ms)
    )
  ]);
}

function dslMatches(actual, expected) {
  // Normalize and compare DSL
  const normActual = actual.replace(/\s+/g, ' ').trim().toLowerCase();
  const normExpected = expected.replace(/\s+/g, ' ').trim().toLowerCase();

  // Check if key elements match
  const actualParts = normActual.split(/\s+/).filter(p => !p.startsWith('@'));
  const expectedParts = normExpected.split(/\s+/).filter(p => !p.startsWith('@'));

  return actualParts.join(' ') === expectedParts.join(' ');
}

function resultMatches(result, expected) {
  if (!result.success) return false;

  for (const [key, value] of Object.entries(expected)) {
    const binding = result.bindings?.get?.(key) || result.bindings?.[key];
    if (!binding || binding.answer !== value) return false;
  }
  return true;
}

function textMatches(actual, expected) {
  const normActual = actual.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const normExpected = expected.toLowerCase().replace(/[^a-z0-9\s]/g, '');

  return normActual.includes(normExpected) || normExpected.includes(normActual);
}
```

### 14.5.3 Reporter

```javascript
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

export class Reporter {
  constructor() {
    this.startTime = Date.now();
  }

  suiteStart(name, caseCount) {
    console.log(`\n${COLORS.cyan}▶ ${COLORS.bright}${name}${COLORS.reset} (${caseCount} cases)`);
    console.log('┌────────────┬─────────────┬─────────────┬─────────────┐');
    console.log('│ Case       │ NL→DSL      │ Reasoning   │ DSL→NL      │');
    console.log('├────────────┼─────────────┼─────────────┼─────────────┤');
  }

  caseResult(result) {
    const id = result.id.padEnd(10).slice(0, 10);
    const nl2dsl = this.formatStatus(result.nl_to_dsl);
    const reasoning = this.formatStatus(result.reasoning);
    const dsl2nl = this.formatStatus(result.dsl_to_nl);

    console.log(`│ ${id} │ ${nl2dsl} │ ${reasoning} │ ${dsl2nl} │`);
  }

  suiteEnd(name, passed, total) {
    console.log('└────────────┴─────────────┴─────────────┴─────────────┘');

    const rate = Math.round((passed / total) * 100);
    const color = rate >= 80 ? COLORS.green : rate >= 50 ? COLORS.yellow : COLORS.red;

    console.log(`${color}Summary: ${passed}/${total} passed (${rate}%)${COLORS.reset}`);
  }

  printFinalSummary(results) {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2);

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('                    FINAL SUMMARY');
    console.log('═══════════════════════════════════════════════════════\n');

    for (const suite of results.suites) {
      const rate = Math.round((suite.passed / suite.total) * 100);
      const bar = this.progressBar(rate);
      console.log(`${suite.name.padEnd(25)} ${bar} ${rate}%`);
    }

    const totalRate = Math.round((results.totalPassed / results.totalCases) * 100);
    const color = totalRate >= 80 ? COLORS.green : totalRate >= 50 ? COLORS.yellow : COLORS.red;

    console.log('\n───────────────────────────────────────────────────────');
    console.log(`${color}${COLORS.bright}TOTAL: ${results.totalPassed}/${results.totalCases} (${totalRate}%)${COLORS.reset}`);
    console.log(`Time: ${elapsed}s`);
    console.log('═══════════════════════════════════════════════════════\n');
  }

  formatStatus(status) {
    const text = status.padEnd(9);
    switch (status) {
      case 'PASS':
        return `${COLORS.green}✓ ${text}${COLORS.reset}`;
      case 'FAIL':
        return `${COLORS.red}✗ ${text}${COLORS.reset}`;
      case 'TIMEOUT':
        return `${COLORS.yellow}⏱ ${text}${COLORS.reset}`;
      case 'SKIP':
        return `${COLORS.gray}- ${text}${COLORS.reset}`;
      default:
        return `${COLORS.gray}? ${text}${COLORS.reset}`;
    }
  }

  progressBar(percent) {
    const width = 20;
    const filled = Math.round(width * percent / 100);
    const empty = width - filled;

    const color = percent >= 80 ? COLORS.green : percent >= 50 ? COLORS.yellow : COLORS.red;

    return `${color}${'█'.repeat(filled)}${COLORS.gray}${'░'.repeat(empty)}${COLORS.reset}`;
  }
}
```

---

## 14.6 Example Suites

### 14.6.1 Suite 01: Basic Facts

Tests simple fact encoding and retrieval.

```javascript
// suite01_basic_facts/cases.mjs
export default {
  name: 'Basic Facts',
  description: 'Simple fact encoding and retrieval',
  theory: null,

  cases: [
    {
      id: 'bf_01',
      description: 'Simple love relation',
      input_nl: 'John loves Mary.',
      expected_dsl: 'love John Mary',
      action: 'learn',
      query_dsl: '@q love ?who Mary',
      expected_result: { who: 'John' },
      result_nl: 'John loves Mary'
    },
    // ... 9 more cases
  ]
};
```

### 14.6.2 Suite 02: Family Relations

Tests family relationship inference.

### 14.6.3 Suite 03: Rule Reasoning

Tests rule-based deduction (forward/backward chaining).

### 14.6.4 Suite 04: Taxonomies

Tests IS-A hierarchies and category membership.

### 14.6.5 Suite 05: Negation and Logic

Tests logical operators (Not, And, Or).

---

## 14.7 Running the Suite

```bash
# From project root
node evalSuite/run.js

# Expected output:
═══════════════════════════════════════════════════════
              AGISystem2 Evaluation Suite
═══════════════════════════════════════════════════════

▶ Basic Facts (10 cases)
┌────────────┬─────────────┬─────────────┬─────────────┐
│ Case       │ NL→DSL      │ Reasoning   │ DSL→NL      │
├────────────┼─────────────┼─────────────┼─────────────┤
│ bf_01      │ ✓ PASS      │ ✓ PASS      │ ✓ PASS      │
│ bf_02      │ ✓ PASS      │ ✓ PASS      │ ✓ PASS      │
│ ...        │             │             │             │
└────────────┴─────────────┴─────────────┴─────────────┘
Summary: 10/10 passed (100%)

...

═══════════════════════════════════════════════════════
                    FINAL SUMMARY
═══════════════════════════════════════════════════════

Basic Facts               ████████████████████ 100%
Family Relations          ████████████████░░░░ 80%
Rule Reasoning            ████████████░░░░░░░░ 60%
Taxonomies                ████████████████████ 100%
Negation Logic            ████████░░░░░░░░░░░░ 40%

───────────────────────────────────────────────────────
TOTAL: 38/50 (76%)
Time: 2.34s
═══════════════════════════════════════════════════════
```

---

## 14.8 URS Traceability

| URS | Requirement | Implementation |
|-----|-------------|----------------|
| **URS-01** | Deterministic reasoning | Suite verifies consistent results |
| **URS-05** | Confidence scores | Reporter shows reasoning status |
| **URS-11** | DSL knowledge representation | DSL transformation testing |
| **URS-14** | Natural language output | DSL→NL verification |
| **URS-39** | Clear error messages | Reporter shows failures clearly |

---

## 14.9 Summary

The Evaluation Suite Framework provides:

1. **Structured Test Cases** - JSON-based case definitions
2. **Multi-Phase Evaluation** - NL→DSL, Reasoning, DSL→NL
3. **Visual Reporting** - Color-coded terminal output
4. **Timeout Handling** - Prevents hanging tests
5. **Suite Organization** - Domain-specific test groups

**Key Benefits:**
- Systematic capability evaluation
- Regression detection
- Visual progress tracking
- Easy case addition

---

*End of Chapter 14 - Evaluation Suite Framework*
