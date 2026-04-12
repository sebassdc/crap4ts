export interface CliOptions {
  mode: 'report' | 'help' | 'version';
  filters: string[];
  srcDir: string;
  coverageDir: string;
  timeoutMs: number;
  output: 'text' | 'json';
  excludes: string[];
  runner?: 'vitest' | 'jest';
  coverageCommand?: string;
}

export function parseOptions(argv: string[]): CliOptions {
  const filters: string[] = [];
  const excludes: string[] = [];
  let srcDir = 'src';
  const coverageDir = 'coverage';
  let timeoutMs = 600_000;
  let output: 'text' | 'json' = 'text';
  let runner: 'vitest' | 'jest' | undefined;
  let coverageCommand: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      return { mode: 'help', filters: [], srcDir, coverageDir, timeoutMs, output: 'text' as const, excludes: [] };
    } else if (a === '--version' || a === '-v') {
      return { mode: 'version', filters: [], srcDir, coverageDir, timeoutMs, output: 'text' as const, excludes: [] };
    } else if (a === '--json') {
      output = 'json';
    } else if (a === '--src') {
      const v = argv[++i];
      if (!v) throw new Error('--src requires a directory argument');
      srcDir = v;
    } else if (a === '--timeout') {
      const v = argv[++i];
      const n = Number(v);
      if (!v || !Number.isFinite(n) || n <= 0) {
        throw new Error(`--timeout requires a positive number of seconds, got: ${v}`);
      }
      timeoutMs = n * 1000;
    } else if (a === '--runner') {
      const v = argv[++i];
      if (!v) throw new Error('--runner requires an argument');
      if (v !== 'vitest' && v !== 'jest') {
        throw new Error(`--runner must be 'vitest' or 'jest', got: ${v}`);
      }
      runner = v;
    } else if (a === '--coverage-command') {
      const v = argv[++i];
      if (!v) throw new Error('--coverage-command requires an argument');
      coverageCommand = v;
    } else if (a === '--exclude') {
      const v = argv[++i];
      if (!v) throw new Error('--exclude requires a pattern argument');
      excludes.push(v);
    } else {
      filters.push(a);
    }
  }

  return { mode: 'report', filters, srcDir, coverageDir, timeoutMs, output, excludes, runner, coverageCommand };
}
