import { describe, it, expect, vi } from 'vitest';
import { runCli } from '../src/cli';

describe('runCli — extended', () => {
  it('returns 2 and prints error when parseOptions throws', async () => {
    const errs: string[] = [];
    const err = vi.spyOn(console, 'error').mockImplementation((m: unknown) => { errs.push(String(m)); });
    const code = await runCli(['--timeout']);
    err.mockRestore();
    expect(code).toBe(2);
    expect(errs.some(e => e.includes('--timeout'))).toBe(true);
  });

  it('returns 2 when --timeout gets invalid value', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const code = await runCli(['--timeout', 'abc']);
    err.mockRestore();
    expect(code).toBe(2);
  });

  it('returns 2 when --src has no argument', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const code = await runCli(['--src']);
    err.mockRestore();
    expect(code).toBe(2);
  });

  it('dispatches skill install subcommand', async () => {
    const logs: string[] = [];
    const log = vi.spyOn(console, 'log').mockImplementation((m: unknown) => { logs.push(String(m)); });
    const code = await runCli(['skill', 'path']);
    log.mockRestore();
    expect(code).toBe(0);
    expect(logs.join('\n')).toContain('SKILL.md');
  });
});
