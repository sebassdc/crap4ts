import { describe, it, expect } from 'vitest';
import {
  extractFunctions,
  parseCoverage,
  coverageForRange,
  sourceToModule,
  crapScore,
  sortByCrap,
  formatReport,
  formatJsonReport,
  findSourceFiles,
  filterSources,
  analyzeFile,
} from '../src/api';
import type { CrapEntry, FunctionInfo, CoverageData, FileCoverageData } from '../src/api';

describe('api surface', () => {
  it('exports extractFunctions as a function', () => {
    expect(typeof extractFunctions).toBe('function');
  });

  it('exports parseCoverage as a function', () => {
    expect(typeof parseCoverage).toBe('function');
  });

  it('exports coverageForRange as a function', () => {
    expect(typeof coverageForRange).toBe('function');
  });

  it('exports sourceToModule as a function', () => {
    expect(typeof sourceToModule).toBe('function');
  });

  it('exports crapScore as a function', () => {
    expect(typeof crapScore).toBe('function');
  });

  it('exports sortByCrap as a function', () => {
    expect(typeof sortByCrap).toBe('function');
  });

  it('exports formatReport as a function', () => {
    expect(typeof formatReport).toBe('function');
  });

  it('exports formatJsonReport as a function', () => {
    expect(typeof formatJsonReport).toBe('function');
  });

  it('exports findSourceFiles as a function', () => {
    expect(typeof findSourceFiles).toBe('function');
  });

  it('exports filterSources as a function', () => {
    expect(typeof filterSources).toBe('function');
  });

  it('exports analyzeFile as a function', () => {
    expect(typeof analyzeFile).toBe('function');
  });

  it('types are accessible at compile time', () => {
    // These type assertions verify the types are importable.
    // They produce no runtime effect but would cause a TS error if missing.
    const entry: CrapEntry = {
      name: 'test',
      module: 'mod',
      complexity: 1,
      coverage: 100,
      crap: 1,
    };
    expect(entry.crap).toBe(1);

    const fn: FunctionInfo = {
      name: 'fn',
      startLine: 1,
      endLine: 5,
      complexity: 2,
    };
    expect(fn.complexity).toBe(2);

    const fileData: FileCoverageData = {
      statementMap: {},
      s: {},
    };
    expect(fileData).toBeDefined();

    const covData: CoverageData = {};
    expect(covData).toBeDefined();
  });
});
