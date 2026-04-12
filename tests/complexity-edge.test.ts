import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { analyzeFile } from '../src/core';
import { extractFunctions } from '../src/complexity';
import * as complexity from '../src/complexity';

describe('nested functions are NOT extracted as separate symbols', () => {
  it('only extracts outer function, not inner function declaration or nested arrow', () => {
    const code = `
function outer() {
  function inner() { return 1; }
  const nested = () => 2;
  return inner() + nested();
}`;
    const fns = extractFunctions(code);
    expect(fns).toHaveLength(1);
    expect(fns[0].name).toBe('outer');
  });

  it('only extracts outer arrow function, not nested arrow', () => {
    const code = `const outer = () => {
  const inner = () => { if (true) return 1; return 2; };
  return inner();
};`;
    const fns = extractFunctions(code);
    expect(fns).toHaveLength(1);
    expect(fns[0].name).toBe('outer');
  });

  it('only extracts class method, not local function inside method', () => {
    const code = `class Svc {
  process() {
    function helper() { return 1; }
    return helper();
  }
}`;
    const fns = extractFunctions(code);
    expect(fns).toHaveLength(1);
    expect(fns[0].name).toBe('Svc.process');
  });
});

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
