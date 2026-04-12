import ts from 'typescript';

export interface FunctionInfo {
  name: string;
  startLine: number;
  endLine: number;
  complexity: number;
}

function isFunctionLike(node: ts.Node): boolean {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isArrowFunction(node) ||
    ts.isFunctionExpression(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  );
}

const DECISION_KINDS = new Set([
  ts.SyntaxKind.IfStatement,
  ts.SyntaxKind.ConditionalExpression,
  ts.SyntaxKind.ForStatement,
  ts.SyntaxKind.ForInStatement,
  ts.SyntaxKind.ForOfStatement,
  ts.SyntaxKind.WhileStatement,
  ts.SyntaxKind.DoStatement,
  ts.SyntaxKind.CatchClause,
  ts.SyntaxKind.CaseClause,
]);

const LOGICAL_OPS = new Set([
  ts.SyntaxKind.AmpersandAmpersandToken,
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.QuestionQuestionToken,
]);

function nodeDecisionCount(node: ts.Node): number {
  if (DECISION_KINDS.has(node.kind)) return 1;
  if (ts.isBinaryExpression(node) && LOGICAL_OPS.has(node.operatorToken.kind)) return 1;
  return 0;
}

function countDecisions(node: ts.Node): number {
  if (isFunctionLike(node)) return 0;

  let count = nodeDecisionCount(node);

  node.forEachChild(child => {
    count += countDecisions(child);
  });

  return count;
}

function computeComplexity(node: ts.FunctionLikeDeclaration): number {
  const body = node.body;
  if (!body) return 1; // abstract method or overload signature
  return 1 + countDecisions(body);
}

type AddFn = (name: string, node: ts.FunctionLikeDeclaration) => void;

function visitObjectLiteralMethods(varName: string, obj: ts.ObjectLiteralExpression, add: AddFn): void {
  for (const prop of obj.properties) {
    if (
      ts.isMethodDeclaration(prop) ||
      ts.isGetAccessorDeclaration(prop) ||
      ts.isSetAccessorDeclaration(prop)
    ) {
      if (ts.isIdentifier(prop.name)) {
        add(`${varName}.${prop.name.text}`, prop);
      } else if (ts.isStringLiteral(prop.name)) {
        add(`${varName}['${prop.name.text}']`, prop);
      }
      // Skip computed property names (e.g., [Symbol.iterator])
    }
  }
}

function visitVariableStatement(stmt: ts.VariableStatement, add: AddFn): void {
  for (const decl of stmt.declarationList.declarations) {
    if (!ts.isIdentifier(decl.name) || !decl.initializer) continue;

    if (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer)) {
      add(decl.name.text, decl.initializer);
    } else if (ts.isObjectLiteralExpression(decl.initializer)) {
      visitObjectLiteralMethods(decl.name.text, decl.initializer, add);
    }
  }
}

function visitClassDeclaration(stmt: ts.ClassDeclaration, add: AddFn): void {
  if (!stmt.name) return;
  const className = stmt.name.text;
  for (const member of stmt.members) {
    if (ts.isConstructorDeclaration(member)) {
      add(`${className}.constructor`, member);
    } else if (
      (ts.isMethodDeclaration(member) || ts.isGetAccessorDeclaration(member) || ts.isSetAccessorDeclaration(member)) &&
      ts.isIdentifier(member.name)
    ) {
      add(`${className}.${member.name.text}`, member);
    }
  }
}

export function extractFunctions(source: string, filePath = 'file.ts'): FunctionInfo[] {
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
  const functions: FunctionInfo[] = [];

  function lineOf(pos: number): number {
    return sourceFile.getLineAndCharacterOfPosition(pos).line + 1;
  }

  function add(name: string, node: ts.FunctionLikeDeclaration): void {
    functions.push({
      name,
      startLine: lineOf(node.getStart(sourceFile)),
      endLine: lineOf(node.getEnd()),
      complexity: computeComplexity(node),
    });
  }

  for (const stmt of sourceFile.statements) {
    if (ts.isFunctionDeclaration(stmt) && stmt.name) {
      add(stmt.name.text, stmt);
    } else if (ts.isVariableStatement(stmt)) {
      visitVariableStatement(stmt, add);
    } else if (ts.isClassDeclaration(stmt)) {
      visitClassDeclaration(stmt, add);
    }
  }

  return functions;
}
