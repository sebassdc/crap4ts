import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { extractFunctions } from './complexity';
import { CoverageData, coverageForRange, sourceToModule } from './coverage';
import { CrapEntry, crapScore } from './crap';

export function findSourceFiles(srcDir: string): string[] {
  const files: string[] = [];
  function walk(dir: string): void {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules') continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith('.d.ts')) {
        files.push(full);
      }
    }
  }
  walk(srcDir);
  return files.sort();
}

export function filterSources(files: string[], filters: string[]): string[] {
  if (filters.length === 0) return files;
  return files.filter(f => filters.some(filter => f.includes(filter)));
}

export function buildEntries(
  fns: ReturnType<typeof extractFunctions>,
  fileData: { statementMap: Record<string, { start: { line: number; column: number }; end: { line: number; column: number } }>; s: Record<string, number> },
  module: string,
): CrapEntry[] {
  return fns.map(fn => {
    const cov = coverageForRange(fileData, fn.startLine, fn.endLine);
    return {
      name: fn.name,
      module,
      complexity: fn.complexity,
      coverage: cov,
      crap: crapScore(fn.complexity, cov),
    };
  });
}

export function analyzeFile(filePath: string, filesData: CoverageData, srcDir: string): CrapEntry[] {
  const source = readFileSync(filePath, 'utf-8');
  const fns = extractFunctions(source, filePath);
  const absolutePath = resolve(filePath);
  const module = sourceToModule(absolutePath, srcDir);

  const fileData = filesData[absolutePath] ?? { statementMap: {}, s: {} };

  return buildEntries(fns, fileData, module);
}
