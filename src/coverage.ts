import { readFileSync } from 'fs';
import { join } from 'path';

interface Location {
  line: number;
  column: number;
}

interface Range {
  start: Location;
  end: Location;
}

export interface FileCoverageData {
  statementMap: Record<string, Range>;
  s: Record<string, number>;
}

export type CoverageData = Record<string, FileCoverageData>;

export function parseCoverage(coverageDir: string): CoverageData {
  const jsonPath = join(coverageDir, 'coverage-final.json');
  const content = readFileSync(jsonPath, 'utf-8');
  return JSON.parse(content) as CoverageData;
}

export function coverageForRange(
  fileData: FileCoverageData,
  startLine: number,
  endLine: number,
): number {
  let total = 0;
  let covered = 0;

  for (const [id, loc] of Object.entries(fileData.statementMap)) {
    // Istanbul uses 1-based line numbers
    if (loc.start.line >= startLine && loc.start.line <= endLine) {
      total++;
      if ((fileData.s[id] ?? 0) > 0) covered++;
    }
  }

  if (total === 0) return 0.0;
  return (covered / total) * 100;
}

export function sourceToModule(filePath: string, srcDir: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const src = srcDir.replace(/\\/g, '/').replace(/\/$/, '') + '/';

  let mod = normalized;
  if (mod.startsWith(src)) {
    mod = mod.slice(src.length);
  }

  mod = mod.replace(/\.(ts|tsx|js|jsx)$/, '');
  return mod.replace(/\//g, '.');
}
