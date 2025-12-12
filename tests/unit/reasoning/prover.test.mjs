/**
 * Tests for Proof Engine
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProofEngine } from '../../../src/reasoning/prove.mjs';
import { Session } from '../../../src/runtime/session.mjs';
import { parse } from '../../../src/parser/parser.mjs';

test('ProofEngine: constructor and basic operations', () => {
  const session = new Session({ geometry: 2048 });
  const prover = new ProofEngine(session);

  // Default options
  assert.ok(prover.session === session);
  assert.ok(prover.options.maxDepth > 0);
  assert.ok(prover.options.timeout > 0);

  // Custom options
  const prover2 = new ProofEngine(session, { maxDepth: 5, timeout: 1000 });
  assert.equal(prover2.options.maxDepth, 5);
  assert.equal(prover2.options.timeout, 1000);

  // combineConfidences
  assert.equal(prover.combineConfidences([]), 1.0);
  const results = [{ confidence: 0.9 }, { confidence: 0.7 }, { confidence: 0.8 }];
  const combined = prover.combineConfidences(results);
  assert.ok(combined <= 0.7 && combined > 0.6);
});

test('ProofEngine: prove operations', () => {
  const session = new Session({ geometry: 2048 });
  const prover = new ProofEngine(session);

  // Test direct fact proof
  session.learn('@f isA Socrates Human');
  const goal = parse('@g isA Socrates Human').statements[0];
  const result = prover.prove(goal);

  assert.ok('valid' in result);
  assert.ok('proof' in result);
  assert.ok('confidence' in result);
  assert.ok('steps' in result);
  assert.ok(result.confidence >= 0 && result.confidence <= 1);
  assert.ok(Array.isArray(result.steps));
});

test('ProofEngine: tryDirectMatch operations', () => {
  const session = new Session({ geometry: 2048 });
  const prover = new ProofEngine(session);

  // With fact
  session.learn('@f exact Match');
  const goal1 = parse('@g exact Match').statements[0];
  const goalVector1 = session.executor.buildStatementVector(goal1);
  const result1 = prover.tryDirectMatch(goalVector1, 'exact Match');
  assert.ok('success' in result1);
  assert.ok('confidence' in result1);

  // Without fact (new session)
  const session2 = new Session({ geometry: 2048 });
  const prover2 = new ProofEngine(session2);
  const goal2 = parse('@g missing Fact').statements[0];
  const goalVector2 = session2.executor.buildStatementVector(goal2);
  const result2 = prover2.tryDirectMatch(goalVector2, 'missing Fact');
  assert.equal(result2.success, false);
  assert.equal(result2.confidence, 0);
});
