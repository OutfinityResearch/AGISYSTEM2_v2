#!/usr/bin/env node
/**
 * EvalSuite Runner
 *
 * Run evaluation suites to test NL->DSL transformation and reasoning.
 *
 * Usage:
 *   node evalSuite/run.js              # Run all suites
 *   node evalSuite/run.js suite01      # Run specific suite
 *   node evalSuite/run.js --verbose    # Show failure details
 */

import { discoverSuites, loadSuite } from './lib/loader.mjs';
import { runSuite } from './lib/runner.mjs';
import {
  reportSuiteHeader,
  reportCaseResults,
  reportSuiteSummary,
  reportFailureDetails,
  reportGlobalSummary
} from './lib/reporter.mjs';

// Parse command line arguments
const args = process.argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');
const specificSuites = args.filter(a => !a.startsWith('-'));

// Track results globally for interrupt handler
let collectedResults = [];
let interrupted = false;

// Handle Ctrl+C - show summary before exit
process.on('SIGINT', () => {
  interrupted = true;
  console.log('\n\n\x1b[33m⚠ Interrupted by user (Ctrl+C)\x1b[0m\n');

  if (collectedResults.length > 0) {
    reportGlobalSummary(collectedResults);
  } else {
    console.log('\x1b[2mNo results collected yet.\x1b[0m');
  }

  process.exit(130); // Standard exit code for SIGINT
});

async function main() {
  console.log();
  console.log('\x1b[1m\x1b[34mAGISystem2 - Evaluation Suite Runner\x1b[0m');
  console.log('\x1b[2mTesting NL\u2192DSL transformation with Core Theory stack\x1b[0m');
  console.log();

  try {
    // Discover available suites
    let suites = await discoverSuites();

    if (suites.length === 0) {
      console.error('\x1b[31mNo evaluation suites found!\x1b[0m');
      process.exit(1);
    }

    // Filter to specific suites if requested
    if (specificSuites.length > 0) {
      suites = suites.filter(s =>
        specificSuites.some(arg => s.includes(arg))
      );

      if (suites.length === 0) {
        console.error(`\x1b[31mNo matching suites found for: ${specificSuites.join(', ')}\x1b[0m`);
        process.exit(1);
      }
    }

    console.log(`Found ${suites.length} suite(s): ${suites.join(', ')}`);

    // Reset collected results
    collectedResults = [];

    // Run each suite
    for (const suiteName of suites) {
      if (interrupted) break;

      try {
        // Load suite data
        const suite = await loadSuite(suiteName);

        // Report header (shows Core theory stack)
        reportSuiteHeader(suite);

        // Run tests
        const { results, summary } = await runSuite(suite);

        // Report results
        reportCaseResults(suite.cases, results);
        reportSuiteSummary(summary, suite.cases);

        // Show failure details if verbose
        if (verbose) {
          for (let i = 0; i < results.length; i++) {
            reportFailureDetails(i, results[i]);
          }
        }

        collectedResults.push({
          name: suite.name,
          suiteName,
          results,
          summary,
          cases: suite.cases
        });

      } catch (err) {
        console.error(`\x1b[31mError running suite ${suiteName}: ${err.message}\x1b[0m`);
        if (verbose) {
          console.error(err.stack);
        }
      }
    }

    // Global summary (if not interrupted, interrupt handler shows its own)
    if (!interrupted && collectedResults.length > 1) {
      reportGlobalSummary(collectedResults);
    }

    // Exit code based on results
    const allPassed = collectedResults.every(s => s.summary.failed === 0);
    process.exit(allPassed ? 0 : 1);

  } catch (err) {
    console.error(`\x1b[31mFatal error: ${err.message}\x1b[0m`);
    if (verbose) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

main();
