import { existsSync, mkdirSync, copyFileSync, readFileSync, rmSync } from 'fs';
import { homedir } from 'os';
import { dirname, join, resolve } from 'path';

export type Scope = 'global' | 'project';

export function bundledSkillPath(): string {
  const candidates = [
    join(__dirname, 'skill', 'SKILL.md'),
    join(__dirname, '..', 'src', 'skill', 'SKILL.md'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return resolve(c);
  }
  throw new Error(
    `crap4ts: bundled SKILL.md not found. Looked in:\n  ${candidates.join('\n  ')}`,
  );
}

export function globalSkillDir(): string {
  return join(homedir(), '.agents', 'skills', 'crap4ts');
}

export function projectSkillDir(cwd: string = process.cwd()): string {
  return join(cwd, '.agents', 'skills', 'crap4ts');
}

function destDir(scope: Scope): string {
  return scope === 'global' ? globalSkillDir() : projectSkillDir();
}

export async function installSkill(opts: { scope: Scope }): Promise<string> {
  const src = bundledSkillPath();
  const dir = destDir(opts.scope);
  mkdirSync(dir, { recursive: true });
  const dest = join(dir, 'SKILL.md');
  copyFileSync(src, dest);
  return dest;
}

export async function uninstallSkill(opts: { scope: Scope }): Promise<boolean> {
  const dir = destDir(opts.scope);
  const file = join(dir, 'SKILL.md');
  if (!existsSync(file)) return false;
  rmSync(file, { force: true });
  try { rmSync(dir, { recursive: false }); } catch { /* non-empty or already gone */ }
  return true;
}

export function showSkill(): string {
  return readFileSync(bundledSkillPath(), 'utf-8');
}

export function skillPath(scope: Scope): string {
  return join(destDir(scope), 'SKILL.md');
}

function scopeFromArgs(argv: string[]): Scope {
  return argv.includes('--project') ? 'project' : 'global';
}

export async function runSkillCommand(argv: string[]): Promise<number> {
  const sub = argv[0];
  const rest = argv.slice(1);
  const scope = scopeFromArgs(rest);

  switch (sub) {
    case 'install': {
      const dest = await installSkill({ scope });
      console.log(`Installed crap4ts skill to ${dest}`);
      return 0;
    }
    case 'uninstall': {
      const removed = await uninstallSkill({ scope });
      console.log(removed
        ? `Removed crap4ts skill from ${skillPath(scope)}`
        : `No crap4ts skill installed at ${skillPath(scope)}`);
      return 0;
    }
    case 'show': {
      console.log(showSkill());
      return 0;
    }
    case 'path': {
      console.log(skillPath(scope));
      return 0;
    }
    default:
      console.error(
        `Unknown skill subcommand: ${sub ?? '(none)'}\n` +
        `Usage: crap4ts skill <install|uninstall|show|path> [--project]`,
      );
      return 1;
  }
}
