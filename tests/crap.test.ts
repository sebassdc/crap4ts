import { describe, it, expect } from 'vitest';
import { crapScore, sortByCrap, formatReport, formatJsonReport, formatMarkdownReport, CrapEntry } from '../src/crap';

describe('crapScore', () => {
  it('fully covered code scores exactly CC', () => {
    expect(crapScore(5, 100)).toBe(5);
    expect(crapScore(1, 100)).toBe(1);
  });

  it('zero coverage scores CC² + CC', () => {
    expect(crapScore(5, 0)).toBe(30);   // 25 + 5
    expect(crapScore(1, 0)).toBe(2);    // 1 + 1
    expect(crapScore(10, 0)).toBe(110); // 100 + 10
  });

  it('partial coverage is between the extremes', () => {
    const score = crapScore(8, 45);
    expect(score).toBeGreaterThan(8);     // better than 0% coverage
    expect(score).toBeLessThan(8 * 8 + 8); // worse than 100% coverage
  });

  it('uses the formula CC² × (1 - cov)³ + CC', () => {
    const cc = 4;
    const cov = 50;
    const uncov = 1 - cov / 100;
    const expected = cc * cc * uncov * uncov * uncov + cc;
    expect(crapScore(cc, cov)).toBeCloseTo(expected);
  });
});

describe('sortByCrap', () => {
  it('sorts descending by crap score', () => {
    const entries: CrapEntry[] = [
      { name: 'a', module: 'm', complexity: 1, coverage: 100, crap: 1 },
      { name: 'b', module: 'm', complexity: 5, coverage: 0, crap: 30 },
      { name: 'c', module: 'm', complexity: 3, coverage: 50, crap: 6 },
    ];
    const sorted = sortByCrap(entries);
    expect(sorted.map(e => e.name)).toEqual(['b', 'c', 'a']);
  });

  it('does not mutate the original array', () => {
    const entries: CrapEntry[] = [
      { name: 'a', module: 'm', complexity: 1, coverage: 100, crap: 5 },
      { name: 'b', module: 'm', complexity: 1, coverage: 100, crap: 1 },
    ];
    const original = [...entries];
    sortByCrap(entries);
    expect(entries).toEqual(original);
  });
});

describe('formatReport', () => {
  it('includes header lines', () => {
    const out = formatReport([]);
    expect(out).toContain('CRAP Report');
    expect(out).toContain('===========');
    expect(out).toContain('Function');
    expect(out).toContain('Module');
    expect(out).toContain('CC');
    expect(out).toContain('Cov%');
    expect(out).toContain('CRAP');
  });

  it('includes entry data', () => {
    const entries: CrapEntry[] = [
      { name: 'myFunc', module: 'my.module', complexity: 5, coverage: 45.0, crap: 18.6 },
    ];
    const out = formatReport(entries);
    expect(out).toContain('myFunc');
    expect(out).toContain('my.module');
    expect(out).toContain('5');
    expect(out).toContain('45.0%');
  });

  it('truncates long function names', () => {
    const entries: CrapEntry[] = [
      {
        name: 'thisIsAVeryLongFunctionNameThatExceedsTheLimit',
        module: 'mod',
        complexity: 1,
        coverage: 100,
        crap: 1,
      },
    ];
    const out = formatReport(entries);
    expect(out).toContain('thisIsAVeryLongFunctionNameTha');
    expect(out).not.toContain('thisIsAVeryLongFunctionNameThatExceedsTheLimit');
  });

  it('ends with a trailing newline', () => {
    expect(formatReport([])).toMatch(/\n$/);
  });
});

describe('formatMarkdownReport', () => {
  it('produces valid markdown table with header and separator', () => {
    const out = formatMarkdownReport([]);
    expect(out).toContain('# CRAP Report');
    expect(out).toContain('| Function | Module | CC | Cov% | CRAP |');
    expect(out).toContain('|---|---|---:|---:|---:|');
  });

  it('has correct column alignment markers (right-align for numbers)', () => {
    const out = formatMarkdownReport([]);
    const sep = '|---|---|---:|---:|---:|';
    expect(out).toContain(sep);
  });

  it('includes entry data in table rows', () => {
    const entries: CrapEntry[] = [
      { name: 'myFunc', module: 'my.module', complexity: 5, coverage: 45.0, crap: 18.6 },
    ];
    const out = formatMarkdownReport(entries);
    expect(out).toContain('| myFunc | my.module | 5 | 45.0% | 18.6 |');
  });

  it('ends with a trailing newline', () => {
    expect(formatMarkdownReport([])).toMatch(/\n$/);
  });
});

describe('formatJsonReport', () => {
  it('returns valid JSON with correct structure', () => {
    const entries: CrapEntry[] = [
      { name: 'myFunc', module: 'my.module', complexity: 5, coverage: 45.0, crap: 18.6 },
    ];
    const result = formatJsonReport(entries);
    const parsed = JSON.parse(result);
    expect(parsed.tool).toBe('crap4ts');
    expect(Array.isArray(parsed.entries)).toBe(true);
  });

  it('contains entries with expected fields', () => {
    const entries: CrapEntry[] = [
      { name: 'fn1', module: 'mod.a', complexity: 3, coverage: 80.0, crap: 4.2 },
      { name: 'fn2', module: 'mod.b', complexity: 10, coverage: 0, crap: 110 },
    ];
    const parsed = JSON.parse(formatJsonReport(entries));
    expect(parsed.entries).toHaveLength(2);
    for (const entry of parsed.entries) {
      expect(entry).toHaveProperty('name');
      expect(entry).toHaveProperty('module');
      expect(entry).toHaveProperty('complexity');
      expect(entry).toHaveProperty('coverage');
      expect(entry).toHaveProperty('crap');
    }
  });

  it('returns empty entries array when given no entries', () => {
    const parsed = JSON.parse(formatJsonReport([]));
    expect(parsed.tool).toBe('crap4ts');
    expect(parsed.entries).toEqual([]);
  });
});
