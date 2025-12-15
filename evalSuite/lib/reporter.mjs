/**
 * EvalSuite - Console Reporter
 * @module evalSuite/lib/reporter
 *
 * Color-coded terminal output for evaluation results.
 */

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // Background
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m'
};

/**
 * Phase result symbols
 */
const symbols = {
  pass: `${colors.green}\u2713${colors.reset}`,       // ✓
  fail: `${colors.red}\u2717${colors.reset}`,         // ✗
  skip: `${colors.gray}\u25CB${colors.reset}`,        // ○
  timeout: `${colors.yellow}\u29D6${colors.reset}`,   // ⧖
  partial: `${colors.yellow}\u25D1${colors.reset}`    // ◑
};

/**
 * Format a single phase result
 * @param {string} phase - Phase name
 * @param {Object} result - Phase result
 * @returns {string}
 */
function formatPhase(phase, result) {
  if (!result) return `${colors.gray}${phase}:- ${colors.reset}`;

  if (result.skipped) return `${symbols.skip}`;
  if (result.timeout) return `${symbols.timeout}`;
  if (result.passed) return `${symbols.pass}`;
  return `${symbols.fail}`;
}

/**
 * Format case status bar
 * @param {Object} result - Case result with phases
 * @returns {string}
 */
function formatStatusBar(result) {
  const phases = ['nlToDsl', 'reasoning', 'dslToNl'];
  return phases.map(p => formatPhase(p, result.phases?.[p])).join(' ');
}

/**
 * Format test case row
 * @param {number} index - Case index
 * @param {Object} testCase - Test case definition
 * @param {Object} result - Test result
 * @returns {string}
 */
function formatCaseRow(index, testCase, result) {
  const num = String(index + 1).padStart(2, ' ');
  const status = formatStatusBar(result);
  const description = testCase.input_nl?.substring(0, 40) || testCase.description || 'Case ' + (index + 1);
  const truncated = description.length >= 40 ? description + '...' : description;

  const overall = result.passed
    ? `${colors.green}PASS${colors.reset}`
    : `${colors.red}FAIL${colors.reset}`;

  return `  ${colors.dim}${num}${colors.reset} [${status}] ${overall} ${truncated}`;
}

/**
 * Extract suite number from suite directory name (e.g., "suite08_rule_chains" -> "08")
 * @param {string} suiteName - Suite directory name
 * @returns {string} Suite number or empty string
 */
function extractSuiteNumber(suiteName) {
  const match = suiteName?.match(/^suite(\d+)/);
  return match ? match[1] : '';
}

/**
 * Report suite header
 * @param {Object} suite - Suite data
 */
export function reportSuiteHeader(suite) {
  const suiteNum = extractSuiteNumber(suite.suiteName);
  const numDisplay = suiteNum ? ` #${suiteNum}` : '';

  console.log();
  console.log(`${colors.bold}${colors.blue}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bold}Suite: ${suite.name}${numDisplay}${colors.reset}`);
  if (suite.description) {
    console.log(`${colors.dim}${suite.description}${colors.reset}`);
  }
  console.log(`${colors.blue}${'='.repeat(70)}${colors.reset}`);
  console.log();

  // Legend
  console.log(`${colors.dim}Legend: ${symbols.pass} Pass  ${symbols.fail} Fail  ${symbols.skip} Skip  ${symbols.timeout} Timeout${colors.reset}`);
  console.log(`${colors.dim}Phases: [NL\u2192DSL | Reasoning | DSL\u2192NL]${colors.reset}`);
  console.log();
}

/**
 * Report case results as table
 * @param {Array} cases - Test cases
 * @param {Array} results - Test results
 */
export function reportCaseResults(cases, results) {
  console.log(`${colors.bold}Results:${colors.reset}`);
  console.log();

  for (let i = 0; i < cases.length; i++) {
    console.log(formatCaseRow(i, cases[i], results[i] || { passed: false }));
  }

  console.log();
}

/**
 * Report suite summary
 * @param {Object} summary - Summary stats
 */
export function reportSuiteSummary(summary) {
  const { total, passed, failed, partialPass } = summary;
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;

  const barWidth = 40;
  const filledWidth = Math.round((passed / total) * barWidth);
  const partialWidth = Math.round((partialPass / total) * barWidth);
  const emptyWidth = barWidth - filledWidth - partialWidth;

  const progressBar =
    `${colors.bgGreen}${' '.repeat(filledWidth)}${colors.reset}` +
    `${colors.bgYellow}${' '.repeat(partialWidth)}${colors.reset}` +
    `${colors.bgRed}${' '.repeat(emptyWidth)}${colors.reset}`;

  console.log(`${colors.bold}Summary:${colors.reset}`);
  console.log(`  [${progressBar}] ${pct}%`);
  console.log();
  console.log(`  ${colors.green}Passed:${colors.reset}  ${passed}/${total}`);
  if (partialPass > 0) {
    console.log(`  ${colors.yellow}Partial:${colors.reset} ${partialPass}/${total}`);
  }
  console.log(`  ${colors.red}Failed:${colors.reset}  ${failed}/${total}`);
  console.log();
}

/**
 * Report phase failure details
 * @param {number} index - Case index
 * @param {Object} result - Case result
 */
export function reportFailureDetails(index, result) {
  if (result.passed) return;

  console.log(`${colors.dim}--- Case ${index + 1} Details ---${colors.reset}`);

  for (const [phase, phaseResult] of Object.entries(result.phases || {})) {
    if (!phaseResult.passed && !phaseResult.skipped) {
      console.log(`  ${colors.red}${phase}:${colors.reset}`);
      if (phaseResult.error) {
        console.log(`    Error: ${phaseResult.error}`);
      }
      if (phaseResult.expected !== undefined) {
        console.log(`    Expected: ${colors.green}${phaseResult.expected}${colors.reset}`);
        console.log(`    Actual:   ${colors.red}${phaseResult.actual}${colors.reset}`);
      }
    }
  }
  console.log();
}

/**
 * Format number with K/M suffix for large values
 */
function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

/**
 * Report global summary across all suites
 * @param {Array} suiteResults - Results from all suites
 */
export function reportGlobalSummary(suiteResults) {
  console.log();
  console.log(`${colors.bold}${colors.magenta}${'='.repeat(110)}${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}EVALUATION COMPLETE${colors.reset}`);
  console.log(`${colors.magenta}${'='.repeat(110)}${colors.reset}`);
  console.log();

  let totalCases = 0;
  let totalPassed = 0;
  let totalPartial = 0;

  // Aggregate reasoning stats across all suites
  const aggregatedStats = {
    queries: 0,
    proofs: 0,
    kbScans: 0,
    similarityChecks: 0,
    ruleAttempts: 0,
    transitiveSteps: 0,
    maxProofDepth: 0,
    totalProofSteps: 0,
    methods: {},
    operations: {}
  };

  // Table header with legend
  console.log(`${colors.bold}${colors.cyan}Suite Results with Reasoning Statistics:${colors.reset}`);
  console.log();
  console.log(`${colors.dim}Column Definitions:${colors.reset}`);
  console.log(`${colors.dim}  Pass   = % of tests passed          Tests  = passed/total count${colors.reset}`);
  console.log(`${colors.dim}  KBScan = KB fact lookups            SimChk = vector similarity comparisons${colors.reset}`);
  console.log(`${colors.dim}  Trans  = transitive chain steps     Rules  = backward chaining rule applications${colors.reset}`);
  console.log(`${colors.dim}  MaxD   = deepest proof chain        AvgL   = average proof steps (proofs only, not learn)${colors.reset}`);
  console.log(`${colors.dim}  Query  = query operations count     Proof  = prove operations count${colors.reset}`);
  console.log();
  console.log(`${colors.dim}${'─'.repeat(110)}${colors.reset}`);
  console.log(`${colors.bold}` +
    `${'Suite'.padEnd(32)}` +
    `${'Pass'.padStart(6)}` +
    `${'Tests'.padStart(7)}` +
    `${'KBScan'.padStart(8)}` +
    `${'SimChk'.padStart(8)}` +
    `${'Trans'.padStart(7)}` +
    `${'Rules'.padStart(7)}` +
    `${'MaxD'.padStart(6)}` +
    `${'AvgL'.padStart(6)}` +
    `${'Query'.padStart(7)}` +
    `${'Proof'.padStart(7)}` +
    `${colors.reset}`);
  console.log(`${colors.dim}${'─'.repeat(110)}${colors.reset}`);

  for (const suite of suiteResults) {
    totalCases += suite.summary.total;
    totalPassed += suite.summary.passed;
    totalPartial += suite.summary.partialPass || 0;

    // Aggregate reasoning stats
    const stats = suite.summary.reasoningStats || {};
    aggregatedStats.queries += stats.queries || 0;
    aggregatedStats.proofs += stats.proofs || 0;
    aggregatedStats.kbScans += stats.kbScans || 0;
    aggregatedStats.similarityChecks += stats.similarityChecks || 0;
    aggregatedStats.ruleAttempts += stats.ruleAttempts || 0;
    aggregatedStats.transitiveSteps += stats.transitiveSteps || 0;
    aggregatedStats.totalProofSteps += stats.totalProofSteps || 0;
    if ((stats.maxProofDepth || 0) > aggregatedStats.maxProofDepth) {
      aggregatedStats.maxProofDepth = stats.maxProofDepth;
    }
    for (const [method, count] of Object.entries(stats.methods || {})) {
      aggregatedStats.methods[method] = (aggregatedStats.methods[method] || 0) + count;
    }
    for (const [op, count] of Object.entries(stats.operations || {})) {
      aggregatedStats.operations[op] = (aggregatedStats.operations[op] || 0) + count;
    }

    const pct = suite.summary.total > 0
      ? Math.floor((suite.summary.passed / suite.summary.total) * 100)
      : 0;

    const statusColor = pct === 100 ? colors.green : pct >= 50 ? colors.yellow : colors.red;

    const suiteNum = extractSuiteNumber(suite.suiteName);
    const numDisplay = suiteNum ? `#${suiteNum} ` : '';
    const shortName = suite.name.length > 24 ? suite.name.substring(0, 22) + '..' : suite.name;
    const displayName = `${numDisplay}${shortName}`;

    console.log(
      `${displayName.padEnd(32)}` +
      `${statusColor}${(pct + '%').padStart(5)}${colors.reset} ` +
      `${colors.dim}${String(suite.summary.passed + '/' + suite.summary.total).padStart(6)}${colors.reset}` +
      `${formatNum(stats.kbScans || 0).padStart(8)}` +
      `${formatNum(stats.similarityChecks || 0).padStart(8)}` +
      `${formatNum(stats.transitiveSteps || 0).padStart(7)}` +
      `${formatNum(stats.ruleAttempts || 0).padStart(7)}` +
      `${String(stats.maxProofDepth || 0).padStart(6)}` +
      `${String(stats.avgProofLength || 0).padStart(6)}` +
      `${String(stats.queries || 0).padStart(7)}` +
      `${String(stats.proofs || 0).padStart(7)}`
    );
  }

  console.log(`${colors.dim}${'─'.repeat(110)}${colors.reset}`);

  // Totals row
  const overallPct = totalCases > 0 ? Math.floor((totalPassed / totalCases) * 100) : 0;
  const overallColor = overallPct === 100 ? colors.green : overallPct >= 50 ? colors.yellow : colors.red;
  const avgProofLen = aggregatedStats.proofs > 0
    ? (aggregatedStats.totalProofSteps / aggregatedStats.proofs).toFixed(1)
    : '0';

  console.log(`${colors.bold}` +
    `${'TOTAL'.padEnd(32)}` +
    `${overallColor}${(overallPct + '%').padStart(5)}${colors.reset} ` +
    `${colors.bold}${String(totalPassed + '/' + totalCases).padStart(6)}${colors.reset}` +
    `${colors.cyan}${formatNum(aggregatedStats.kbScans).padStart(8)}${colors.reset}` +
    `${colors.cyan}${formatNum(aggregatedStats.similarityChecks).padStart(8)}${colors.reset}` +
    `${colors.cyan}${formatNum(aggregatedStats.transitiveSteps).padStart(7)}${colors.reset}` +
    `${colors.cyan}${formatNum(aggregatedStats.ruleAttempts).padStart(7)}${colors.reset}` +
    `${colors.cyan}${String(aggregatedStats.maxProofDepth).padStart(6)}${colors.reset}` +
    `${colors.cyan}${avgProofLen.padStart(6)}${colors.reset}` +
    `${colors.cyan}${String(aggregatedStats.queries).padStart(7)}${colors.reset}` +
    `${colors.cyan}${String(aggregatedStats.proofs).padStart(7)}${colors.reset}`
  );
  console.log(`${colors.dim}${'─'.repeat(110)}${colors.reset}`);
  console.log();

  // Score
  console.log(`${colors.bold}Score: ${overallColor}${overallPct}%${colors.reset}  ` +
    `${colors.dim}(${totalPassed} passed, ${totalCases - totalPassed} failed)${colors.reset}`);
  console.log();
}

/**
 * Report methods and operations in compact format
 */
function reportMethodsAndOps(stats) {
  const hasStats = Object.keys(stats.methods).length > 0 || Object.keys(stats.operations).length > 0;
  if (!hasStats) return;

  console.log(`${colors.bold}${colors.cyan}Reasoning Methods:${colors.reset}`);
  if (Object.keys(stats.methods).length > 0) {
    const methodsStr = Object.entries(stats.methods)
      .sort((a, b) => b[1] - a[1])
      .map(([m, c]) => `${m.replace(/_/g, ' ')}:${c}`)
      .join('  ');
    console.log(`  ${colors.dim}${methodsStr}${colors.reset}`);
  }

  console.log();
  console.log(`${colors.bold}${colors.cyan}Operations:${colors.reset}`);
  if (Object.keys(stats.operations).length > 0) {
    const opsStr = Object.entries(stats.operations)
      .sort((a, b) => b[1] - a[1])
      .map(([o, c]) => `${o.replace(/_/g, ' ')}:${c}`)
      .join('  ');
    console.log(`  ${colors.dim}${opsStr}${colors.reset}`);
  }
  console.log();
}

export default {
  reportSuiteHeader,
  reportCaseResults,
  reportSuiteSummary,
  reportFailureDetails,
  reportGlobalSummary
};
