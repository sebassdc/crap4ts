import { describe, it, expect } from 'vitest';
import { parseOptions } from '../src/options';

describe('parseOptions', () => {
  it('returns defaults when given no args', () => {
    expect(parseOptions([])).toEqual({
      filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 600_000,
    });
  });

  it('parses --src and --timeout and treats the rest as filters', () => {
    const o = parseOptions(['--src', 'lib', '--timeout', '30', 'parser', 'validator']);
    expect(o.srcDir).toBe('lib');
    expect(o.timeoutMs).toBe(30_000);
    expect(o.filters).toEqual(['parser', 'validator']);
  });

  it('rejects non-numeric --timeout', () => {
    expect(() => parseOptions(['--timeout', 'abc'])).toThrow(/timeout/);
  });
});
