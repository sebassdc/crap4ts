import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { findSourceFiles, analyzeFile } from '../src/core';
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
