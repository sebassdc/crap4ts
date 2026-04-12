import { readFileSync } from 'fs';
import { join } from 'path';
import { runReport } from './report';
import { parseOptions } from './options';

function getVersion(): string {
  const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
  return pkg.version;
}

function formatHelp(): string {
  return `Usage: crap4ts [options] [filters...]

Options:
  --src <dir>              Source directory to analyze (default: src)
  --exclude <pattern>      Exclude files whose path contains <pattern> (repeatable)
  --timeout <seconds>      Analysis timeout in seconds (default: 600)
  --json                   Output report as JSON instead of text
  --runner <vitest|jest>   Skip auto-detection, use specified test runner
  --coverage-command <cmd> Run a custom shell command for coverage instead
  --help, -h               Show this help message
  --version, -v            Show version number

Subcommands:
  skill               Manage the bundled AI skill (install | uninstall | show | path)`;
}

export async function runCli(argv: string[]): Promise<number> {
  if (argv[0] === 'skill') {
    const { runSkillCommand } = await import('./skill-cmd');
    return runSkillCommand(argv.slice(1));
  }
  try {
    const opts = parseOptions(argv);
    if (opts.mode === 'help') {
      console.log(formatHelp());
      return 0;
    }
    if (opts.mode === 'version') {
      console.log(getVersion());
      return 0;
    }
    return await runReport(opts);
  } catch (e) {
    console.error((e as Error).message);
    return 2;
  }
}
