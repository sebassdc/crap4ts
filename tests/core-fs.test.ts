import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { findSourceFiles, findSourceFilesWithOptions, analyzeFile } from '../src/core';
import { CoverageData } from '../src/coverage';

describe('findSourceFiles', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'crap4ts-core-')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  function touch(path: string) {
    writeFileSync(join(dir, path), '');
  }

  function mksubdir(path: string) {
    mkdirSync(join(dir, path), { recursive: true });
  }

  it('finds .ts files', () => {
    touch('foo.ts');
    const files = findSourceFiles(dir);
    expect(files).toEqual([join(dir, 'foo.ts')]);
  });

  it('finds .tsx files', () => {
    touch('comp.tsx');
    const files = findSourceFiles(dir);
    expect(files).toEqual([join(dir, 'comp.tsx')]);
  });

  it('excludes .d.ts files', () => {
    touch('types.d.ts');
    touch('real.ts');
    const files = findSourceFiles(dir);
    expect(files).toEqual([join(dir, 'real.ts')]);
  });

  it('excludes non-ts files', () => {
    touch('readme.md');
    touch('code.js');
    touch('real.ts');
    const files = findSourceFiles(dir);
    expect(files).toEqual([join(dir, 'real.ts')]);
  });

  it('recurses into subdirectories', () => {
    mksubdir('sub');
    touch('sub/nested.ts');
    const files = findSourceFiles(dir);
    expect(files).toEqual([join(dir, 'sub', 'nested.ts')]);
  });

  it('skips node_modules directories', () => {
    mksubdir('node_modules');
    touch('node_modules/pkg.ts');
    touch('real.ts');
    const files = findSourceFiles(dir);
    expect(files).toEqual([join(dir, 'real.ts')]);
  });

  it('returns sorted results', () => {
    touch('z.ts');
    touch('a.ts');
    touch('m.ts');
    const files = findSourceFiles(dir);
    expect(files).toEqual([
      join(dir, 'a.ts'),
      join(dir, 'm.ts'),
      join(dir, 'z.ts'),
    ]);
  });

  it('returns empty for empty directory', () => {
    const files = findSourceFiles(dir);
    expect(files).toEqual([]);
  });
});

describe('findSourceFilesWithOptions', () => {
  let dir1: string;
  let dir2: string;
  beforeEach(() => {
    dir1 = mkdtempSync(join(tmpdir(), 'crap4ts-opts1-'));
    dir2 = mkdtempSync(join(tmpdir(), 'crap4ts-opts2-'));
  });
  afterEach(() => {
    rmSync(dir1, { recursive: true, force: true });
    rmSync(dir2, { recursive: true, force: true });
  });

  function touch(base: string, path: string) {
    writeFileSync(join(base, path), '');
  }

  function mksubdir(base: string, path: string) {
    mkdirSync(join(base, path), { recursive: true });
  }

  it('scans multiple srcDirs and merges results', () => {
    touch(dir1, 'a.ts');
    touch(dir2, 'b.ts');
    const files = findSourceFilesWithOptions({ srcDirs: [dir1, dir2], excludes: [] });
    expect(files).toContain(join(dir1, 'a.ts'));
    expect(files).toContain(join(dir2, 'b.ts'));
    expect(files).toHaveLength(2);
  });

  it('excludes paths containing any exclude substring', () => {
    mksubdir(dir1, 'dist');
    touch(dir1, 'dist/out.ts');
    mksubdir(dir1, 'lib');
    touch(dir1, 'lib/util.ts');
    const files = findSourceFilesWithOptions({ srcDirs: [dir1], excludes: ['dist'] });
    expect(files).toEqual([join(dir1, 'lib', 'util.ts')]);
  });

  it('excludes .d.ts files', () => {
    touch(dir1, 'types.d.ts');
    touch(dir1, 'real.ts');
    const files = findSourceFilesWithOptions({ srcDirs: [dir1], excludes: [] });
    expect(files).toEqual([join(dir1, 'real.ts')]);
  });

  it('excludes node_modules', () => {
    mksubdir(dir1, 'node_modules');
    touch(dir1, 'node_modules/pkg.ts');
    touch(dir1, 'real.ts');
    const files = findSourceFilesWithOptions({ srcDirs: [dir1], excludes: [] });
    expect(files).toEqual([join(dir1, 'real.ts')]);
  });

  it('empty excludes works same as before', () => {
    touch(dir1, 'a.ts');
    touch(dir1, 'b.ts');
    const withOpts = findSourceFilesWithOptions({ srcDirs: [dir1], excludes: [] });
    const legacy = findSourceFiles(dir1);
    expect(withOpts).toEqual(legacy);
  });

  it('returns sorted and deduplicated results', () => {
    touch(dir1, 'z.ts');
    touch(dir1, 'a.ts');
    // Pass dir1 twice to test dedup
    const files = findSourceFilesWithOptions({ srcDirs: [dir1, dir1], excludes: [] });
    expect(files).toEqual([join(dir1, 'a.ts'), join(dir1, 'z.ts')]);
  });

  it('supports multiple exclude patterns', () => {
    mksubdir(dir1, 'dist');
    touch(dir1, 'dist/out.ts');
    mksubdir(dir1, 'fixtures');
    touch(dir1, 'fixtures/mock.ts');
    mksubdir(dir1, '__generated__');
    touch(dir1, '__generated__/types.ts');
    touch(dir1, 'real.ts');
    const files = findSourceFilesWithOptions({
      srcDirs: [dir1],
      excludes: ['dist', 'fixtures', '__generated__'],
    });
    expect(files).toEqual([join(dir1, 'real.ts')]);
  });
});

describe('analyzeFile', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'crap4ts-analyze-')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it('returns entries for functions in the file', () => {
    const filePath = join(dir, 'mod.ts');
    writeFileSync(filePath, 'export function greet() { return "hi"; }');
    const coverageData: CoverageData = {};
    const entries = analyzeFile(filePath, coverageData, dir);
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe('greet');
    expect(entries[0].module).toBe('mod');
  });

  it('returns empty array and warns on parse error', () => {
    const filePath = join(dir, 'bad.ts');
    // Write something that will cause readFileSync to succeed but extractFunctions won't crash
    // Actually we need a true error — use a missing file
    const warns: string[] = [];
    const warn = vi.spyOn(console, 'warn').mockImplementation((m: unknown) => { warns.push(String(m)); });

    const entries = analyzeFile(join(dir, 'nonexistent.ts'), {}, dir);
    expect(entries).toEqual([]);
    expect(warns.some(w => w.includes('skipping'))).toBe(true);

    warn.mockRestore();
  });
});
