/**
 * Parser Unit Tests - Node.js native test runner
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parse, ParseError } from '../../../src/parser/parser.mjs';

describe('Parser', () => {
  describe('simple statements', () => {
    test('should parse statement with destination', () => {
      const ast = parse('@f loves John Mary');
      assert.equal(ast.statements.length, 1);

      const stmt = ast.statements[0];
      assert.equal(stmt.type, 'Statement');
      assert.equal(stmt.destination, 'f');
      assert.equal(stmt.operator.name, 'loves');
      assert.equal(stmt.args.length, 2);
      assert.equal(stmt.args[0].name, 'John');
      assert.equal(stmt.args[1].name, 'Mary');
    });

    test('should parse statement without destination', () => {
      const ast = parse('loves John Mary');
      assert.equal(ast.statements.length, 1);

      const stmt = ast.statements[0];
      assert.equal(stmt.destination, null);
      assert.equal(stmt.operator.name, 'loves');
    });

    test('should parse multiple statements', () => {
      const ast = parse('@a loves John Mary\n@b parent John Alice');
      assert.equal(ast.statements.length, 2);
    });
  });

  describe('holes', () => {
    test('should parse holes in statement', () => {
      const ast = parse('@q loves ?who Mary');
      const stmt = ast.statements[0];

      assert.equal(stmt.args[0].type, 'Hole');
      assert.equal(stmt.args[0].name, 'who');
      assert.equal(stmt.args[1].type, 'Identifier');
    });

    test('should parse multiple holes', () => {
      const ast = parse('@q sells ?seller ?item ?buyer');
      const stmt = ast.statements[0];

      assert.equal(stmt.args[0].type, 'Hole');
      assert.equal(stmt.args[1].type, 'Hole');
      assert.equal(stmt.args[2].type, 'Hole');
    });
  });

  describe('compound expressions', () => {
    test('should parse compound in parentheses', () => {
      const ast = parse('@r Implies (isA ?x Human) (isA ?x Mortal)');
      const stmt = ast.statements[0];

      assert.equal(stmt.operator.name, 'Implies');
      assert.equal(stmt.args[0].type, 'Compound');
      assert.equal(stmt.args[0].operator.name, 'isA');
      assert.equal(stmt.args[1].type, 'Compound');
    });

    test('should parse nested compounds', () => {
      const ast = parse('@r Implies (And (a ?x) (b ?x)) (c ?x)');
      const stmt = ast.statements[0];
      const firstArg = stmt.args[0];

      assert.equal(firstArg.operator.name, 'And');
      assert.equal(firstArg.args[0].type, 'Compound');
      assert.equal(firstArg.args[1].type, 'Compound');
    });
  });

  describe('literals', () => {
    test('should parse number literals', () => {
      const ast = parse('@f sells Alice Book Bob 50');
      const stmt = ast.statements[0];

      assert.equal(stmt.args[3].type, 'Literal');
      assert.equal(stmt.args[3].value, 50);
    });

    test('should parse string literals', () => {
      const ast = parse('@f message John "Hello World"');
      const stmt = ast.statements[0];

      assert.equal(stmt.args[1].type, 'Literal');
      assert.equal(stmt.args[1].value, 'Hello World');
    });
  });

  describe('lists', () => {
    test('should parse list expression', () => {
      const ast = parse('@f tags Item [Red, Blue, Green]');
      const stmt = ast.statements[0];

      assert.equal(stmt.args[1].type, 'List');
      assert.equal(stmt.args[1].items.length, 3);
    });
  });

  describe('references', () => {
    test('should parse $reference in expressions', () => {
      // $a is a reference to a stored variable
      const ast = parse('@b combo $a X');
      const stmt = ast.statements[0];

      assert.equal(stmt.destination, 'b');
      assert.equal(stmt.operator.name, 'combo');
      assert.equal(stmt.args[0].type, 'Reference');
      assert.equal(stmt.args[0].name, 'a');
      assert.equal(stmt.args[1].type, 'Identifier');
    });

    test('should parse $reference in compound', () => {
      // $ref inside a compound expression
      const ast = parse('@b test (inner $ref X)');
      const stmt = ast.statements[0];

      assert.equal(stmt.args[0].type, 'Compound');
      assert.equal(stmt.args[0].operator.name, 'inner');
      assert.equal(stmt.args[0].args[0].type, 'Reference');
      assert.equal(stmt.args[0].args[0].name, 'ref');
    });
  });

  describe('toString', () => {
    test('statement should have readable toString', () => {
      const ast = parse('@f loves John Mary');
      const str = ast.statements[0].toString();
      assert.ok(str.includes('loves'));
      assert.ok(str.includes('John'));
      assert.ok(str.includes('Mary'));
    });
  });

  describe('error handling', () => {
    test('should handle empty input', () => {
      const ast = parse('');
      assert.equal(ast.statements.length, 0);
    });

    test('should handle whitespace only', () => {
      const ast = parse('   \n\n   ');
      assert.equal(ast.statements.length, 0);
    });

    test('should throw on unclosed parenthesis', () => {
      assert.throws(() => parse('@f Implies (isA X'), ParseError);
    });
  });
});
