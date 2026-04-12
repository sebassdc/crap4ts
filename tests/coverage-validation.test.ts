import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { parseCoverage } from '../src/coverage';

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'crap4ts-covval-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

function writeCov(obj: unknown) {
  writeFileSync(join(dir, 'coverage-final.json'), JSON.stringify(obj));
}

describe('assertValidCoverage — all branches', () => {
  it('rejects null', () => {
    writeCov(null);
    expect(() => parseCoverage(dir)).toThrow('not an object');
  });

  it('rejects a number', () => {
    writeCov(42);
    expect(() => parseCoverage(dir)).toThrow('not an object');
  });

  it('rejects a string', () => {
    writeCov('"hello"');
    // JSON.parse of a string-in-string
    writeFileSync(join(dir, 'coverage-final.json'), '"hello"');
    expect(() => parseCoverage(dir)).toThrow('not an object');
  });

  it('rejects entry that is null', () => {
    writeCov({ '/x.ts': null });
    expect(() => parseCoverage(dir)).toThrow('not an object');
  });

  it('rejects entry that is a number', () => {
    writeCov({ '/x.ts': 123 });
    expect(() => parseCoverage(dir)).toThrow('not an object');
  });

  it('rejects entry missing statementMap', () => {
    writeCov({ '/x.ts': { s: {} } });
    expect(() => parseCoverage(dir)).toThrow('statementMap');
  });

  it('rejects entry where statementMap is not an object', () => {
    writeCov({ '/x.ts': { statementMap: 'bad', s: {} } });
    expect(() => parseCoverage(dir)).toThrow('statementMap');
  });

  it('rejects entry missing s', () => {
    writeCov({ '/x.ts': { statementMap: {} } });
    expect(() => parseCoverage(dir)).toThrow('missing s');
  });

  it('rejects entry where s is not an object', () => {
    writeCov({ '/x.ts': { statementMap: {}, s: 'bad' } });
    expect(() => parseCoverage(dir)).toThrow('missing s');
  });

  it('accepts valid coverage data', () => {
    writeCov({
      '/x.ts': {
        statementMap: { '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } } },
        s: { '0': 1 },
      },
    });
    const data = parseCoverage(dir);
    expect(data).toHaveProperty('/x.ts');
  });

  it('accepts empty object', () => {
    writeCov({});
    const data = parseCoverage(dir);
    expect(data).toEqual({});
  });

  it('validates multiple entries', () => {
    writeCov({
      '/a.ts': { statementMap: {}, s: {} },
      '/b.ts': { statementMap: {}, s: {} },
    });
    const data = parseCoverage(dir);
    expect(Object.keys(data)).toHaveLength(2);
  });
});
