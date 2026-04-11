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
