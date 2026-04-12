import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return { ...actual, spawnSync: vi.fn() };
});

import { spawnSync } from 'child_process';
import { detectRunner, runCoverage, runReport } from '../src/report';

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

    const code = await runReport({ filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 60000 });
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

    const code = await runReport({ filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 60000 });
    expect(code).toBe(1);
    expect(errs.some(e => e.includes("No TypeScript files found in 'src'"))).toBe(true);
    expect(mockSpawnSync).not.toHaveBeenCalled();

    err.mockRestore();
  });

  it('returns 1 when no files match filters', async () => {
    createSrcWithFile();
    const errs: string[] = [];
    const err = vi.spyOn(console, 'error').mockImplementation((m: unknown) => { errs.push(String(m)); });

    const code = await runReport({ filters: ['nonexistent'], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 60000 });
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

    const code = await runReport({ filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 60000 });
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

    await runReport({ filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 60000 });
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

    const code = await runReport({ filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 60000 });
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

    const code = await runReport({ filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 60000 });
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

    const code = await runReport({ filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 60000 });
    expect(code).toBe(0);
    expect(logs.join('\n')).toContain('CRAP Report');
    expect(logs.join('\n')).toContain('hello');

    log.mockRestore();
  });
});
