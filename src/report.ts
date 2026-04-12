import { existsSync, readFileSync, rmSync } from 'fs';
import { resolve } from 'path';
import { spawnSync } from 'child_process';
import { analyzeFile, filterSources, findSourceFiles } from './core';
import { parseCoverage } from './coverage';
import { CrapEntry, formatJsonReport, formatReport, sortByCrap } from './crap';

export interface ReportOptions {
  filters: string[];
  srcDir: string;
  coverageDir: string;
  timeoutMs: number;
  output: 'text' | 'json';
  excludes: string[];
  runner?: 'vitest' | 'jest';
  coverageCommand?: string;
  failOnCrap?: number;
  failOnComplexity?: number;
  failOnCoverageBelow?: number;
  top?: number;
}

const VITEST_CONFIGS = ['vitest.config.ts', 'vitest.config.js', 'vitest.config.mts', 'vitest.config.mjs'];
const JEST_CONFIGS = ['jest.config.ts', 'jest.config.js', 'jest.config.mjs'];

function hasJestInPackageJson(): boolean {
  if (!existsSync('package.json')) return false;
  try {
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
    return !!(pkg.devDependencies?.jest || pkg.dependencies?.jest);
  } catch {
    console.warn("Unable to parse package.json while detecting the test runner. Fix package.json or use --runner to specify explicitly.");
    return false;
  }
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

export function evaluateThresholds(entries: CrapEntry[], opts: ReportOptions): string | null {
  if (opts.failOnCrap != null) {
    const violations = entries.filter(e => e.crap >= opts.failOnCrap!);
    if (violations.length > 0) {
      return `CI failed: ${violations.length} function(s) exceed CRAP threshold of ${opts.failOnCrap}`;
    }
  }
  if (opts.failOnComplexity != null) {
    const violations = entries.filter(e => e.complexity >= opts.failOnComplexity!);
    if (violations.length > 0) {
      return `CI failed: ${violations.length} function(s) exceed complexity threshold of ${opts.failOnComplexity}`;
    }
  }
  if (opts.failOnCoverageBelow != null) {
    const violations = entries.filter(e => e.coverage < opts.failOnCoverageBelow!);
    if (violations.length > 0) {
      return `CI failed: ${violations.length} function(s) below coverage threshold of ${opts.failOnCoverageBelow}%`;
    }
  }
  return null;
}

export async function runReport(opts: ReportOptions): Promise<number> {
  const { filters, srcDir, coverageDir, timeoutMs } = opts;

  if (!existsSync(srcDir)) {
    console.error(`Source directory '${srcDir}' not found. Use --src to specify a different directory.`);
    return 1;
  }

  const rawFiles = findSourceFiles(srcDir);
  const excludes = opts.excludes ?? [];
  const allFiles = excludes.length > 0
    ? rawFiles.filter(f => !excludes.some(ex => f.includes(ex)))
    : rawFiles;
  if (allFiles.length === 0) {
    console.error(`No TypeScript files found in '${srcDir}'. Verify your source directory contains .ts files.`);
    return 1;
  }

  const filtered = filterSources(allFiles, filters);
  if (filtered.length === 0) {
    console.error(`No files match the filters: [${filters.join(', ')}]. Check your filter arguments.`);
    return 1;
  }

  if (existsSync(coverageDir)) {
    try {
      rmSync(coverageDir, { recursive: true, force: true });
    } catch (e) {
      console.warn(`Warning: failed to remove stale coverage dir ${coverageDir}: ${(e as Error).message}`);
    }
  }

  let ok: boolean;
  let timedOut: boolean;

  if (opts.coverageCommand) {
    const result = spawnSync(opts.coverageCommand, [], { shell: true, stdio: 'inherit', timeout: timeoutMs });
    timedOut = result.signal === 'SIGTERM' && result.status === null;
    ok = result.status === 0;
  } else {
    const runner = opts.runner ?? detectRunner();
    ({ ok, timedOut } = runCoverage(runner, timeoutMs));
  }

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

  const allEntries = filtered.flatMap(f => analyzeFile(f, filesData, resolvedSrc));
  if (allEntries.length === 0) {
    console.warn('No functions found. crap4ts analyzes top-level functions, arrow functions, and class methods.');
  }
  const sorted = sortByCrap(allEntries);
  const displayed = opts.top != null ? sorted.slice(0, opts.top) : sorted;
  if (opts.output === 'json') {
    console.log(formatJsonReport(displayed));
  } else {
    console.log(formatReport(displayed));
  }

  const failureMessage = evaluateThresholds(sorted, opts);
  if (failureMessage) {
    console.error(failureMessage);
    return 1;
  }
  return 0;
}
