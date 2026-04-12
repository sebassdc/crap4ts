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

  it('parses --output markdown', () => {
    const o = parseOptions(['--output', 'markdown']);
    expect(o.output).toBe('markdown');
  });

  it('parses --output csv', () => {
    const o = parseOptions(['--output', 'csv']);
    expect(o.output).toBe('csv');
  });

  it('parses --output json', () => {
    const o = parseOptions(['--output', 'json']);
    expect(o.output).toBe('json');
  });

  it('throws for --output with invalid format', () => {
    expect(() => parseOptions(['--output', 'xml'])).toThrow(/--output must be one of/);
  });

  it('throws for --output without argument', () => {
    expect(() => parseOptions(['--output'])).toThrow(/--output must be one of/);
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

  // Threshold flags
  it('parses --fail-on-crap', () => {
    const o = parseOptions(['--fail-on-crap', '30']);
    expect(o.failOnCrap).toBe(30);
  });

  it('parses --fail-on-complexity', () => {
    const o = parseOptions(['--fail-on-complexity', '10']);
    expect(o.failOnComplexity).toBe(10);
  });

  it('parses --fail-on-coverage-below', () => {
    const o = parseOptions(['--fail-on-coverage-below', '80']);
    expect(o.failOnCoverageBelow).toBe(80);
  });

  it('parses --top', () => {
    const o = parseOptions(['--top', '20']);
    expect(o.top).toBe(20);
  });

  it('defaults threshold options to undefined', () => {
    const o = parseOptions([]);
    expect(o.failOnCrap).toBeUndefined();
    expect(o.failOnComplexity).toBeUndefined();
    expect(o.failOnCoverageBelow).toBeUndefined();
    expect(o.top).toBeUndefined();
  });

  it('throws for --fail-on-crap with non-numeric value', () => {
    expect(() => parseOptions(['--fail-on-crap', 'abc'])).toThrow(/--fail-on-crap requires a positive number/);
  });

  it('throws for --fail-on-crap with negative value', () => {
    expect(() => parseOptions(['--fail-on-crap', '-5'])).toThrow(/--fail-on-crap requires a positive number/);
  });

  it('throws for --fail-on-crap without argument', () => {
    expect(() => parseOptions(['--fail-on-crap'])).toThrow(/--fail-on-crap requires a positive number/);
  });

  it('throws for --fail-on-complexity with invalid value', () => {
    expect(() => parseOptions(['--fail-on-complexity', 'xyz'])).toThrow(/--fail-on-complexity requires a positive number/);
  });

  it('throws for --fail-on-complexity without argument', () => {
    expect(() => parseOptions(['--fail-on-complexity'])).toThrow(/--fail-on-complexity requires a positive number/);
  });

  it('throws for --fail-on-coverage-below with value over 100', () => {
    expect(() => parseOptions(['--fail-on-coverage-below', '150'])).toThrow(/--fail-on-coverage-below requires a number between 0 and 100/);
  });

  it('throws for --fail-on-coverage-below with negative value', () => {
    expect(() => parseOptions(['--fail-on-coverage-below', '-10'])).toThrow(/--fail-on-coverage-below requires a number between 0 and 100/);
  });

  it('throws for --fail-on-coverage-below without argument', () => {
    expect(() => parseOptions(['--fail-on-coverage-below'])).toThrow(/--fail-on-coverage-below requires a number between 0 and 100/);
  });

  it('throws for --top with non-integer value', () => {
    expect(() => parseOptions(['--top', '2.5'])).toThrow(/--top requires a positive integer/);
  });

  it('throws for --top with negative value', () => {
    expect(() => parseOptions(['--top', '-1'])).toThrow(/--top requires a positive integer/);
  });

  it('throws for --top without argument', () => {
    expect(() => parseOptions(['--top'])).toThrow(/--top requires a positive integer/);
  });
});
