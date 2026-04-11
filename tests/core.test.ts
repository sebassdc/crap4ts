import { describe, it, expect } from 'vitest';
import { filterSources, buildEntries } from '../src/core';
import { FunctionInfo } from '../src/complexity';
import { FileCoverageData } from '../src/coverage';

describe('filterSources', () => {
  const files = ['src/foo.ts', 'src/bar.ts', 'src/baz/qux.ts'];

  it('returns all files when no filters given', () => {
    expect(filterSources(files, [])).toEqual(files);
  });

  it('filters by substring', () => {
    expect(filterSources(files, ['bar'])).toEqual(['src/bar.ts']);
  });

  it('matches any filter (OR logic)', () => {
    expect(filterSources(files, ['foo', 'qux'])).toEqual(['src/foo.ts', 'src/baz/qux.ts']);
  });

  it('returns empty when no matches', () => {
    expect(filterSources(files, ['zzz'])).toEqual([]);
  });
});

describe('buildEntries', () => {
  function makeFileData(statements: Array<{ line: number; hits: number }>): FileCoverageData {
    const statementMap: FileCoverageData['statementMap'] = {};
    const s: FileCoverageData['s'] = {};
    statements.forEach(({ line, hits }, i) => {
      const id = String(i);
      statementMap[id] = { start: { line, column: 0 }, end: { line, column: 10 } };
      s[id] = hits;
    });
    return { statementMap, s };
  }

  it('produces entries with correct fields', () => {
    const fns: FunctionInfo[] = [{ name: 'foo', startLine: 1, endLine: 3, complexity: 2 }];
    const fileData = makeFileData([{ line: 1, hits: 1 }, { line: 2, hits: 0 }]);
    const entries = buildEntries(fns, fileData, 'my.module');

    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe('foo');
    expect(entries[0].module).toBe('my.module');
    expect(entries[0].complexity).toBe(2);
    expect(entries[0].coverage).toBe(50);
    expect(entries[0].crap).toBeGreaterThan(2);
  });

  it('fully covered function has crap == complexity', () => {
    const fns: FunctionInfo[] = [{ name: 'bar', startLine: 1, endLine: 2, complexity: 3 }];
    const fileData = makeFileData([{ line: 1, hits: 5 }, { line: 2, hits: 3 }]);
    const entries = buildEntries(fns, fileData, 'mod');
    expect(entries[0].crap).toBe(3);
  });

  it('zero coverage function has crap == CC² + CC', () => {
    const fns: FunctionInfo[] = [{ name: 'bad', startLine: 1, endLine: 2, complexity: 4 }];
    const fileData = makeFileData([{ line: 1, hits: 0 }, { line: 2, hits: 0 }]);
    const entries = buildEntries(fns, fileData, 'mod');
    expect(entries[0].crap).toBe(20); // 4² + 4
  });

  it('no statements in range gives 100% coverage (uninstrumented)', () => {
    const fns: FunctionInfo[] = [{ name: 'empty', startLine: 1, endLine: 2, complexity: 1 }];
    const fileData: FileCoverageData = { statementMap: {}, s: {} };
    const entries = buildEntries(fns, fileData, 'mod');
    expect(entries[0].coverage).toBe(100);
  });
});
