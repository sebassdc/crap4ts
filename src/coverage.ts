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

function assertValidCoverage(data: unknown): asserts data is CoverageData {
  if (!data || typeof data !== 'object') {
    throw new Error('coverage-final.json is not an object');
  }
  for (const [key, entry] of Object.entries(data as Record<string, unknown>)) {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`coverage-final.json entry ${key} is not an object`);
    }
    const e = entry as Record<string, unknown>;
    if (!e.statementMap || typeof e.statementMap !== 'object') {
      throw new Error(`coverage-final.json entry ${key} missing statementMap`);
    }
    if (!e.s || typeof e.s !== 'object') {
      throw new Error(`coverage-final.json entry ${key} missing s`);
    }
  }
}

export function parseCoverage(coverageDir: string): CoverageData {
  const jsonPath = join(coverageDir, 'coverage-final.json');
  const content = readFileSync(jsonPath, 'utf-8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`coverage-final.json is not valid JSON: ${message}`);
  }
  assertValidCoverage(parsed);
  return parsed;
}

export function coverageForRange(
  fileData: FileCoverageData,
  startLine: number,
  endLine: number,
): number {
  let total = 0;
  let covered = 0;

  for (const [id, loc] of Object.entries(fileData.statementMap)) {
    // Overlap check: statement overlaps function if it starts before the function ends
    // AND ends after the function starts (standard range-overlap test).
    if (loc.start.line <= endLine && loc.end.line >= startLine) {
      total++;
      if ((fileData.s[id] ?? 0) > 0) covered++;
    }
  }

  if (total === 0) return 100.0;
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
