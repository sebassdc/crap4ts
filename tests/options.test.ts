import { describe, it, expect } from 'vitest';
import { parseOptions } from '../src/options';

describe('parseOptions', () => {
  it('returns defaults when given no args', () => {
    expect(parseOptions([])).toEqual({
      mode: 'report', filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 600_000, output: 'text', excludes: [],
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
      mode: 'help', filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 600_000, output: 'text', excludes: [],
    });
  });

  it('returns mode: help for -h', () => {
    expect(parseOptions(['-h'])).toEqual({
      mode: 'help', filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 600_000, output: 'text', excludes: [],
    });
  });

  it('returns mode: version for --version', () => {
    expect(parseOptions(['--version'])).toEqual({
      mode: 'version', filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 600_000, output: 'text', excludes: [],
    });
  });

  it('returns mode: version for -v', () => {
    expect(parseOptions(['-v'])).toEqual({
      mode: 'version', filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 600_000, output: 'text', excludes: [],
    });
  });

  it('parses --json flag and sets output to json', () => {
    expect(parseOptions(['--json'])).toEqual({
      mode: 'report', filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 600_000, output: 'json', excludes: [],
    });
  });

  it('default output is text', () => {
    expect(parseOptions([])).toHaveProperty('output', 'text');
  });

  it('parses --runner vitest', () => {
    const o = parseOptions(['--runner', 'vitest']);
    expect(o.runner).toBe('vitest');
  });

  it('parses --runner jest', () => {
    const o = parseOptions(['--runner', 'jest']);
    expect(o.runner).toBe('jest');
  });

  it('throws for --runner with invalid value', () => {
    expect(() => parseOptions(['--runner', 'invalid'])).toThrow("--runner must be 'vitest' or 'jest', got: invalid");
  });

  it('throws for --runner without argument', () => {
    expect(() => parseOptions(['--runner'])).toThrow('--runner requires an argument');
  });

  it('parses --coverage-command', () => {
    const o = parseOptions(['--coverage-command', 'npm test -- --coverage']);
    expect(o.coverageCommand).toBe('npm test -- --coverage');
  });

  it('defaults runner and coverageCommand to undefined', () => {
    const o = parseOptions([]);
    expect(o.runner).toBeUndefined();
    expect(o.coverageCommand).toBeUndefined();
  });

  it('parses --exclude into excludes array', () => {
    const o = parseOptions(['--exclude', 'dist']);
    expect(o.excludes).toEqual(['dist']);
  });

  it('accumulates multiple --exclude flags', () => {
    const o = parseOptions(['--exclude', 'dist', '--exclude', 'fixtures', '--exclude', '__generated__']);
    expect(o.excludes).toEqual(['dist', 'fixtures', '__generated__']);
  });

  it('defaults excludes to empty array', () => {
    const o = parseOptions([]);
    expect(o.excludes).toEqual([]);
  });

  it('throws for --exclude without argument', () => {
    expect(() => parseOptions(['--exclude'])).toThrow('--exclude requires a pattern argument');
  });
});
