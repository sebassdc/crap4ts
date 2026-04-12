import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return { ...actual, spawnSync: vi.fn() };
});

import { spawnSync } from 'child_process';
import { detectRunner, evaluateThresholds, runCoverage, runReport } from '../src/report';

const mockSpawnSync = vi.mocked(spawnSync);

describe('detectRunner', () => {
  let cwd: string;
  let originalCwd: string;

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), 'crap4ts-report-'));
    originalCwd = process.cwd();
    process.chdir(cwd);
  });
  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(cwd, { recursive: true, force: true });
  });

  it('returns vitest when vitest.config.ts exists', () => {
    writeFileSync(join(cwd, 'vitest.config.ts'), 'export default {}');
    expect(detectRunner()).toBe('vitest');
  });

  it('returns vitest when vitest.config.js exists', () => {
    writeFileSync(join(cwd, 'vitest.config.js'), 'module.exports = {}');
    expect(detectRunner()).toBe('vitest');
  });

  it('returns vitest when vitest.config.mts exists', () => {
    writeFileSync(join(cwd, 'vitest.config.mts'), 'export default {}');
    expect(detectRunner()).toBe('vitest');
  });

  it('returns vitest when vitest.config.mjs exists', () => {
    writeFileSync(join(cwd, 'vitest.config.mjs'), 'export default {}');
    expect(detectRunner()).toBe('vitest');
  });

  it('returns jest when jest.config.ts exists', () => {
    writeFileSync(join(cwd, 'jest.config.ts'), 'export default {}');
    expect(detectRunner()).toBe('jest');
  });

  it('returns jest when jest.config.js exists', () => {
    writeFileSync(join(cwd, 'jest.config.js'), 'module.exports = {}');
    expect(detectRunner()).toBe('jest');
  });

  it('returns jest when jest.config.mjs exists', () => {
    writeFileSync(join(cwd, 'jest.config.mjs'), 'export default {}');
    expect(detectRunner()).toBe('jest');
  });

  it('returns jest when package.json has jest in devDependencies', () => {
    writeFileSync(join(cwd, 'package.json'), JSON.stringify({ devDependencies: { jest: '^29.0.0' } }));
    expect(detectRunner()).toBe('jest');
  });

  it('returns jest when package.json has jest in dependencies', () => {
    writeFileSync(join(cwd, 'package.json'), JSON.stringify({ dependencies: { jest: '^29.0.0' } }));
    expect(detectRunner()).toBe('jest');
  });

  it('defaults to vitest when no config files and no jest dependency', () => {
    writeFileSync(join(cwd, 'package.json'), JSON.stringify({ devDependencies: { mocha: '^10.0.0' } }));
    expect(detectRunner()).toBe('vitest');
  });

  it('defaults to vitest when no config files and no package.json', () => {
    expect(detectRunner()).toBe('vitest');
  });

  it('prefers vitest when both vitest and jest configs exist', () => {
    writeFileSync(join(cwd, 'vitest.config.ts'), 'export default {}');
    writeFileSync(join(cwd, 'jest.config.ts'), 'export default {}');
    expect(detectRunner()).toBe('vitest');
  });

  it('defaults to vitest when package.json is malformed', () => {
    writeFileSync(join(cwd, 'package.json'), '{ invalid json }');
    const warns: string[] = [];
    const warn = vi.spyOn(console, 'warn').mockImplementation((m: unknown) => { warns.push(String(m)); });
    expect(detectRunner()).toBe('vitest');
    expect(warns.some(w => w.includes('Unable to parse package.json'))).toBe(true);
    expect(warns.some(w => w.includes('--runner'))).toBe(true);
    warn.mockRestore();
  });
});

describe('runCoverage', () => {
  afterEach(() => { mockSpawnSync.mockReset(); });

  it('returns ok:true when exit status is 0', () => {
    mockSpawnSync.mockReturnValue({
      status: 0, signal: null, output: [], stdout: Buffer.from(''), stderr: Buffer.from(''), pid: 1234,
    });
    const result = runCoverage('vitest', 60000);
    expect(result).toEqual({ ok: true, timedOut: false });
    expect(mockSpawnSync).toHaveBeenCalledWith('npx', ['vitest', 'run', '--coverage'], expect.objectContaining({ timeout: 60000 }));
  });

  it('returns ok:false when exit status is non-zero', () => {
    mockSpawnSync.mockReturnValue({
      status: 1, signal: null, output: [], stdout: Buffer.from(''), stderr: Buffer.from(''), pid: 1234,
    });
    const result = runCoverage('jest', 60000);
    expect(result).toEqual({ ok: false, timedOut: false });
    expect(mockSpawnSync).toHaveBeenCalledWith('npx', ['jest', '--coverage', '--coverageReporters=json'], expect.anything());
  });

  it('detects timeout when signal is SIGTERM and status is null', () => {
    mockSpawnSync.mockReturnValue({
      status: null, signal: 'SIGTERM', output: [], stdout: Buffer.from(''), stderr: Buffer.from(''), pid: 1234,
    });
    const result = runCoverage('vitest', 5000);
    expect(result).toEqual({ ok: false, timedOut: true });
  });
});

describe('runReport', () => {
  let cwd: string;
  let originalCwd: string;

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), 'crap4ts-runreport-'));
    originalCwd = process.cwd();
    process.chdir(cwd);
    mockSpawnSync.mockReset();
  });
  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(cwd, { recursive: true, force: true });
  });

  function createSrcWithFile(): void {
    mkdirSync(join(cwd, 'src'));
    writeFileSync(join(cwd, 'src', 'hello.ts'), 'export function hello() { return "hi"; }');
  }

  it('returns 1 when srcDir does not exist', async () => {
    const errs: string[] = [];
    const err = vi.spyOn(console, 'error').mockImplementation((m: unknown) => { errs.push(String(m)); });

    const code = await runReport({ filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 60000, output: 'text' as const });
    expect(code).toBe(1);
    expect(errs.some(e => e.includes("Source directory 'src' not found"))).toBe(true);
    expect(errs.some(e => e.includes('--src'))).toBe(true);
    expect(mockSpawnSync).not.toHaveBeenCalled();

    err.mockRestore();
  });

  it('returns 1 when srcDir has no TypeScript files', async () => {
    mkdirSync(join(cwd, 'src'));
    writeFileSync(join(cwd, 'src', 'readme.txt'), 'hello');
    const errs: string[] = [];
    const err = vi.spyOn(console, 'error').mockImplementation((m: unknown) => { errs.push(String(m)); });

    const code = await runReport({ filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 60000, output: 'text' as const });
    expect(code).toBe(1);
    expect(errs.some(e => e.includes("No TypeScript files found in 'src'"))).toBe(true);
    expect(mockSpawnSync).not.toHaveBeenCalled();

    err.mockRestore();
  });

  it('returns 1 when no files match filters', async () => {
    createSrcWithFile();
    const errs: string[] = [];
    const err = vi.spyOn(console, 'error').mockImplementation((m: unknown) => { errs.push(String(m)); });

    const code = await runReport({ filters: ['nonexistent'], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 60000, output: 'text' as const });
    expect(code).toBe(1);
    expect(errs.some(e => e.includes('No files match the filters'))).toBe(true);
    expect(errs.some(e => e.includes('nonexistent'))).toBe(true);
    expect(mockSpawnSync).not.toHaveBeenCalled();

    err.mockRestore();
  });

  it('returns 0 and logs note when analysis finds no functions', async () => {
    mkdirSync(join(cwd, 'src'));
    writeFileSync(join(cwd, 'src', 'empty.ts'), '// no functions here\nexport const x = 1;');

    const coverageDir = join(cwd, 'coverage');
    mockSpawnSync.mockImplementation(() => {
      mkdirSync(coverageDir, { recursive: true });
      writeFileSync(join(coverageDir, 'coverage-final.json'), JSON.stringify({}));
      return {
        status: 0, signal: null, output: [], stdout: Buffer.from(''), stderr: Buffer.from(''), pid: 1234,
      } as any;
    });

    const logs: string[] = [];
    const log = vi.spyOn(console, 'log').mockImplementation((m: unknown) => { logs.push(String(m)); });
    const warns: string[] = [];
    const warn = vi.spyOn(console, 'warn').mockImplementation((m: unknown) => { warns.push(String(m)); });
    writeFileSync(join(cwd, 'vitest.config.ts'), 'export default {}');

    const code = await runReport({ filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 60000, output: 'text' as const });
    expect(code).toBe(0);
    expect(warns.some(w => w.includes('No functions found'))).toBe(true);
    expect(warns.some(w => w.includes('top-level functions'))).toBe(true);

    log.mockRestore();
    warn.mockRestore();
  });

  it('removes stale coverage dir before running', async () => {
    createSrcWithFile();
    const coverageDir = join(cwd, 'coverage');
    mkdirSync(coverageDir);
    writeFileSync(join(coverageDir, 'stale.json'), '{}');

    mockSpawnSync.mockReturnValue({
      status: 1, signal: null, output: [], stdout: Buffer.from(''), stderr: Buffer.from(''), pid: 1234,
    });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    writeFileSync(join(cwd, 'vitest.config.ts'), 'export default {}');

    await runReport({ filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 60000, output: 'text' as const });
    expect(existsSync(join(coverageDir, 'stale.json'))).toBe(false);

    err.mockRestore();
  });

  it('returns 1 when coverage run times out', async () => {
    createSrcWithFile();
    mockSpawnSync.mockReturnValue({
      status: null, signal: 'SIGTERM', output: [], stdout: Buffer.from(''), stderr: Buffer.from(''), pid: 1234,
    });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    writeFileSync(join(cwd, 'vitest.config.ts'), 'export default {}');

    const code = await runReport({ filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 5000 });
    expect(code).toBe(1);
    err.mockRestore();
  });

  it('returns 1 when coverage run fails', async () => {
    createSrcWithFile();
    mockSpawnSync.mockReturnValue({
      status: 1, signal: null, output: [], stdout: Buffer.from(''), stderr: Buffer.from(''), pid: 1234,
    });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    writeFileSync(join(cwd, 'vitest.config.ts'), 'export default {}');

    const code = await runReport({ filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 60000, output: 'text' as const });
    expect(code).toBe(1);
    err.mockRestore();
  });

  it('returns 1 when coverage-final.json is missing after successful run', async () => {
    createSrcWithFile();
    mockSpawnSync.mockReturnValue({
      status: 0, signal: null, output: [], stdout: Buffer.from(''), stderr: Buffer.from(''), pid: 1234,
    });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    writeFileSync(join(cwd, 'vitest.config.ts'), 'export default {}');

    const code = await runReport({ filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 60000, output: 'text' as const });
    expect(code).toBe(1);
    err.mockRestore();
  });

  it('returns 0 and prints report on success', async () => {
    mkdirSync(join(cwd, 'src'));
    writeFileSync(join(cwd, 'src', 'hello.ts'), 'export function hello() { return "hi"; }');

    const coverageDir = join(cwd, 'coverage');
    mockSpawnSync.mockImplementation(() => {
      mkdirSync(coverageDir, { recursive: true });
      const absPath = join(cwd, 'src', 'hello.ts');
      const coverage = {
        [absPath]: {
          statementMap: {
            '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 40 } },
          },
          s: { '0': 1 },
        },
      };
      writeFileSync(join(coverageDir, 'coverage-final.json'), JSON.stringify(coverage));
      return {
        status: 0, signal: null, output: [], stdout: Buffer.from(''), stderr: Buffer.from(''), pid: 1234,
      } as any;
    });

    const logs: string[] = [];
    const log = vi.spyOn(console, 'log').mockImplementation((m: unknown) => { logs.push(String(m)); });
    writeFileSync(join(cwd, 'vitest.config.ts'), 'export default {}');

    const code = await runReport({ filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 60000, output: 'text' as const });
    expect(code).toBe(0);
    expect(logs.join('\n')).toContain('CRAP Report');
    expect(logs.join('\n')).toContain('hello');

    log.mockRestore();
  });

  it('uses runner override instead of detectRunner when runner option is set', async () => {
    createSrcWithFile();
    // No vitest.config.ts — detectRunner would default to vitest, but we override to jest
    mockSpawnSync.mockReturnValue({
      status: 1, signal: null, output: [], stdout: Buffer.from(''), stderr: Buffer.from(''), pid: 1234,
    });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});

    await runReport({ filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 60000, output: 'text', runner: 'jest' });
    expect(mockSpawnSync).toHaveBeenCalledWith('npx', ['jest', '--coverage', '--coverageReporters=json'], expect.anything());

    err.mockRestore();
  });

  it('uses coverageCommand with shell mode when set', async () => {
    createSrcWithFile();
    mockSpawnSync.mockReturnValue({
      status: 1, signal: null, output: [], stdout: Buffer.from(''), stderr: Buffer.from(''), pid: 1234,
    });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});

    await runReport({ filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 60000, output: 'text', coverageCommand: 'custom cmd' });
    expect(mockSpawnSync).toHaveBeenCalledWith('custom cmd', [], expect.objectContaining({ shell: true, stdio: 'inherit', timeout: 60000 }));

    err.mockRestore();
  });

  it('coverageCommand takes precedence over runner option', async () => {
    createSrcWithFile();
    mockSpawnSync.mockReturnValue({
      status: 1, signal: null, output: [], stdout: Buffer.from(''), stderr: Buffer.from(''), pid: 1234,
    });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});

    await runReport({ filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 60000, output: 'text', runner: 'jest', coverageCommand: 'my-custom-cmd' });
    expect(mockSpawnSync).toHaveBeenCalledWith('my-custom-cmd', [], expect.objectContaining({ shell: true }));

    err.mockRestore();
  });

  it('uses detectRunner when no overrides are set', async () => {
    createSrcWithFile();
    writeFileSync(join(cwd, 'jest.config.ts'), 'export default {}');
    mockSpawnSync.mockReturnValue({
      status: 1, signal: null, output: [], stdout: Buffer.from(''), stderr: Buffer.from(''), pid: 1234,
    });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});

    await runReport({ filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 60000, output: 'text' });
    expect(mockSpawnSync).toHaveBeenCalledWith('npx', ['jest', '--coverage', '--coverageReporters=json'], expect.anything());

    err.mockRestore();
  });

  it('filters files with excludes option', async () => {
    mkdirSync(join(cwd, 'src'));
    mkdirSync(join(cwd, 'src', 'dist'));
    writeFileSync(join(cwd, 'src', 'hello.ts'), 'export function hello() { return "hi"; }');
    writeFileSync(join(cwd, 'src', 'dist', 'compiled.ts'), 'export function compiled() { return 1; }');

    const coverageDir = join(cwd, 'coverage');
    mockSpawnSync.mockImplementation(() => {
      mkdirSync(coverageDir, { recursive: true });
      const absPath = join(cwd, 'src', 'hello.ts');
      const coverage = {
        [absPath]: {
          statementMap: {
            '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 40 } },
          },
          s: { '0': 1 },
        },
      };
      writeFileSync(join(coverageDir, 'coverage-final.json'), JSON.stringify(coverage));
      return {
        status: 0, signal: null, output: [], stdout: Buffer.from(''), stderr: Buffer.from(''), pid: 1234,
      } as any;
    });

    const logs: string[] = [];
    const log = vi.spyOn(console, 'log').mockImplementation((m: unknown) => { logs.push(String(m)); });
    writeFileSync(join(cwd, 'vitest.config.ts'), 'export default {}');

    const code = await runReport({ filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 60000, output: 'text', excludes: ['dist'] });
    expect(code).toBe(0);
    const output = logs.join('\n');
    expect(output).toContain('hello');
    expect(output).not.toContain('compiled');

    log.mockRestore();
  });

  it('returns 0 and prints JSON report when output is json', async () => {
    mkdirSync(join(cwd, 'src'));
    writeFileSync(join(cwd, 'src', 'hello.ts'), 'export function hello() { return "hi"; }');

    const coverageDir = join(cwd, 'coverage');
    mockSpawnSync.mockImplementation(() => {
      mkdirSync(coverageDir, { recursive: true });
      const absPath = join(cwd, 'src', 'hello.ts');
      const coverage = {
        [absPath]: {
          statementMap: {
            '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 40 } },
          },
          s: { '0': 1 },
        },
      };
      writeFileSync(join(coverageDir, 'coverage-final.json'), JSON.stringify(coverage));
      return {
        status: 0, signal: null, output: [], stdout: Buffer.from(''), stderr: Buffer.from(''), pid: 1234,
      } as any;
    });

    const logs: string[] = [];
    const log = vi.spyOn(console, 'log').mockImplementation((m: unknown) => { logs.push(String(m)); });
    writeFileSync(join(cwd, 'vitest.config.ts'), 'export default {}');

    const code = await runReport({ filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 60000, output: 'json' as const });
    expect(code).toBe(0);

    const parsed = JSON.parse(logs.join('\n'));
    expect(parsed.tool).toBe('crap4ts');
    expect(Array.isArray(parsed.entries)).toBe(true);
    expect(parsed.entries.length).toBeGreaterThan(0);
    const entry = parsed.entries[0];
    expect(entry).toHaveProperty('name');
    expect(entry).toHaveProperty('module');
    expect(entry).toHaveProperty('complexity');
    expect(entry).toHaveProperty('coverage');
    expect(entry).toHaveProperty('crap');

    log.mockRestore();
  });

  function setupSuccessfulCoverage(cwdDir: string, files: Array<{name: string; content: string}>): void {
    mkdirSync(join(cwdDir, 'src'), { recursive: true });
    for (const f of files) {
      writeFileSync(join(cwdDir, 'src', f.name), f.content);
    }
    writeFileSync(join(cwdDir, 'vitest.config.ts'), 'export default {}');

    const coverageDir = join(cwdDir, 'coverage');
    mockSpawnSync.mockImplementation(() => {
      mkdirSync(coverageDir, { recursive: true });
      const coverage: Record<string, any> = {};
      for (const f of files) {
        const absPath = join(cwdDir, 'src', f.name);
        coverage[absPath] = {
          statementMap: {
            '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 100 } },
          },
          s: { '0': 0 }, // 0 hits = 0% coverage
        };
      }
      writeFileSync(join(coverageDir, 'coverage-final.json'), JSON.stringify(coverage));
      return {
        status: 0, signal: null, output: [], stdout: Buffer.from(''), stderr: Buffer.from(''), pid: 1234,
      } as any;
    });
  }

  it('returns 1 when entry exceeds failOnCrap threshold', async () => {
    setupSuccessfulCoverage(cwd, [
      { name: 'complex.ts', content: 'export function complex(a: boolean, b: boolean, c: boolean, d: boolean) { if (a) { if (b) { if (c) { if (d) { return 1; } } } } return 0; }' },
    ]);

    const logs: string[] = [];
    const log = vi.spyOn(console, 'log').mockImplementation((m: unknown) => { logs.push(String(m)); });
    const errs: string[] = [];
    const err = vi.spyOn(console, 'error').mockImplementation((m: unknown) => { errs.push(String(m)); });

    const code = await runReport({ filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 60000, output: 'text', failOnCrap: 1 });
    expect(code).toBe(1);
    expect(logs.join('\n')).toContain('CRAP Report');
    expect(errs.some(e => e.includes('CI failed') && e.includes('CRAP threshold'))).toBe(true);

    log.mockRestore();
    err.mockRestore();
  });

  it('returns 1 when entry exceeds failOnComplexity threshold', async () => {
    setupSuccessfulCoverage(cwd, [
      { name: 'complex.ts', content: 'export function complex(a: boolean, b: boolean) { if (a) { if (b) { return 1; } } return 0; }' },
    ]);

    const errs: string[] = [];
    const err = vi.spyOn(console, 'error').mockImplementation((m: unknown) => { errs.push(String(m)); });
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    const code = await runReport({ filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 60000, output: 'text', failOnComplexity: 2 });
    expect(code).toBe(1);
    expect(errs.some(e => e.includes('CI failed') && e.includes('complexity threshold'))).toBe(true);

    log.mockRestore();
    err.mockRestore();
  });

  it('returns 1 when entry below failOnCoverageBelow threshold', async () => {
    setupSuccessfulCoverage(cwd, [
      { name: 'uncovered.ts', content: 'export function uncovered() { return 1; }' },
    ]);

    const errs: string[] = [];
    const err = vi.spyOn(console, 'error').mockImplementation((m: unknown) => { errs.push(String(m)); });
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    const code = await runReport({ filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 60000, output: 'text', failOnCoverageBelow: 50 });
    expect(code).toBe(1);
    expect(errs.some(e => e.includes('CI failed') && e.includes('coverage threshold'))).toBe(true);

    log.mockRestore();
    err.mockRestore();
  });

  it('returns 0 when no threshold violations', async () => {
    setupSuccessfulCoverage(cwd, [
      { name: 'simple.ts', content: 'export function simple() { return 1; }' },
    ]);

    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Very generous thresholds that won't be exceeded
    const code = await runReport({ filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 60000, output: 'text', failOnCrap: 9999 });
    expect(code).toBe(0);

    log.mockRestore();
    err.mockRestore();
  });

  it('--top limits displayed entries but evaluates all for thresholds', async () => {
    setupSuccessfulCoverage(cwd, [
      { name: 'a.ts', content: 'export function a(x: boolean) { if (x) { return 1; } return 0; }' },
      { name: 'b.ts', content: 'export function b(x: boolean, y: boolean) { if (x) { if (y) { return 1; } } return 0; }' },
      { name: 'c.ts', content: 'export function c() { return 1; }' },
    ]);

    const logs: string[] = [];
    const log = vi.spyOn(console, 'log').mockImplementation((m: unknown) => { logs.push(String(m)); });
    const errs: string[] = [];
    const err = vi.spyOn(console, 'error').mockImplementation((m: unknown) => { errs.push(String(m)); });

    // top 1 but failOnCrap 1 should still catch all 3 functions
    const code = await runReport({ filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 60000, output: 'text', top: 1, failOnCrap: 1 });
    expect(code).toBe(1);
    // Report printed with limited entries
    const reportText = logs.join('\n');
    expect(reportText).toContain('CRAP Report');
    // Threshold message should mention functions from ALL entries
    expect(errs.some(e => e.includes('CI failed'))).toBe(true);

    log.mockRestore();
    err.mockRestore();
  });
});

describe('evaluateThresholds', () => {
  const entries = [
    { name: 'highCrap', module: 'mod', complexity: 15, coverage: 20, crap: 200 },
    { name: 'lowCrap', module: 'mod', complexity: 1, coverage: 100, crap: 1 },
    { name: 'midCrap', module: 'mod', complexity: 5, coverage: 50, crap: 20 },
  ];

  it('returns null when no thresholds set', () => {
    expect(evaluateThresholds(entries, { filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 60000, output: 'text' })).toBeNull();
  });

  it('returns failure message for CRAP threshold', () => {
    const msg = evaluateThresholds(entries, { filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 60000, output: 'text', failOnCrap: 30 });
    expect(msg).toContain('CI failed');
    expect(msg).toContain('CRAP threshold of 30');
    expect(msg).toContain('1 function(s)');
  });

  it('returns failure message for complexity threshold', () => {
    const msg = evaluateThresholds(entries, { filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 60000, output: 'text', failOnComplexity: 10 });
    expect(msg).toContain('CI failed');
    expect(msg).toContain('complexity threshold of 10');
    expect(msg).toContain('1 function(s)');
  });

  it('returns failure message for coverage threshold', () => {
    const msg = evaluateThresholds(entries, { filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 60000, output: 'text', failOnCoverageBelow: 80 });
    expect(msg).toContain('CI failed');
    expect(msg).toContain('coverage threshold of 80%');
    expect(msg).toContain('2 function(s)');
  });

  it('returns null when all entries pass thresholds', () => {
    const msg = evaluateThresholds(entries, { filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 60000, output: 'text', failOnCrap: 9999, failOnComplexity: 9999, failOnCoverageBelow: 0 });
    expect(msg).toBeNull();
  });
});
