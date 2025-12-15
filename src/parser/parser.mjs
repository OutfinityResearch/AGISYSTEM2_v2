/**
 * AGISystem2 - Parser
 * @module parser/parser
 *
 * Parses token stream into AST.
 */

import { TOKEN_TYPES } from '../core/constants.mjs';
import { Lexer } from './lexer.mjs';
import {
  Program,
  Statement,
  Identifier,
  Hole,
  Reference,
  Literal,
  List,
  TheoryDeclaration,
  ImportStatement,
  RuleDeclaration,
  MacroDeclaration
} from './ast.mjs';

export class ParseError extends Error {
  constructor(message, token) {
    const location = token ? ` at ${token.line}:${token.column}` : '';
    super(`Parse error${location}: ${message}`);
    this.name = 'ParseError';
    this.token = token;
  }
}

export class Parser {
  constructor(tokens) {
    // Keep NEWLINE tokens - they separate statements
    this.tokens = tokens;
    this.pos = 0;
  }

  /**
   * Parse tokens into AST
   * @returns {Program} AST root
   */
  parse() {
    const statements = [];
    let maxIterations = this.tokens.length * 2;  // Safety limit

    while (!this.isEof() && maxIterations-- > 0) {
      // Skip leading newlines
      this.skipNewlines();
      if (this.isEof()) break;

      const startPos = this.pos;
      const stmt = this.parseTopLevel();
      if (stmt) {
        statements.push(stmt);
      }

      // SAFETY: If we didn't advance, we hit an unrecognized token - throw error
      if (this.pos === startPos && !this.isEof()) {
        const badToken = this.peek();
        throw new ParseError(
          `Unexpected token '${badToken.value || badToken.type}'`,
          badToken
        );
      }

      // Skip trailing newlines after statement
      this.skipNewlines();
    }

    return new Program(statements);
  }

  /**
   * Parse top-level declaration or statement
   */
  parseTopLevel() {
    const token = this.peek();

    if (token.type === TOKEN_TYPES.KEYWORD) {
      switch (token.value) {
        case 'theory':
          return this.parseTheory();
        case 'import':
          return this.parseImport();
        case 'rule':
          return this.parseRule();
      }
    }

    return this.parseStatement();
  }

  /**
   * Parse theory declaration
   * theory Name { statements }
   */
  parseTheory() {
    const startToken = this.expect(TOKEN_TYPES.KEYWORD, 'theory');
    const name = this.expect(TOKEN_TYPES.IDENTIFIER).value;
    this.expect(TOKEN_TYPES.LBRACKET); // Using [ for block start

    const statements = [];
    while (!this.check(TOKEN_TYPES.RBRACKET) && !this.isEof()) {
      const stmt = this.parseStatement();
      if (stmt) statements.push(stmt);
    }

    this.expect(TOKEN_TYPES.RBRACKET);
    return new TheoryDeclaration(name, statements, startToken.line, startToken.column);
  }

  /**
   * Parse import statement
   * import TheoryName
   */
  parseImport() {
    const startToken = this.expect(TOKEN_TYPES.KEYWORD, 'import');
    const name = this.expect(TOKEN_TYPES.IDENTIFIER).value;
    return new ImportStatement(name, startToken.line, startToken.column);
  }

  /**
   * Parse rule declaration
   * rule Name: (condition) => (conclusion)
   */
  parseRule() {
    const startToken = this.expect(TOKEN_TYPES.KEYWORD, 'rule');
    const name = this.expect(TOKEN_TYPES.IDENTIFIER).value;
    this.expect(TOKEN_TYPES.COLON);

    const condition = this.parseExpression();
    // Skip '=>' if present (treat as identifier)
    if (this.check(TOKEN_TYPES.IDENTIFIER) && this.peek().value === '=>') {
      this.advance();
    }
    const conclusion = this.parseExpression();

    return new RuleDeclaration(name, condition, conclusion, startToken.line, startToken.column);
  }

  /**
   * Parse statement
   * [@dest] or [@dest:persistName] operator arg1 arg2 ...
   * @dest = temporary variable (scope only)
   * @dest:persistName = persistent fact (added to KB)
   *
   * Also handles macro definitions:
   * @name:persistName macro param1 param2 ...
   *   body statements
   *   return $result
   * end
   */
  parseStatement() {
    let destination = null;
    let persistName = null;
    let startLine = this.peek().line;
    let startColumn = this.peek().column;

    // Optional destination with optional persist name
    if (this.check(TOKEN_TYPES.AT)) {
      const destToken = this.advance();
      const destValue = destToken.value;
      startLine = destToken.line;
      startColumn = destToken.column;
      // Check if it has :persistName suffix
      if (destValue.includes(':')) {
        const parts = destValue.split(':');
        destination = parts[0];
        persistName = parts[1];
      } else {
        destination = destValue;
      }
    }

    // Check if this is a macro definition
    if (this.check(TOKEN_TYPES.KEYWORD) && this.peek().value === 'macro') {
      return this.parseMacro(destination, persistName, startLine, startColumn);
    }

    // Operator
    const operator = this.parseExpression();
    if (!operator) {
      return null;
    }

    // Arguments
    const args = [];
    while (!this.isEof() && !this.check(TOKEN_TYPES.AT) && !this.isStatementEnd()) {
      const arg = this.parseExpression();
      if (!arg) break;
      args.push(arg);
    }

    return new Statement(
      destination,
      operator,
      args,
      operator.line,
      operator.column,
      persistName  // New: pass persist name to Statement
    );
  }

  /**
   * Parse macro definition
   * @name:persistName macro param1 param2 ...
   *   body statements
   *   return $result
   * end
   */
  parseMacro(destination, persistName, line, column) {
    // Consume 'macro' keyword
    this.expect(TOKEN_TYPES.KEYWORD, 'macro');

    // Parse parameter names (identifiers until newline/end of line)
    const params = [];
    while (!this.isEof() && !this.check(TOKEN_TYPES.NEWLINE)) {
      if (this.check(TOKEN_TYPES.IDENTIFIER)) {
        params.push(this.advance().value);
      } else {
        break;
      }
    }

    // Skip newline after macro header
    this.skipNewlines();

    // Parse body statements until 'end' keyword
    const body = [];
    let returnExpr = null;

    while (!this.isEof()) {
      // Check for 'end' keyword
      if (this.check(TOKEN_TYPES.KEYWORD) && this.peek().value === 'end') {
        this.advance(); // consume 'end'
        break;
      }

      // Check for 'return' keyword
      if (this.check(TOKEN_TYPES.KEYWORD) && this.peek().value === 'return') {
        this.advance(); // consume 'return'
        returnExpr = this.parseExpression();
        this.skipNewlines();
        continue;
      }

      // Parse normal statement as part of macro body
      const stmt = this.parseStatement();
      if (stmt) {
        body.push(stmt);
      }
      this.skipNewlines();
    }

    return new MacroDeclaration(
      destination,
      persistName,
      params,
      body,
      returnExpr,
      line,
      column
    );
  }

  /**
   * Parse expression
   */
  parseExpression() {
    const token = this.peek();

    if (this.isEof()) return null;

    switch (token.type) {
      case TOKEN_TYPES.IDENTIFIER:
        return this.parseIdentifier();

      case TOKEN_TYPES.HOLE:
        return this.parseHole();

      case TOKEN_TYPES.REFERENCE:
        return this.parseReference();

      case TOKEN_TYPES.NUMBER:
        return this.parseNumber();

      case TOKEN_TYPES.STRING:
        return this.parseString();

      case TOKEN_TYPES.LBRACKET:
        return this.parseList();

      case TOKEN_TYPES.LPAREN:
        // Parentheses not supported - skip to closing paren
        this.advance(); // consume (
        while (!this.check(TOKEN_TYPES.RPAREN) && !this.isEof()) {
          this.advance();
        }
        if (this.check(TOKEN_TYPES.RPAREN)) {
          this.advance(); // consume )
        }
        return null;

      default:
        return null;
    }
  }

  /**
   * Parse identifier
   */
  parseIdentifier() {
    const token = this.expect(TOKEN_TYPES.IDENTIFIER);
    return new Identifier(token.value, token.line, token.column);
  }

  /**
   * Parse hole (?variable)
   */
  parseHole() {
    const token = this.expect(TOKEN_TYPES.HOLE);
    return new Hole(token.value, token.line, token.column);
  }

  /**
   * Parse reference ($name)
   */
  parseReference() {
    const token = this.expect(TOKEN_TYPES.REFERENCE);
    return new Reference(token.value, token.line, token.column);
  }

  /**
   * Parse number literal
   */
  parseNumber() {
    const token = this.expect(TOKEN_TYPES.NUMBER);
    return new Literal(token.value, 'number', token.line, token.column);
  }

  /**
   * Parse string literal
   */
  parseString() {
    const token = this.expect(TOKEN_TYPES.STRING);
    return new Literal(token.value, 'string', token.line, token.column);
  }

  /**
   * Parse list
   * [item1, item2, ...]
   */
  parseList() {
    const startToken = this.expect(TOKEN_TYPES.LBRACKET);

    const items = [];
    while (!this.check(TOKEN_TYPES.RBRACKET) && !this.isEof()) {
      const item = this.parseExpression();
      if (!item) break;
      items.push(item);

      if (this.check(TOKEN_TYPES.COMMA)) {
        this.advance();
      }
    }

    this.expect(TOKEN_TYPES.RBRACKET);
    return new List(items, startToken.line, startToken.column);
  }

  /**
   * Check if at statement boundary
   */
  isStatementEnd() {
    const token = this.peek();
    return token.type === TOKEN_TYPES.EOF ||
           token.type === TOKEN_TYPES.NEWLINE ||
           token.type === TOKEN_TYPES.KEYWORD ||
           token.type === TOKEN_TYPES.RBRACKET;
  }

  /**
   * Skip any newline tokens
   */
  skipNewlines() {
    while (this.check(TOKEN_TYPES.NEWLINE)) {
      this.advance();
    }
  }

  // Token navigation helpers

  peek() {
    return this.tokens[this.pos] || new Token(TOKEN_TYPES.EOF, null, 0, 0);
  }

  advance() {
    const token = this.peek();
    if (!this.isEof()) this.pos++;
    return token;
  }

  check(type, value = null) {
    const token = this.peek();
    if (token.type !== type) return false;
    if (value !== null && token.value !== value) return false;
    return true;
  }

  expect(type, value = null) {
    const token = this.advance();
    if (token.type !== type) {
      throw new ParseError(
        `Expected ${type}${value ? ` '${value}'` : ''}, got ${token.type} '${token.value}'`,
        token
      );
    }
    if (value !== null && token.value !== value) {
      throw new ParseError(`Expected '${value}', got '${token.value}'`, token);
    }
    return token;
  }

  isEof() {
    return this.pos >= this.tokens.length || this.peek().type === TOKEN_TYPES.EOF;
  }
}

/**
 * Parse DSL string into AST
 * @param {string} input - DSL source code
 * @returns {Program} AST
 */
export function parse(input) {
  const lexer = new Lexer(input);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  return parser.parse();
}

export default { Parser, parse, ParseError };
