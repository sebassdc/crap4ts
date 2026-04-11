import { describe, it, expect, vi } from 'vitest';
import { runCli } from '../src/cli';

describe('runCli', () => {
  it('dispatches `skill show` to the skill command handler', async () => {
    const logs: string[] = [];
    const log = vi.spyOn(console, 'log').mockImplementation(m => { logs.push(String(m)); });
    const code = await runCli(['skill', 'show']);
    log.mockRestore();
    expect(code).toBe(0);
    expect(logs.join('\n')).toContain('crap4ts');
  });

  it('returns non-zero when skill subcommand is unknown', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const code = await runCli(['skill', 'bogus']);
    err.mockRestore();
    expect(code).not.toBe(0);
  });
});
