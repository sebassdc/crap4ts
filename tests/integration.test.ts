import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return { ...actual, spawnSync: vi.fn() };
});

import { spawnSync } from 'child_process';
import { runReport, detectRunner } from '../src/report';
import { runCli } from '../src/cli';

const mockSpawnSync = vi.mocked(spawnSync);

const FIXTURES = resolve(__dirname, 'fixtures');
const VITEST_FIXTURE = join(FIXTURES, 'vitest-basic');
const JEST_FIXTURE = join(FIXTURES, 'jest-basic');
const MISSING_FIXTURE = join(FIXTURES, 'missing-coverage');

function buildCoverageJson(fixtureDir: string, files: Record<string, { statements: Array<{ startLine: number; endLine: number; hits: number }> }>): string {
  const coverage: Record<string, any> = {};
  for (const [relPath, data] of Object.entries(files)) {
    const absPath = resolve(fixtureDir, 'src', relPath);
    const statementMap: Record<string, any> = {};
    const s: Record<string, number> = {};
    data.statements.forEach((stmt, i) => {
      statementMap[String(i)] = {
        start: { line: stmt.startLine, column: 0 },
        end: { line: stmt.endLine, column: 100 },
      };
      s[String(i)] = stmt.hits;
    });
    coverage[absPath] = { statementMap, s };
  }
  return JSON.stringify(coverage);
}

/**
 * Mock spawnSync to simulate a successful coverage run that writes
 * coverage-final.json with resolved absolute paths into the coverage dir.
 */
function mockSpawnWithCoverage(fixtureDir: string, coverageJson: string): void {
  mockSpawnSync.mockImplementation(() => {
    const coverageDir = join(fixtureDir, 'coverage');
    mkdirSync(coverageDir, { recursive: true });
    writeFileSync(join(coverageDir, 'coverage-final.json'), coverageJson);
    return {
      status: 0, signal: null, output: [], stdout: Buffer.from(''), stderr: Buffer.from(''), pid: 1234,
    } as any;
  });
}

function mockSpawnSuccessNoCoverage(): void {
  mockSpawnSync.mockReturnValue({
    status: 0, signal: null, output: [], stdout: Buffer.from(''), stderr: Buffer.from(''), pid: 1234,
  } as any);
}

const VITEST_COVERAGE = () => buildCoverageJson(VITEST_FIXTURE, {
  'math.ts': {
    statements: [
      { startLine: 1, endLine: 6, hits: 5 },
      { startLine: 2, endLine: 4, hits: 5 },
      { startLine: 3, endLine: 3, hits: 2 },
      { startLine: 5, endLine: 5, hits: 3 },
      { startLine: 8, endLine: 13, hits: 4 },
      { startLine: 9, endLine: 11, hits: 4 },
      { startLine: 10, endLine: 10, hits: 1 },
      { startLine: 12, endLine: 12, hits: 3 },
    ],
  },
});

const JEST_COVERAGE = () => buildCoverageJson(JEST_FIXTURE, {
  'utils.ts': {
    statements: [
      { startLine: 1, endLine: 9, hits: 3 },
      { startLine: 2, endLine: 4, hits: 3 },
      { startLine: 3, endLine: 3, hits: 1 },
      { startLine: 5, endLine: 7, hits: 2 },
      { startLine: 6, endLine: 6, hits: 1 },
      { startLine: 8, endLine: 8, hits: 1 },
      { startLine: 11, endLine: 13, hits: 2 },
      { startLine: 12, endLine: 12, hits: 2 },
    ],
  },
});

describe('integration: fixture-based runReport', () => {
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    mockSpawnSync.mockReset();
  });

  afterEach(() => {
    process.chdir(originalCwd);
  });

  describe('vitest-basic fixture', () => {
    beforeEach(() => {
      process.chdir(VITEST_FIXTURE);
    });

    it('detects vitest runner from vitest.config.ts', () => {
      expect(detectRunner()).toBe('vitest');
    });

    it('produces a report with expected functions (add, multiply)', async () => {
      mockSpawnWithCoverage(VITEST_FIXTURE, VITEST_COVERAGE());

      const logs: string[] = [];
      const log = vi.spyOn(console, 'log').mockImplementation((m: unknown) => { logs.push(String(m)); });
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const code = await runReport({
        filters: [],
        srcDir: 'src',
        coverageDir: 'coverage',
        timeoutMs: 60000,
        output: 'text',
        excludes: [],
      });

      expect(code).toBe(0);
      const output = logs.join('\n');
      expect(output).toContain('CRAP Report');
      expect(output).toContain('add');
      expect(output).toContain('multiply');

      log.mockRestore();
      warn.mockRestore();
    });

    it('produces JSON report with both functions', async () => {
      mockSpawnWithCoverage(VITEST_FIXTURE, VITEST_COVERAGE());

      const logs: string[] = [];
      const log = vi.spyOn(console, 'log').mockImplementation((m: unknown) => { logs.push(String(m)); });
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const code = await runReport({
        filters: [],
        srcDir: 'src',
        coverageDir: 'coverage',
        timeoutMs: 60000,
        output: 'json',
        excludes: [],
      });

      expect(code).toBe(0);
      const parsed = JSON.parse(logs.join('\n'));
      expect(parsed.tool).toBe('crap4ts');
      const names = parsed.entries.map((e: any) => e.name);
      expect(names).toContain('add');
      expect(names).toContain('multiply');

      log.mockRestore();
      warn.mockRestore();
    });
  });

  describe('jest-basic fixture', () => {
    beforeEach(() => {
      process.chdir(JEST_FIXTURE);
    });

    it('detects jest runner from jest.config.ts', () => {
      expect(detectRunner()).toBe('jest');
    });

    it('produces a report with expected functions (clamp, isEven)', async () => {
      mockSpawnWithCoverage(JEST_FIXTURE, JEST_COVERAGE());

      const logs: string[] = [];
      const log = vi.spyOn(console, 'log').mockImplementation((m: unknown) => { logs.push(String(m)); });
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const code = await runReport({
        filters: [],
        srcDir: 'src',
        coverageDir: 'coverage',
        timeoutMs: 60000,
        output: 'text',
        excludes: [],
      });

      expect(code).toBe(0);
      const output = logs.join('\n');
      expect(output).toContain('CRAP Report');
      expect(output).toContain('clamp');
      expect(output).toContain('isEven');

      log.mockRestore();
      warn.mockRestore();
    });
  });

  describe('missing-coverage fixture', () => {
    beforeEach(() => {
      process.chdir(MISSING_FIXTURE);
    });

    it('produces actionable error about missing coverage-final.json', async () => {
      mockSpawnSuccessNoCoverage();

      const errs: string[] = [];
      const err = vi.spyOn(console, 'error').mockImplementation((m: unknown) => { errs.push(String(m)); });

      const code = await runReport({
        filters: [],
        srcDir: 'src',
        coverageDir: 'coverage',
        timeoutMs: 60000,
        output: 'text',
        excludes: [],
      });

      expect(code).toBe(1);
      const errorOutput = errs.join('\n');
      expect(errorOutput).toContain('coverage-final.json');
      expect(errorOutput).toContain('Istanbul');

      err.mockRestore();
    });
  });
});

describe('integration: CLI output contract tests', () => {
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    mockSpawnSync.mockReset();
  });

  afterEach(() => {
    process.chdir(originalCwd);
  });

  it('text output contains "CRAP Report" header', async () => {
    process.chdir(VITEST_FIXTURE);
    mockSpawnWithCoverage(VITEST_FIXTURE, VITEST_COVERAGE());

    const logs: string[] = [];
    const log = vi.spyOn(console, 'log').mockImplementation((m: unknown) => { logs.push(String(m)); });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const code = await runCli([]);
    expect(code).toBe(0);
    expect(logs.join('\n')).toContain('CRAP Report');

    log.mockRestore();
    warn.mockRestore();
  });

  it('JSON output (--json) is valid JSON with tool and entries fields', async () => {
    process.chdir(VITEST_FIXTURE);
    mockSpawnWithCoverage(VITEST_FIXTURE, VITEST_COVERAGE());

    const logs: string[] = [];
    const log = vi.spyOn(console, 'log').mockImplementation((m: unknown) => { logs.push(String(m)); });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const code = await runCli(['--json']);
    expect(code).toBe(0);

    const parsed = JSON.parse(logs.join('\n'));
    expect(parsed).toHaveProperty('tool');
    expect(parsed).toHaveProperty('entries');
    expect(parsed.tool).toBe('crap4ts');
    expect(Array.isArray(parsed.entries)).toBe(true);

    log.mockRestore();
    warn.mockRestore();
  });

  it('missing src dir returns exit code 1 with actionable message', async () => {
    process.chdir(MISSING_FIXTURE);

    const errs: string[] = [];
    const err = vi.spyOn(console, 'error').mockImplementation((m: unknown) => { errs.push(String(m)); });

    const code = await runCli(['--src', 'nonexistent']);
    expect(code).toBe(1);
    const errorOutput = errs.join('\n');
    expect(errorOutput).toContain('not found');
    expect(errorOutput).toContain('--src');

    err.mockRestore();
  });

  it('--help works regardless of cwd', async () => {
    process.chdir(MISSING_FIXTURE);

    const logs: string[] = [];
    const log = vi.spyOn(console, 'log').mockImplementation((m: unknown) => { logs.push(String(m)); });

    const code = await runCli(['--help']);
    expect(code).toBe(0);
    const output = logs.join('\n');
    expect(output).toContain('Usage');
    expect(output).toContain('Options');

    log.mockRestore();
  });

  it('--version works regardless of cwd', async () => {
    process.chdir(MISSING_FIXTURE);

    const logs: string[] = [];
    const log = vi.spyOn(console, 'log').mockImplementation((m: unknown) => { logs.push(String(m)); });

    const code = await runCli(['--version']);
    expect(code).toBe(0);
    expect(logs.join('\n')).toMatch(/\d+\.\d+\.\d+/);

    log.mockRestore();
  });
});
