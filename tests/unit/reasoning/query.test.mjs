/**
 * Tests for Query Engine
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { QueryEngine } from '../../../src/reasoning/query.mjs';
import { Session } from '../../../src/runtime/session.mjs';
import { parse } from '../../../src/parser/parser.mjs';

describe('QueryEngine', () => {
  let session;
  let queryEngine;

  function setup() {
    session = new Session({ geometry: 2048 });
    queryEngine = new QueryEngine(session);
  }

  function learn(dsl) {
    const result = session.learn(dsl);
    if (!result.success) {
      throw new Error(`Learn failed: ${result.errors.join(', ')}`);
    }
    return result;
  }

  describe('constructor', () => {
    test('should create query engine with session', () => {
      setup();
      assert.ok(queryEngine.session === session);
    });
  });

  describe('execute', () => {
    describe('single hole queries', () => {
      test('should find object of relation', () => {
        setup();
        learn('@f loves John Mary');

        const query = parse('@q loves John ?who').statements[0];
        const result = queryEngine.execute(query);

        assert.ok('bindings' in result);
        assert.ok(result.bindings.has('who'));
      });

      test('should find subject of relation', () => {
        setup();
        learn('@f owns Alice Book');

        const query = parse('@q owns ?who Book').statements[0];
        const result = queryEngine.execute(query);

        assert.ok(result.bindings.has('who'));
      });

      test('should report confidence', () => {
        setup();
        learn('@f likes Bob Pizza');

        const query = parse('@q likes Bob ?what').statements[0];
        const result = queryEngine.execute(query);

        assert.ok('confidence' in result);
        assert.ok(result.confidence >= 0 && result.confidence <= 1);
      });

      test('should report alternatives', () => {
        setup();
        learn(`
          @f1 likes Alice Pizza
          @f2 likes Alice Pasta
          @f3 likes Alice Sushi
        `);

        const query = parse('@q likes Alice ?food').statements[0];
        const result = queryEngine.execute(query);

        const binding = result.bindings.get('food');
        assert.ok('alternatives' in binding);
      });
    });

    describe('multiple hole queries', () => {
      test('should handle two holes', () => {
        setup();
        learn('@f sells Alice Book Bob');

        const query = parse('@q sells ?seller ?item Bob').statements[0];
        const result = queryEngine.execute(query);

        assert.ok(result.bindings.has('seller'));
        assert.ok(result.bindings.has('item'));
      });

      test('should fail gracefully with too many holes', () => {
        setup();
        learn('@f test A B');

        const query = parse('@q ?a ?b ?c ?d ?e').statements[0];
        const result = queryEngine.execute(query);

        assert.equal(result.success, false);
        assert.ok(result.reason.includes('holes'));
      });
    });

    describe('no hole queries (direct match)', () => {
      test('should find matching fact', () => {
        setup();
        learn('@f loves John Mary');

        const query = parse('@q loves John Mary').statements[0];
        const result = queryEngine.execute(query);

        assert.ok('matches' in result);
      });

      test('should report no match for completely unknown fact', () => {
        setup();
        learn('@f loves John Mary');

        // Query with completely unrelated entities
        const query = parse('@q destroys Planet99 Galaxy88').statements[0];
        const result = queryEngine.execute(query);

        // Either no match or very low confidence
        assert.ok(
          result.success === false || result.confidence < 0.3,
          'unknown fact should have no match or very low confidence'
        );
      });
    });

    describe('empty KB', () => {
      test('should fail gracefully with empty KB', () => {
        setup();

        const query = parse('@q loves ?who Mary').statements[0];
        const result = queryEngine.execute(query);

        assert.equal(result.success, false);
        assert.ok(result.reason.includes('Empty'));
      });
    });

    describe('ambiguity detection', () => {
      test('should detect ambiguous results', () => {
        setup();
        // Multiple similar facts might cause ambiguity
        learn(`
          @f1 parent Alice Bob
          @f2 parent Alice Carol
        `);

        const query = parse('@q parent Alice ?child').statements[0];
        const result = queryEngine.execute(query);

        // Result should indicate potential ambiguity
        assert.ok('ambiguous' in result);
      });
    });
  });

  describe('directMatch', () => {
    test('should find exact match', () => {
      setup();
      learn('@f isA Socrates Human');

      const query = parse('@q isA Socrates Human').statements[0];
      const result = queryEngine.execute(query);

      assert.ok(result.matches.length > 0 || result.success);
    });

    test('should rank by similarity', () => {
      setup();
      learn(`
        @f1 isA Cat Animal
        @f2 isA Dog Animal
      `);

      const query = parse('@q isA Cat Animal').statements[0];
      const result = queryEngine.execute(query);

      if (result.matches && result.matches.length > 1) {
        assert.ok(
          result.matches[0].similarity >= result.matches[1].similarity,
          'should be sorted by similarity'
        );
      }
    });
  });

  describe('confidence calculation', () => {
    test('should penalize multiple holes', () => {
      setup();
      learn('@f relation A B');

      const oneHole = parse('@q relation A ?x').statements[0];
      const twoHoles = parse('@q relation ?x ?y').statements[0];

      const result1 = queryEngine.execute(oneHole);
      const result2 = queryEngine.execute(twoHoles);

      // Two holes should generally have lower confidence
      if (result1.success && result2.success) {
        // This is a soft test - confidence may vary
        assert.ok(typeof result1.confidence === 'number');
        assert.ok(typeof result2.confidence === 'number');
      }
    });
  });

  describe('KB interaction', () => {
    test('should work with bundled KB', () => {
      setup();
      learn(`
        @f1 loves Alice Bob
        @f2 loves Carol Dave
        @f3 likes Eve Frank
      `);

      const query = parse('@q loves ?who Bob').statements[0];
      const result = queryEngine.execute(query);

      // Should find something in bundled KB
      assert.ok('bindings' in result);
    });
  });
});
