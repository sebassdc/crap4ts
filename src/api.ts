// Public programmatic API for crap4ts
// CLI users: import from 'crap4ts/cli' or use the bin entry point.
// Library users: import from 'crap4ts' (this file).

export { extractFunctions } from './complexity';
export type { FunctionInfo } from './complexity';

export { parseCoverage, coverageForRange, sourceToModule, normalizePath } from './coverage';
export type { CoverageData, FileCoverageData } from './coverage';

export { crapScore, sortByCrap, formatReport, formatJsonReport, formatMarkdownReport, formatCsvReport } from './crap';
export type { CrapEntry } from './crap';

export { findSourceFiles, filterSources, analyzeFile } from './core';

import { existsSync } from 'fs';
import { resolve } from 'path';
import { findSourceFilesWithOptions } from './core';
import { filterSources, analyzeFile } from './core';
import { parseCoverage } from './coverage';
import { sortByCrap } from './crap';
import type { CrapEntry } from './crap';

export interface ReportResult {
  entries: CrapEntry[];
}

export interface GenerateReportOptions {
  srcDir: string;
  coverageDir: string;
  filters?: string[];
  excludes?: string[];
}

export function generateReport(opts: GenerateReportOptions): ReportResult {
  const srcDir = resolve(opts.srcDir);
  const coverageDir = resolve(opts.coverageDir);

  if (!existsSync(coverageDir)) {
    throw new Error(`Coverage directory not found: ${coverageDir}`);
  }

  const files = findSourceFilesWithOptions({
    srcDirs: [srcDir],
    excludes: opts.excludes ?? [],
  });

  const filtered = filterSources(files, opts.filters ?? []);
  const coverageData = parseCoverage(coverageDir);

  const entries: CrapEntry[] = [];
  for (const file of filtered) {
    entries.push(...analyzeFile(file, coverageData, srcDir));
  }

  return { entries: sortByCrap(entries) };
}
