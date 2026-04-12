import { describe, it, expect } from 'vitest';
import { parseOptions } from '../src/options';

describe('parseOptions', () => {
  it('returns defaults when given no args', () => {
    expect(parseOptions([])).toEqual({
      mode: 'report', filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 600_000, output: 'text',
    });
  });

  it('parses --src and --timeout and treats the rest as filters', () => {
    const o = parseOptions(['--src', 'lib', '--timeout', '30', 'parser', 'validator']);
    expect(o.mode).toBe('report');
    expect(o.srcDir).toBe('lib');
    expect(o.timeoutMs).toBe(30_000);
    expect(o.filters).toEqual(['parser', 'validator']);
    expect(o.output).toBe('text');
  });

  it('rejects non-numeric --timeout', () => {
    expect(() => parseOptions(['--timeout', 'abc'])).toThrow(/timeout/);
  });

  it('returns mode: help for --help', () => {
    expect(parseOptions(['--help'])).toEqual({
      mode: 'help', filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 600_000, output: 'text',
    });
  });

  it('returns mode: help for -h', () => {
    expect(parseOptions(['-h'])).toEqual({
      mode: 'help', filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 600_000, output: 'text',
    });
  });

  it('returns mode: version for --version', () => {
    expect(parseOptions(['--version'])).toEqual({
      mode: 'version', filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 600_000, output: 'text',
    });
  });

  it('returns mode: version for -v', () => {
    expect(parseOptions(['-v'])).toEqual({
      mode: 'version', filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 600_000, output: 'text',
    });
  });

  it('parses --json flag and sets output to json', () => {
    expect(parseOptions(['--json'])).toEqual({
      mode: 'report', filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 600_000, output: 'json',
    });
  });

  it('default output is text', () => {
    expect(parseOptions([])).toHaveProperty('output', 'text');
  });
});
