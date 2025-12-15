import { runSuite } from './evalSuite/lib/runner.mjs';
import suite17 from './evalSuite/suite17_logical_macros/cases.mjs';

const suite = { name: suite17.name, cases: suite17.steps };
const result = await runSuite(suite);

// Show details for failing tests
for (const r of result.results) {
  const dslToNlFailed = r.phases?.dslToNl && r.phases.dslToNl.passed === false;
  const reasoningPassed = r.phases?.reasoning?.passed === true;

  if (dslToNlFailed && reasoningPassed) {
    console.log('Test:', r.input_nl?.substring(0, 40));
    console.log('  Expected:', r.phases.dslToNl.expected);
    console.log('  Actual:', r.phases.dslToNl.actual);
    console.log('');
  }
}
