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
import { parse } from '../parser/parser.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

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
   * @param {Object} options - Options
   * @param {string} options.basePath - Base path for relative file loading
   */
  constructor(session, options = {}) {
    this.session = session;
    this.basePath = options.basePath || process.cwd();
    this.loadedTheories = new Set();  // Track loaded theory paths
  }

  /**
   * Execute a program (list of statements)
   * @param {Program} program - AST program
   * @returns {Object} Execution result
   */
  executeProgram(program) {
    const results = [];
    const errors = [];

    // Track macro definition context
    let macroContext = null;  // { name, persistName, params, body }

    for (const stmt of program.statements) {
      try {
        const operatorName = this.extractName(stmt.operator);

        // Check if starting a macro definition
        if (operatorName === 'macro') {
          macroContext = {
            name: stmt.destination,
            persistName: stmt.persistName,
            params: stmt.args.map(a => this.extractName(a)),
            body: [],
            line: stmt.line
          };
          continue;
        }

        // Check if ending a macro definition
        if (operatorName === 'end' && macroContext) {
          // Store the macro definition
          if (!this.session.macros) {
            this.session.macros = new Map();
          }
          this.session.macros.set(macroContext.name, macroContext);
          results.push({
            type: 'macro_definition',
            name: macroContext.name,
            params: macroContext.params
          });
          macroContext = null;
          continue;
        }

        // If inside macro, collect statement instead of executing
        if (macroContext) {
          macroContext.body.push(stmt);
          continue;
        }

        // Normal execution
        const result = this.executeStatement(stmt);
        results.push(result);
      } catch (e) {
        errors.push(e);
      }
    }

    // Warn if macro wasn't closed
    if (macroContext) {
      errors.push(new ExecutionError(`Unclosed macro definition: ${macroContext.name}`, { line: macroContext.line }));
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

    // Check for special operators (Load, Unload)
    const operatorName = this.extractName(stmt.operator);
    if (operatorName === 'Load') {
      return this.executeLoad(stmt);
    }
    if (operatorName === 'Unload') {
      return this.executeUnload(stmt);
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
      // Extract metadata for structured storage
      const metadata = this.extractMetadata(stmt);
      this.session.addToKB(vector, stmt.persistName, metadata);
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
   * Execute Load command - load a theory from file
   * Syntax: @_ Load "./path/to/file.sys2"
   * @param {Statement} stmt - Load statement
   * @returns {Object} Result
   */
  executeLoad(stmt) {
    if (stmt.args.length < 1) {
      throw new ExecutionError('Load requires a file path argument', stmt);
    }

    const pathArg = stmt.args[0];
    let filePath;

    // Get the file path from the argument
    if (pathArg instanceof Literal) {
      filePath = String(pathArg.value);
    } else if (pathArg instanceof Identifier) {
      // Could be a theory name - try to resolve it
      filePath = pathArg.name;
    } else {
      throw new ExecutionError('Load requires a string path or theory name', stmt);
    }

    // Resolve relative paths
    const absolutePath = resolve(this.basePath, filePath);

    // Prevent double-loading
    if (this.loadedTheories.has(absolutePath)) {
      return {
        destination: stmt.destination,
        loaded: false,
        reason: 'Already loaded',
        path: absolutePath,
        statement: stmt.toString()
      };
    }

    try {
      // Read and parse the theory file
      const content = readFileSync(absolutePath, 'utf8');

      // Update base path for relative imports within the loaded file
      const previousBasePath = this.basePath;
      this.basePath = dirname(absolutePath);

      // Parse and execute the content
      const program = parse(content);
      const result = this.executeProgram(program);

      // Track Implies rules for backward chaining
      this.trackRulesFromProgram(program);

      // Restore base path
      this.basePath = previousBasePath;

      // Mark as loaded only if no errors
      const hasErrors = result.errors && result.errors.length > 0;
      if (!hasErrors) {
        this.loadedTheories.add(absolutePath);
      }

      return {
        destination: stmt.destination,
        loaded: !hasErrors,
        success: !hasErrors,
        path: absolutePath,
        factsLoaded: result.results.length,
        errors: result.errors,
        statement: stmt.toString()
      };
    } catch (e) {
      throw new ExecutionError(`Failed to load theory: ${e.message}`, stmt);
    }
  }

  /**
   * Execute Unload command - unload a theory
   * @param {Statement} stmt - Unload statement
   * @returns {Object} Result
   */
  executeUnload(stmt) {
    if (stmt.args.length < 1) {
      throw new ExecutionError('Unload requires a theory argument', stmt);
    }

    const pathArg = stmt.args[0];
    let filePath;

    if (pathArg instanceof Literal) {
      filePath = String(pathArg.value);
    } else if (pathArg instanceof Identifier) {
      filePath = pathArg.name;
    } else {
      throw new ExecutionError('Unload requires a string path or theory name', stmt);
    }

    const absolutePath = resolve(this.basePath, filePath);

    // Remove from loaded set
    this.loadedTheories.delete(absolutePath);

    // Note: We don't actually remove facts from KB - that would require
    // tracking which facts came from which theory. For now, Unload just
    // prevents re-loading and marks the theory as unloaded.

    return {
      destination: stmt.destination,
      unloaded: true,
      path: absolutePath,
      statement: stmt.toString()
    };
  }

  /**
   * Track Implies rules from a loaded program for backward chaining
   * @param {Program} program - AST program
   */
  trackRulesFromProgram(program) {
    for (const stmt of program.statements) {
      const operatorName = this.extractName(stmt.operator);
      if (operatorName === 'Implies' && stmt.args.length >= 2) {
        const condVec = this.resolveExpression(stmt.args[0]);
        const concVec = this.resolveExpression(stmt.args[1]);

        // Check for compound conditions (And/Or)
        let conditionParts = null;
        const condArg = stmt.args[0];
        if (condArg.type === 'Reference') {
          const refName = condArg.name;
          for (const earlierStmt of program.statements) {
            if (earlierStmt.destination === refName) {
              const earlyOp = this.extractName(earlierStmt.operator);
              if (earlyOp === 'And' || earlyOp === 'Or') {
                conditionParts = {
                  type: earlyOp,
                  parts: earlierStmt.args.map(arg => this.resolveExpression(arg))
                };
              }
              break;
            }
          }
        }

        this.session.rules.push({
          name: stmt.destination,
          vector: this.buildStatementVector(stmt),
          source: stmt.toString(),
          condition: condVec,
          conclusion: concVec,
          conditionParts: conditionParts
        });
      }
    }
  }

  /**
   * Extract structured metadata from statement for reliable lookup
   * @param {Statement} stmt - Statement node
   * @returns {Object} Metadata with operator and args
   */
  extractMetadata(stmt) {
    const operatorName = this.extractName(stmt.operator);
    const args = stmt.args.map(arg => this.extractName(arg));

    return {
      operator: operatorName,
      args: args
    };
  }

  /**
   * Extract name from AST node
   */
  extractName(node) {
    if (!node) return null;
    if (node instanceof Identifier) return node.name;
    if (node instanceof Reference) return node.name;
    if (node instanceof Literal) return String(node.value);
    if (node.name) return node.name;
    if (node.value) return String(node.value);
    return null;
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
