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
  failOnCrap?: number;
  failOnComplexity?: number;
  failOnCoverageBelow?: number;
  top?: number;
  configPath?: string;
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
  let failOnCrap: number | undefined;
  let failOnComplexity: number | undefined;
  let failOnCoverageBelow: number | undefined;
  let top: number | undefined;
  let configPath: string | undefined;

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
    } else if (a === '--fail-on-crap') {
      const v = argv[++i];
      const n = Number(v);
      if (!v || !Number.isFinite(n) || n <= 0) {
        throw new Error(`--fail-on-crap requires a positive number, got: ${v}`);
      }
      failOnCrap = n;
    } else if (a === '--fail-on-complexity') {
      const v = argv[++i];
      const n = Number(v);
      if (!v || !Number.isFinite(n) || n <= 0) {
        throw new Error(`--fail-on-complexity requires a positive number, got: ${v}`);
      }
      failOnComplexity = n;
    } else if (a === '--fail-on-coverage-below') {
      const v = argv[++i];
      const n = Number(v);
      if (!v || !Number.isFinite(n) || n < 0 || n > 100) {
        throw new Error(`--fail-on-coverage-below requires a number between 0 and 100, got: ${v}`);
      }
      failOnCoverageBelow = n;
    } else if (a === '--top') {
      const v = argv[++i];
      const n = Number(v);
      if (!v || !Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
        throw new Error(`--top requires a positive integer, got: ${v}`);
      }
      top = n;
    } else if (a === '--config') {
      const v = argv[++i];
      if (!v) throw new Error('--config requires a file path argument');
      configPath = v;
    } else {
      filters.push(a);
    }
  }

  return { mode: 'report', filters, srcDir, coverageDir, timeoutMs, output, excludes, runner, coverageCommand, failOnCrap, failOnComplexity, failOnCoverageBelow, top, configPath };
}
