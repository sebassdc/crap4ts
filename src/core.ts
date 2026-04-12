import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { extractFunctions } from './complexity';
import { CoverageData, coverageForRange, normalizePath, sourceToModule } from './coverage';
import { CrapEntry, crapScore } from './crap';

export interface SourceScanOptions {
  srcDirs: string[];
  excludes: string[];
}

export function findSourceFilesWithOptions(opts: SourceScanOptions): string[] {
  const fileSet = new Set<string>();
  function walk(dir: string): void {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules') continue;
      const full = join(dir, entry);
      if (opts.excludes.some(ex => full.includes(ex))) continue;
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith('.d.ts')) {
        fileSet.add(full);
      }
    }
  }
  for (const srcDir of opts.srcDirs) {
    walk(srcDir);
  }
  return [...fileSet].sort();
}

export function findSourceFiles(srcDir: string): string[] {
  return findSourceFilesWithOptions({ srcDirs: [srcDir], excludes: [] });
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
  try {
    const source = readFileSync(filePath, 'utf-8');
    const fns = extractFunctions(source, filePath);
    const absolutePath = normalizePath(resolve(filePath));
    const module = sourceToModule(absolutePath, srcDir);

    const fileData = filesData[absolutePath] ?? { statementMap: {}, s: {} };

    return buildEntries(fns, fileData, module);
  } catch (e) {
    console.warn(`crap4ts: skipping ${filePath} (parse error: ${(e as Error).message})`);
    return [];
  }
}
