import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  bundledSkillPath,
  installSkill,
  uninstallSkill,
  showSkill,
  skillPath,
  runSkillCommand,
} from '../src/skill-cmd';

describe('bundledSkillPath', () => {
  it('resolves to an existing SKILL.md under the package', () => {
    const p = bundledSkillPath();
    expect(existsSync(p)).toBe(true);
    expect(readFileSync(p, 'utf-8')).toContain('crap4ts');
  });
});

describe('install / uninstall — project scope', () => {
  let cwd: string;
  let originalCwd: string;
  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), 'crap4ts-skill-proj-'));
    originalCwd = process.cwd();
    process.chdir(cwd);
  });
  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(cwd, { recursive: true, force: true });
  });

  it('installs SKILL.md into .agents/skills/crap4ts/ under cwd', async () => {
    const dest = await installSkill({ scope: 'project' });
    expect(dest).toBe(join(cwd, '.agents/skills/crap4ts/SKILL.md'));
    expect(existsSync(dest)).toBe(true);
    expect(readFileSync(dest, 'utf-8')).toContain('crap4ts');
  });

  it('install is idempotent', async () => {
    await installSkill({ scope: 'project' });
    const again = await installSkill({ scope: 'project' });
    expect(existsSync(again)).toBe(true);
  });

  it('uninstall removes the installed file', async () => {
    const dest = await installSkill({ scope: 'project' });
    await uninstallSkill({ scope: 'project' });
    expect(existsSync(dest)).toBe(false);
  });
});

describe('install — global scope (redirected HOME)', () => {
  let fakeHome: string;
  let originalHome: string | undefined;
  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), 'crap4ts-skill-home-'));
    originalHome = process.env.HOME;
    process.env.HOME = fakeHome;
  });
  afterEach(() => {
    process.env.HOME = originalHome;
    rmSync(fakeHome, { recursive: true, force: true });
  });

  it('installs into $HOME/.agents/skills/crap4ts/SKILL.md', async () => {
    const dest = await installSkill({ scope: 'global' });
    expect(dest).toBe(join(fakeHome, '.agents/skills/crap4ts/SKILL.md'));
    expect(existsSync(dest)).toBe(true);
  });
});

describe('runSkillCommand dispatcher', () => {
  it('`show` prints the skill contents and returns 0', async () => {
    const logs: string[] = [];
    const log = vi.spyOn(console, 'log').mockImplementation((m: unknown) => { logs.push(String(m)); });
    const code = await runSkillCommand(['show']);
    log.mockRestore();
    expect(code).toBe(0);
    expect(logs.join('\n')).toContain('crap4ts');
  });

  it('`path` prints the path and returns 0', async () => {
    const logs: string[] = [];
    const log = vi.spyOn(console, 'log').mockImplementation((m: unknown) => { logs.push(String(m)); });
    const code = await runSkillCommand(['path', '--project']);
    log.mockRestore();
    expect(code).toBe(0);
    expect(logs.join('\n')).toContain('.agents/skills/crap4ts/SKILL.md');
  });

  it('returns non-zero on unknown subcommand', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const code = await runSkillCommand(['nope']);
    err.mockRestore();
    expect(code).not.toBe(0);
  });

  it('returns non-zero when no subcommand given', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const code = await runSkillCommand([]);
    err.mockRestore();
    expect(code).not.toBe(0);
  });
});

describe('runSkillCommand — install/uninstall', () => {
  let cwd: string;
  let originalCwd: string;
  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), 'crap4ts-skill-run-'));
    originalCwd = process.cwd();
    process.chdir(cwd);
  });
  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(cwd, { recursive: true, force: true });
  });

  it('`install --project` installs and returns 0', async () => {
    const logs: string[] = [];
    const log = vi.spyOn(console, 'log').mockImplementation((m: unknown) => { logs.push(String(m)); });
    const code = await runSkillCommand(['install', '--project']);
    log.mockRestore();
    expect(code).toBe(0);
    expect(logs.some(l => l.includes('Installed'))).toBe(true);
    expect(existsSync(join(cwd, '.agents/skills/crap4ts/SKILL.md'))).toBe(true);
  });

  it('`uninstall --project` removes installed skill and returns 0', async () => {
    await runSkillCommand(['install', '--project']);
    const logs: string[] = [];
    const log = vi.spyOn(console, 'log').mockImplementation((m: unknown) => { logs.push(String(m)); });
    const code = await runSkillCommand(['uninstall', '--project']);
    log.mockRestore();
    expect(code).toBe(0);
    expect(logs.some(l => l.includes('Removed'))).toBe(true);
  });

  it('`uninstall --project` reports nothing to remove when not installed', async () => {
    const logs: string[] = [];
    const log = vi.spyOn(console, 'log').mockImplementation((m: unknown) => { logs.push(String(m)); });
    const code = await runSkillCommand(['uninstall', '--project']);
    log.mockRestore();
    expect(code).toBe(0);
    expect(logs.some(l => l.includes('No crap4ts skill installed'))).toBe(true);
  });
});
