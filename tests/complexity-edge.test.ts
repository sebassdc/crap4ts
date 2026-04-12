import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { analyzeFile } from '../src/core';
import * as complexity from '../src/complexity';

describe('analyzeFile — syntax errors', () => {
  it('warns and returns [] instead of throwing when the file has a syntax error', () => {
    const dir = mkdtempSync(join(tmpdir(), 'crap4ts-syn-'));
    const file = join(dir, 'broken.ts');
    writeFileSync(file, 'function oops( {{{ invalid');

    // Mock extractFunctions to throw an error
    const extractSpy = vi.spyOn(complexity, 'extractFunctions').mockImplementation(() => {
      throw new Error('Syntax error: unexpected token');
    });

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const entries = analyzeFile(file, {}, dir);
    warn.mockRestore();
    extractSpy.mockRestore();
    rmSync(dir, { recursive: true, force: true });
    expect(entries).toEqual([]);
  });
});
