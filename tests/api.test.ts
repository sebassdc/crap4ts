import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
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
  generateReport,
} from '../src/api';
import type { CrapEntry, FunctionInfo, CoverageData, FileCoverageData, ReportResult, GenerateReportOptions } from '../src/api';

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

  it('exports generateReport as a function', () => {
    expect(typeof generateReport).toBe('function');
  });
});

describe('generateReport', () => {
  let tmpDir: string;
  let srcDir: string;
  let coverageDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'crap4ts-api-test-'));
    srcDir = join(tmpDir, 'src');
    coverageDir = join(tmpDir, 'coverage');
    mkdirSync(srcDir, { recursive: true });
    mkdirSync(coverageDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeSrcFile(name: string, content: string): string {
    const filePath = join(srcDir, name);
    writeFileSync(filePath, content);
    return filePath;
  }

  function writeCoverage(data: Record<string, unknown>): void {
    writeFileSync(join(coverageDir, 'coverage-final.json'), JSON.stringify(data));
  }

  it('returns entries with correct fields for a simple file', () => {
    const filePath = writeSrcFile('hello.ts', [
      'export function greet(name: string): string {',
      '  return "hello " + name;',
      '}',
    ].join('\n'));

    // Coverage that covers all statements in the function
    writeCoverage({
      [filePath]: {
        statementMap: {
          '0': { start: { line: 2, column: 2 }, end: { line: 2, column: 28 } },
        },
        s: { '0': 1 },
      },
    });

    const result = generateReport({ srcDir, coverageDir });

    expect(result.entries).toHaveLength(1);
    const entry = result.entries[0];
    expect(entry.name).toBe('greet');
    expect(entry.complexity).toBe(1);
    expect(entry.coverage).toBe(100);
    expect(entry.crap).toBeCloseTo(1.0);
    expect(entry.module).toBe('hello');
  });

  it('returns entries sorted by CRAP descending', () => {
    const filePath = writeSrcFile('multi.ts', [
      'export function simple() { return 1; }',
      'export function complex(a: boolean, b: boolean) {',
      '  if (a) {',
      '    if (b) {',
      '      return 1;',
      '    }',
      '    return 2;',
      '  }',
      '  return 3;',
      '}',
    ].join('\n'));

    // No coverage at all for the complex function
    writeCoverage({
      [filePath]: {
        statementMap: {
          '0': { start: { line: 1, column: 27 }, end: { line: 1, column: 36 } },
        },
        s: { '0': 1 },
      },
    });

    const result = generateReport({ srcDir, coverageDir });

    expect(result.entries.length).toBe(2);
    // complex should have higher CRAP (uncovered + complex), so it comes first
    expect(result.entries[0].name).toBe('complex');
    expect(result.entries[1].name).toBe('simple');
  });

  it('applies filters to restrict which files are analyzed', () => {
    writeSrcFile('foo.ts', 'export function foo() { return 1; }');
    writeSrcFile('bar.ts', 'export function bar() { return 2; }');
    writeCoverage({});

    const result = generateReport({ srcDir, coverageDir, filters: ['foo'] });

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].name).toBe('foo');
  });

  it('applies excludes to skip files', () => {
    writeSrcFile('keep.ts', 'export function keep() { return 1; }');
    const subDir = join(srcDir, 'generated');
    mkdirSync(subDir, { recursive: true });
    writeFileSync(join(subDir, 'skip.ts'), 'export function skip() { return 2; }');
    writeCoverage({});

    const result = generateReport({ srcDir, coverageDir, excludes: ['generated'] });

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].name).toBe('keep');
  });

  it('throws if coverage directory does not exist', () => {
    writeSrcFile('hello.ts', 'export function greet() {}');

    expect(() =>
      generateReport({ srcDir, coverageDir: join(tmpDir, 'nonexistent') }),
    ).toThrow(/Coverage directory not found/);
  });

  it('ReportResult and GenerateReportOptions types are importable', () => {
    const opts: GenerateReportOptions = { srcDir: '.', coverageDir: '.' };
    expect(opts).toBeDefined();

    const result: ReportResult = { entries: [] };
    expect(result.entries).toEqual([]);
  });
});
