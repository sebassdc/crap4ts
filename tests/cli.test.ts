import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
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

  it('returns 0 for --help', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const code = await runCli(['--help']);
    log.mockRestore();
    expect(code).toBe(0);
  });

  it('help output contains usage, options, and skill subcommand hint', async () => {
    const logs: string[] = [];
    const log = vi.spyOn(console, 'log').mockImplementation(m => { logs.push(String(m)); });
    await runCli(['--help']);
    log.mockRestore();
    const output = logs.join('\n');
    expect(output).toContain('Usage');
    expect(output).toContain('Options');
    expect(output).toContain('skill');
  });

  it('returns 0 for --version', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const code = await runCli(['--version']);
    log.mockRestore();
    expect(code).toBe(0);
  });

  it('version output matches package.json version', async () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    const logs: string[] = [];
    const log = vi.spyOn(console, 'log').mockImplementation(m => { logs.push(String(m)); });
    await runCli(['--version']);
    log.mockRestore();
    const output = logs.join('\n');
    expect(output).toContain(pkg.version);
  });
});
