import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { parseCoverage, coverageForRange, FileCoverageData } from '../src/coverage';

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'crap4ts-cov-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

function writeCov(obj: unknown) {
  writeFileSync(join(dir, 'coverage-final.json'), JSON.stringify(obj));
}

/** Helper: build FileCoverageData with multi-line statement support */
function makeRangeData(
  statements: Array<{ startLine: number; endLine: number; hits: number }>,
): FileCoverageData {
  const statementMap: FileCoverageData['statementMap'] = {};
  const s: FileCoverageData['s'] = {};
  statements.forEach(({ startLine, endLine, hits }, i) => {
    const id = String(i);
    statementMap[id] = {
      start: { line: startLine, column: 0 },
      end: { line: endLine, column: 10 },
    };
    s[id] = hits;
  });
  return { statementMap, s };
}

describe('parseCoverage validation', () => {
  it('rejects malformed JSON', () => {
    writeFileSync(join(dir, 'coverage-final.json'), '{not json');
    expect(() => parseCoverage(dir)).toThrow(/coverage-final\.json/);
  });

  it('rejects entries missing statementMap or s', () => {
    writeCov({ '/x.ts': { path: '/x.ts' } });
    expect(() => parseCoverage(dir)).toThrow(/statementMap|s\b/);
  });
});

describe('coverageForRange — uninstrumented ranges', () => {
  it('returns 100 when no statements overlap the function range', () => {
    const fileData: FileCoverageData = { statementMap: {}, s: {} };
    expect(coverageForRange(fileData, 1, 20)).toBe(100);
  });
});

describe('coverageForRange — overlap attribution', () => {
  // 1. Statement starts inside function, ends outside → counted
  it('counts statement starting inside function but ending outside', () => {
    // Function: lines 10-20, Statement: lines 15-25
    const data = makeRangeData([{ startLine: 15, endLine: 25, hits: 1 }]);
    expect(coverageForRange(data, 10, 20)).toBe(100);
  });

  // 2. Statement starts before function, ends inside → should be counted (overlap)
  it('counts statement starting before function but ending inside', () => {
    // Function: lines 10-20
    // Statement A: lines 5-15 (starts before, ends inside) — covered
    // Statement B: lines 12-14 (fully inside) — NOT covered
    // With overlap logic: 2 total, 1 covered → 50%
    // With start-only logic: 1 total (only B), 0 covered → 0%
    const data = makeRangeData([
      { startLine: 5, endLine: 15, hits: 1 },
      { startLine: 12, endLine: 14, hits: 0 },
    ]);
    expect(coverageForRange(data, 10, 20)).toBe(50);
  });

  // 3. Statement completely contains the function range → counted
  it('counts statement that completely contains the function range', () => {
    // Function: lines 10-20
    // Statement A: lines 5-25 (contains function) — covered
    // Statement B: lines 11-13 (fully inside) — NOT covered
    // With overlap logic: 2 total, 1 covered → 50%
    // With start-only logic: 1 total (only B), 0 covered → 0%
    const data = makeRangeData([
      { startLine: 5, endLine: 25, hits: 1 },
      { startLine: 11, endLine: 13, hits: 0 },
    ]);
    expect(coverageForRange(data, 10, 20)).toBe(50);
  });

  // 4. Statement completely outside → not counted
  it('does not count statement completely outside function range', () => {
    // Function: lines 10-20, Statement: lines 25-30
    const data = makeRangeData([{ startLine: 25, endLine: 30, hits: 0 }]);
    expect(coverageForRange(data, 10, 20)).toBe(100); // 0 total → 100
  });

  // 5. Adjacent functions get correct separate attribution
  it('attributes statements to correct adjacent functions', () => {
    const data = makeRangeData([
      { startLine: 1, endLine: 5, hits: 1 },   // only in fn1
      { startLine: 8, endLine: 12, hits: 0 },  // only in fn2
    ]);
    // fn1: lines 1-6
    expect(coverageForRange(data, 1, 6)).toBe(100);
    // fn2: lines 7-15
    expect(coverageForRange(data, 7, 15)).toBe(0);
  });

  // 6. Zero statements in function range → 100%
  it('returns 100 when zero statements in function range', () => {
    const data = makeRangeData([{ startLine: 50, endLine: 55, hits: 0 }]);
    expect(coverageForRange(data, 1, 10)).toBe(100);
  });

  // 7. Sparse statement map (gaps in IDs) works correctly
  it('handles sparse statement map with non-sequential IDs', () => {
    const fileData: FileCoverageData = {
      statementMap: {
        '0': { start: { line: 2, column: 0 }, end: { line: 2, column: 10 } },
        '5': { start: { line: 4, column: 0 }, end: { line: 4, column: 10 } },
        '99': { start: { line: 6, column: 0 }, end: { line: 6, column: 10 } },
      },
      s: { '0': 1, '5': 0, '99': 1 },
    };
    // Function lines 1-10: all 3 statements overlap
    const result = coverageForRange(fileData, 1, 10);
    expect(result).toBeCloseTo(66.67, 1); // 2 of 3 covered
  });
});
