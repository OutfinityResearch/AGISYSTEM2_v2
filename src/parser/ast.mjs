/**
 * AGISystem2 - Abstract Syntax Tree Nodes
 * @module parser/ast
 */

/**
 * Base AST Node
 */
export class ASTNode {
  constructor(type, line, column) {
    this.type = type;
    this.line = line;
    this.column = column;
  }
}

/**
 * Program node - root of AST
 */
export class Program extends ASTNode {
  constructor(statements) {
    super('Program', 1, 1);
    this.statements = statements;
  }
}

/**
 * Statement with destination label
 * @dest operator arg1 arg2 ...
 */
export class Statement extends ASTNode {
  constructor(destination, operator, args, line, column) {
    super('Statement', line, column);
    this.destination = destination; // string or null
    this.operator = operator;       // Expression
    this.args = args;               // Expression[]
  }

  toString() {
    const dest = this.destination ? `@${this.destination} ` : '';
    const args = this.args.map(a => a.toString()).join(' ');
    return `${dest}${this.operator.toString()} ${args}`.trim();
  }
}

/**
 * Expression node - can be identifier, literal, hole, or compound
 */
export class Expression extends ASTNode {
  constructor(type, value, line, column) {
    super(type, line, column);
    this.value = value;
  }
}

/**
 * Identifier expression (atom name)
 */
export class Identifier extends Expression {
  constructor(name, line, column) {
    super('Identifier', name, line, column);
    this.name = name;
  }

  toString() {
    return this.name;
  }
}

/**
 * Hole expression (?variable)
 */
export class Hole extends Expression {
  constructor(name, line, column) {
    super('Hole', name, line, column);
    this.name = name;
  }

  toString() {
    return `?${this.name}`;
  }
}

/**
 * Reference expression (@label)
 */
export class Reference extends Expression {
  constructor(name, line, column) {
    super('Reference', name, line, column);
    this.name = name;
  }

  toString() {
    return `@${this.name}`;
  }
}

/**
 * Literal expression (number or string)
 */
export class Literal extends Expression {
  constructor(value, literalType, line, column) {
    super('Literal', value, line, column);
    this.literalType = literalType; // 'number' | 'string'
  }

  toString() {
    if (this.literalType === 'string') {
      return `"${this.value}"`;
    }
    return String(this.value);
  }
}

/**
 * Compound expression (nested parenthesized structure)
 * (operator arg1 arg2 ...)
 */
export class Compound extends Expression {
  constructor(operator, args, line, column) {
    super('Compound', null, line, column);
    this.operator = operator;
    this.args = args;
  }

  toString() {
    const args = this.args.map(a => a.toString()).join(' ');
    return `(${this.operator.toString()} ${args})`;
  }
}

/**
 * List expression [item1, item2, ...]
 */
export class List extends Expression {
  constructor(items, line, column) {
    super('List', items, line, column);
    this.items = items;
  }

  toString() {
    return `[${this.items.map(i => i.toString()).join(', ')}]`;
  }
}

/**
 * Theory block
 * theory Name { statements }
 */
export class TheoryDeclaration extends ASTNode {
  constructor(name, statements, line, column) {
    super('TheoryDeclaration', line, column);
    this.name = name;
    this.statements = statements;
  }
}

/**
 * Import statement
 * import TheoryName
 */
export class ImportStatement extends ASTNode {
  constructor(theoryName, line, column) {
    super('ImportStatement', line, column);
    this.theoryName = theoryName;
  }
}

/**
 * Rule declaration (sugar for Implies statement)
 * rule Name: (condition) => (conclusion)
 */
export class RuleDeclaration extends ASTNode {
  constructor(name, condition, conclusion, line, column) {
    super('RuleDeclaration', line, column);
    this.name = name;
    this.condition = condition;
    this.conclusion = conclusion;
  }
}

export default {
  ASTNode,
  Program,
  Statement,
  Expression,
  Identifier,
  Hole,
  Reference,
  Literal,
  Compound,
  List,
  TheoryDeclaration,
  ImportStatement,
  RuleDeclaration
};
