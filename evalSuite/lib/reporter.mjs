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
 * Report suite header
 * @param {Object} suite - Suite data
 */
export function reportSuiteHeader(suite) {
  console.log();
  console.log(`${colors.bold}${colors.blue}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bold}Suite: ${suite.name}${colors.reset}`);
  if (suite.description) {
    console.log(`${colors.dim}${suite.description}${colors.reset}`);
  }
  console.log(`${colors.blue}${'='.repeat(70)}${colors.reset}`);
  console.log();

  // Show loaded theory stack
  console.log(`${colors.cyan}Core Theory Stack:${colors.reset}`);
  for (const file of suite.coreTheory.files) {
    console.log(`  ${colors.dim}\u2022${colors.reset} ${file}`);
  }
  if (suite.suiteTheories.length > 0 || suite.declaredTheories.length > 0) {
    console.log(`${colors.cyan}Suite Theories:${colors.reset}`);
    for (const t of suite.declaredTheories) {
      console.log(`  ${colors.dim}\u2022${colors.reset} ${t}`);
    }
  }
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
 * Report global summary across all suites
 * @param {Array} suiteResults - Results from all suites
 */
export function reportGlobalSummary(suiteResults) {
  console.log();
  console.log(`${colors.bold}${colors.magenta}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}EVALUATION COMPLETE${colors.reset}`);
  console.log(`${colors.magenta}${'='.repeat(70)}${colors.reset}`);
  console.log();

  let totalCases = 0;
  let totalPassed = 0;
  let totalPartial = 0;

  console.log(`${colors.bold}Suite Results:${colors.reset}`);
  console.log();

  for (const suite of suiteResults) {
    totalCases += suite.summary.total;
    totalPassed += suite.summary.passed;
    totalPartial += suite.summary.partialPass || 0;

    const pct = suite.summary.total > 0
      ? Math.round((suite.summary.passed / suite.summary.total) * 100)
      : 0;

    const statusColor = pct === 100 ? colors.green : pct >= 50 ? colors.yellow : colors.red;

    console.log(`  ${suite.name.padEnd(35)} ${statusColor}${String(pct).padStart(3)}%${colors.reset} (${suite.summary.passed}/${suite.summary.total})`);
  }

  console.log();
  console.log(`${colors.bold}Overall:${colors.reset}`);

  const overallPct = totalCases > 0 ? Math.round((totalPassed / totalCases) * 100) : 0;
  const overallColor = overallPct === 100 ? colors.green : overallPct >= 50 ? colors.yellow : colors.red;

  console.log(`  Total Cases: ${totalCases}`);
  console.log(`  ${colors.green}Passed:${colors.reset}  ${totalPassed}`);
  if (totalPartial > 0) {
    console.log(`  ${colors.yellow}Partial:${colors.reset} ${totalPartial}`);
  }
  console.log(`  ${colors.red}Failed:${colors.reset}  ${totalCases - totalPassed}`);
  console.log();
  console.log(`  ${colors.bold}Score: ${overallColor}${overallPct}%${colors.reset}`);
  console.log();
}

export default {
  reportSuiteHeader,
  reportCaseResults,
  reportSuiteSummary,
  reportFailureDetails,
  reportGlobalSummary
};
