// Public programmatic API for crap4ts
// CLI users: import from 'crap4ts/cli' or use the bin entry point.
// Library users: import from 'crap4ts' (this file).

export { extractFunctions } from './complexity';
export type { FunctionInfo } from './complexity';

export { parseCoverage, coverageForRange, sourceToModule } from './coverage';
export type { CoverageData, FileCoverageData } from './coverage';

export { crapScore, sortByCrap, formatReport, formatJsonReport } from './crap';
export type { CrapEntry } from './crap';

export { findSourceFiles, filterSources, analyzeFile } from './core';
