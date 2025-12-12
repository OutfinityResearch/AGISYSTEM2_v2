/**
 * AGISystem2 - Executor
 * @module runtime/executor
 *
 * Executes AST statements, building hypervectors and updating KB.
 */

import { Vector } from '../core/vector.mjs';
import { bind, bindAll, bundle } from '../core/operations.mjs';
import { withPosition } from '../core/position.mjs';
import {
  Statement,
  Identifier,
  Hole,
  Reference,
  Literal,
  List
} from '../parser/ast.mjs';

export class ExecutionError extends Error {
  constructor(message, node) {
    const location = node ? ` at ${node.line}:${node.column}` : '';
    super(`Execution error${location}: ${message}`);
    this.name = 'ExecutionError';
    this.node = node;
  }
}

export class Executor {
  /**
   * Create executor
   * @param {Session} session - Parent session
   */
  constructor(session) {
    this.session = session;
  }

  /**
   * Execute a program (list of statements)
   * @param {Program} program - AST program
   * @returns {Object} Execution result
   */
  executeProgram(program) {
    const results = [];
    const errors = [];

    for (const stmt of program.statements) {
      try {
        const result = this.executeStatement(stmt);
        results.push(result);
      } catch (e) {
        errors.push(e);
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors
    };
  }

  /**
   * Execute a single statement
   * @param {Statement} stmt - Statement AST
   * @returns {Object} Result with vector
   *
   * Persistence rules:
   * - @var operator args      → scope only (temporary)
   * - @var:name operator args → scope + KB (persistent fact)
   * - operator args (no @)    → KB only (anonymous persistent)
   */
  executeStatement(stmt) {
    if (!(stmt instanceof Statement)) {
      throw new ExecutionError('Expected Statement node', stmt);
    }

    // Build the vector for this statement
    const vector = this.buildStatementVector(stmt);

    // If there's a destination, store it in scope
    if (stmt.destination) {
      this.session.scope.set(stmt.destination, vector);
    }

    // Add to knowledge base only if:
    // 1. No destination (anonymous fact) - always persistent
    // 2. Has persistName (@var:name syntax) - explicitly persistent
    const shouldPersist = !stmt.destination || stmt.isPersistent;

    if (shouldPersist) {
      this.session.addToKB(vector, stmt.persistName);
    }

    return {
      destination: stmt.destination,
      persistName: stmt.persistName,
      persistent: shouldPersist,
      vector,
      statement: stmt.toString()
    };
  }

  /**
   * Build hypervector from statement
   * @param {Statement} stmt - Statement node
   * @returns {Vector}
   */
  buildStatementVector(stmt) {
    // Get operator vector
    const operatorVec = this.resolveExpression(stmt.operator);

    // Build positioned argument vectors
    const positionedArgs = [];
    for (let i = 0; i < stmt.args.length; i++) {
      const argVec = this.resolveExpression(stmt.args[i]);
      const positioned = withPosition(i + 1, argVec);
      positionedArgs.push(positioned);
    }

    // Combine: operator XOR pos1(arg1) XOR pos2(arg2) XOR ...
    if (positionedArgs.length === 0) {
      return operatorVec;
    }

    return bindAll(operatorVec, ...positionedArgs);
  }

  /**
   * Resolve expression to vector
   * @param {Expression} expr - Expression node
   * @returns {Vector}
   */
  resolveExpression(expr) {
    if (expr instanceof Identifier) {
      return this.resolveIdentifier(expr);
    }

    if (expr instanceof Hole) {
      return this.resolveHole(expr);
    }

    if (expr instanceof Reference) {
      return this.resolveReference(expr);
    }

    if (expr instanceof Literal) {
      return this.resolveLiteral(expr);
    }

    if (expr instanceof List) {
      return this.resolveList(expr);
    }

    throw new ExecutionError(`Unknown expression type: ${expr.type}`, expr);
  }

  /**
   * Resolve identifier to vector
   */
  resolveIdentifier(expr) {
    // First check scope (for defined vectors)
    if (this.session.scope.has(expr.name)) {
      return this.session.scope.get(expr.name);
    }

    // Otherwise get/create from vocabulary
    return this.session.vocabulary.getOrCreate(expr.name);
  }

  /**
   * Resolve hole to special vector
   */
  resolveHole(expr) {
    // Create a unique hole vector
    // Holes are tracked for query execution
    const holeName = `__HOLE_${expr.name}__`;
    return this.session.vocabulary.getOrCreate(holeName);
  }

  /**
   * Resolve reference (@name) to stored vector
   */
  resolveReference(expr) {
    const vec = this.session.scope.get(expr.name);
    if (!vec) {
      throw new ExecutionError(`Undefined reference: @${expr.name}`, expr);
    }
    return vec;
  }

  /**
   * Resolve literal to vector
   */
  resolveLiteral(expr) {
    // Convert literal to canonical string form
    const strValue = String(expr.value);
    return this.session.vocabulary.getOrCreate(strValue);
  }

  /**
   * Resolve list to bundled vector
   */
  resolveList(expr) {
    if (expr.items.length === 0) {
      return this.session.vocabulary.getOrCreate('__EMPTY_LIST__');
    }

    const itemVectors = expr.items.map(item => this.resolveExpression(item));
    return bundle(itemVectors);
  }
}

export default Executor;
