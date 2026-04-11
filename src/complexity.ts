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

function countDecisions(node: ts.Node): number {
  // Don't recurse into nested function-like nodes
  if (isFunctionLike(node)) return 0;

  let count = 0;

  if (ts.isIfStatement(node)) {
    count++;
  } else if (ts.isConditionalExpression(node)) {
    count++;
  } else if (
    ts.isForStatement(node) ||
    ts.isForInStatement(node) ||
    ts.isForOfStatement(node)
  ) {
    count++;
  } else if (ts.isWhileStatement(node) || ts.isDoStatement(node)) {
    count++;
  } else if (ts.isCatchClause(node)) {
    count++;
  } else if (ts.isCaseClause(node)) {
    // case X: counts; default: does not
    count++;
  } else if (ts.isBinaryExpression(node)) {
    const op = node.operatorToken.kind;
    if (
      op === ts.SyntaxKind.AmpersandAmpersandToken ||
      op === ts.SyntaxKind.BarBarToken ||
      op === ts.SyntaxKind.QuestionQuestionToken
    ) {
      count++;
    }
  }

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
      for (const decl of stmt.declarationList.declarations) {
        if (
          ts.isIdentifier(decl.name) &&
          decl.initializer &&
          (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))
        ) {
          add(decl.name.text, decl.initializer);
        }
      }
    } else if (ts.isClassDeclaration(stmt) && stmt.name) {
      const className = stmt.name.text;
      for (const member of stmt.members) {
        if (ts.isConstructorDeclaration(member)) {
          add(`${className}.constructor`, member);
        } else if (
          ts.isMethodDeclaration(member) ||
          ts.isGetAccessorDeclaration(member) ||
          ts.isSetAccessorDeclaration(member)
        ) {
          if (ts.isIdentifier(member.name)) {
            add(`${className}.${member.name.text}`, member);
          }
        }
      }
    }
  }

  return functions;
}
