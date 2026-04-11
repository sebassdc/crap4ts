import { describe, it, expect } from 'vitest';
import { coverageForRange, sourceToModule, FileCoverageData } from '../src/coverage';

function makeFileData(
  statements: Array<{ line: number; hits: number }>,
): FileCoverageData {
  const statementMap: FileCoverageData['statementMap'] = {};
  const s: FileCoverageData['s'] = {};
  statements.forEach(({ line, hits }, i) => {
    const id = String(i);
    statementMap[id] = {
      start: { line, column: 0 },
      end: { line, column: 10 },
    };
    s[id] = hits;
  });
  return { statementMap, s };
}

describe('coverageForRange', () => {
  it('returns 100 when all statements are covered', () => {
    const data = makeFileData([
      { line: 1, hits: 3 },
      { line: 2, hits: 1 },
      { line: 3, hits: 5 },
    ]);
    expect(coverageForRange(data, 1, 3)).toBe(100);
  });

  it('returns 0 when no statements are covered', () => {
    const data = makeFileData([
      { line: 1, hits: 0 },
      { line: 2, hits: 0 },
    ]);
    expect(coverageForRange(data, 1, 2)).toBe(0);
  });

  it('returns 50 when half covered', () => {
    const data = makeFileData([
      { line: 1, hits: 1 },
      { line: 2, hits: 0 },
    ]);
    expect(coverageForRange(data, 1, 2)).toBe(50);
  });

  it('returns 0 when no statements in range', () => {
    const data = makeFileData([{ line: 10, hits: 5 }]);
    expect(coverageForRange(data, 1, 3)).toBe(0);
  });

  it('only counts statements whose start line is in range', () => {
    const data = makeFileData([
      { line: 1, hits: 1 },  // in range
      { line: 5, hits: 0 },  // out of range
    ]);
    expect(coverageForRange(data, 1, 3)).toBe(100);
  });

  it('handles empty statementMap', () => {
    const data: FileCoverageData = { statementMap: {}, s: {} };
    expect(coverageForRange(data, 1, 10)).toBe(0);
  });

  it('includes start and end lines in range', () => {
    const data = makeFileData([
      { line: 5, hits: 1 },
      { line: 10, hits: 1 },
    ]);
    expect(coverageForRange(data, 5, 10)).toBe(100);
  });
});

describe('sourceToModule', () => {
  it('strips srcDir prefix and extension', () => {
    expect(sourceToModule('/project/src/foo.ts', '/project/src')).toBe('foo');
  });

  it('converts path separators to dots', () => {
    expect(sourceToModule('/project/src/foo/bar.ts', '/project/src')).toBe('foo.bar');
  });

  it('handles nested paths', () => {
    expect(sourceToModule('/project/src/a/b/c.ts', '/project/src')).toBe('a.b.c');
  });

  it('handles .tsx extension', () => {
    expect(sourceToModule('/project/src/Comp.tsx', '/project/src')).toBe('Comp');
  });

  it('handles trailing slash on srcDir', () => {
    expect(sourceToModule('/project/src/foo.ts', '/project/src/')).toBe('foo');
  });
});
