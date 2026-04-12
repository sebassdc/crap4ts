import { existsSync, readFileSync, rmSync } from 'fs';
import { resolve } from 'path';
import { spawnSync } from 'child_process';
import { analyzeFile, filterSources, findSourceFiles } from './core';
import { parseCoverage } from './coverage';
import { formatReport, sortByCrap } from './crap';

export interface ReportOptions {
  filters: string[];
  srcDir: string;
  coverageDir: string;
  timeoutMs: number;
}

const VITEST_CONFIGS = ['vitest.config.ts', 'vitest.config.js', 'vitest.config.mts', 'vitest.config.mjs'];
const JEST_CONFIGS = ['jest.config.ts', 'jest.config.js', 'jest.config.mjs'];

function hasJestInPackageJson(): boolean {
  if (!existsSync('package.json')) return false;
  const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
  return !!(pkg.devDependencies?.jest || pkg.dependencies?.jest);
}

export function detectRunner(): 'vitest' | 'jest' {
  if (VITEST_CONFIGS.some(f => existsSync(f))) return 'vitest';
  if (JEST_CONFIGS.some(f => existsSync(f))) return 'jest';
  if (hasJestInPackageJson()) return 'jest';
  return 'vitest';
}

export function runCoverage(runner: 'vitest' | 'jest', timeoutMs: number): { ok: boolean; timedOut: boolean } {
  const cmd = runner === 'vitest'
    ? ['npx', 'vitest', 'run', '--coverage']
    : ['npx', 'jest', '--coverage', '--coverageReporters=json'];
  const result = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', timeout: timeoutMs });
  const timedOut = result.signal === 'SIGTERM' && result.status === null;
  return { ok: result.status === 0, timedOut };
}

export async function runReport(opts: ReportOptions): Promise<number> {
  const { filters, srcDir, coverageDir, timeoutMs } = opts;

  if (existsSync(coverageDir)) {
    try {
      rmSync(coverageDir, { recursive: true, force: true });
    } catch (e) {
      console.warn(`Warning: failed to remove stale coverage dir ${coverageDir}: ${(e as Error).message}`);
    }
  }

  const runner = detectRunner();
  const { ok, timedOut } = runCoverage(runner, timeoutMs);
  if (timedOut) {
    console.error(`Coverage run timed out after ${timeoutMs / 1000}s.`);
    return 1;
  }
  if (!ok) {
    console.error('Coverage run failed.');
    return 1;
  }

  if (!existsSync(`${coverageDir}/coverage-final.json`)) {
    console.error(
      `No coverage-final.json found in ${coverageDir}/.\n` +
      `Configure your test runner to output Istanbul JSON coverage.\n` +
      `  Vitest: add coverage.reporter: ['json'] in vitest.config.ts\n` +
      `  Jest:   add "json" to coverageReporters in jest.config`,
    );
    return 1;
  }

  const filesData = parseCoverage(coverageDir);
  const resolvedSrc = resolve(srcDir);
  const allFiles = findSourceFiles(srcDir);
  const filtered = filterSources(allFiles, filters);

  const allEntries = filtered.flatMap(f => analyzeFile(f, filesData, resolvedSrc));
  const sorted = sortByCrap(allEntries);
  console.log(formatReport(sorted));
  return 0;
}
