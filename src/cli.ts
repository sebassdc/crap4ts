import { readFileSync } from 'fs';
import { join } from 'path';
import { runReport } from './report';
import { parseOptions } from './options';
import { loadConfig, mergeConfigIntoOptions } from './config';

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
  --output <format>        Output format: text, json, markdown, csv (default: text)
  --json                   Shorthand for --output json
  --runner <vitest|jest>   Skip auto-detection, use specified test runner
  --coverage-command <cmd> Run a custom shell command for coverage instead
  --fail-on-crap <n>       Exit 1 if any function CRAP score >= n
  --fail-on-complexity <n> Exit 1 if any function complexity >= n
  --fail-on-coverage-below <n>  Exit 1 if any function coverage < n (0-100)
  --top <n>                Show only the top N entries (thresholds check all)
  --config <path>          Load config from a specific file
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
    const config = loadConfig(opts.configPath);
    const merged = mergeConfigIntoOptions(opts, config);
    return await runReport(merged);
  } catch (e) {
    console.error((e as Error).message);
    return 2;
  }
}
