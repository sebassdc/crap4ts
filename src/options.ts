export interface CliOptions {
  mode: 'report' | 'help' | 'version';
  filters: string[];
  srcDir: string;
  coverageDir: string;
  timeoutMs: number;
  output: 'text' | 'json' | 'markdown' | 'csv';
  excludes: string[];
  runner?: 'vitest' | 'jest';
  coverageCommand?: string;
  failOnCrap?: number;
  failOnComplexity?: number;
  failOnCoverageBelow?: number;
  top?: number;
  configPath?: string;
}

interface ParseState {
  filters: string[];
  excludes: string[];
  srcDir: string;
  timeoutMs: number;
  output: 'text' | 'json' | 'markdown' | 'csv';
  runner?: 'vitest' | 'jest';
  coverageCommand?: string;
  failOnCrap?: number;
  failOnComplexity?: number;
  failOnCoverageBelow?: number;
  top?: number;
  configPath?: string;
}

type FlagHandler = (argv: string[], i: number, state: ParseState) => number;

function parseOutputFormat(v: string | undefined): CliOptions['output'] {
  const valid = ['text', 'json', 'markdown', 'csv'];
  if (!v || !valid.includes(v)) {
    throw new Error(`--output must be one of: ${valid.join(', ')}. Got: ${v}`);
  }
  return v as CliOptions['output'];
}

function parseRunnerValue(v: string | undefined): 'vitest' | 'jest' {
  if (!v) throw new Error('--runner requires an argument');
  if (v !== 'vitest' && v !== 'jest') {
    throw new Error(`--runner must be 'vitest' or 'jest', got: ${v}`);
  }
  return v;
}

function parsePositiveNum(v: string | undefined, flag: string): number {
  const n = Number(v);
  if (!v || !Number.isFinite(n) || n <= 0) {
    throw new Error(`${flag} requires a positive number, got: ${v}`);
  }
  return n;
}

function parsePositiveInt(v: string | undefined, flag: string): number {
  const n = Number(v);
  if (!v || !Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
    throw new Error(`${flag} requires a positive integer, got: ${v}`);
  }
  return n;
}

function parseRange(v: string | undefined, flag: string, min: number, max: number): number {
  const n = Number(v);
  if (!v || !Number.isFinite(n) || n < min || n > max) {
    throw new Error(`${flag} requires a number between ${min} and ${max}, got: ${v}`);
  }
  return n;
}

const FLAG_HANDLERS: Record<string, FlagHandler> = {
  '--json'(_argv, i, state) {
    state.output = 'json';
    return i;
  },
  '--output'(argv, i, state) {
    state.output = parseOutputFormat(argv[i + 1]);
    return i + 1;
  },
  '--src'(argv, i, state) {
    const v = argv[i + 1];
    if (!v) throw new Error('--src requires a directory argument');
    state.srcDir = v;
    return i + 1;
  },
  '--timeout'(argv, i, state) {
    state.timeoutMs = parsePositiveNum(argv[i + 1], '--timeout') * 1000;
    return i + 1;
  },
  '--runner'(argv, i, state) {
    state.runner = parseRunnerValue(argv[i + 1]);
    return i + 1;
  },
  '--coverage-command'(argv, i, state) {
    const v = argv[i + 1];
    if (!v) throw new Error('--coverage-command requires an argument');
    state.coverageCommand = v;
    return i + 1;
  },
  '--exclude'(argv, i, state) {
    const v = argv[i + 1];
    if (!v) throw new Error('--exclude requires a pattern argument');
    state.excludes.push(v);
    return i + 1;
  },
  '--fail-on-crap'(argv, i, state) {
    state.failOnCrap = parsePositiveNum(argv[i + 1], '--fail-on-crap');
    return i + 1;
  },
  '--fail-on-complexity'(argv, i, state) {
    state.failOnComplexity = parsePositiveNum(argv[i + 1], '--fail-on-complexity');
    return i + 1;
  },
  '--fail-on-coverage-below'(argv, i, state) {
    state.failOnCoverageBelow = parseRange(argv[i + 1], '--fail-on-coverage-below', 0, 100);
    return i + 1;
  },
  '--top'(argv, i, state) {
    state.top = parsePositiveInt(argv[i + 1], '--top');
    return i + 1;
  },
  '--config'(argv, i, state) {
    const v = argv[i + 1];
    if (!v) throw new Error('--config requires a file path argument');
    state.configPath = v;
    return i + 1;
  },
};

const EARLY_EXIT_DEFAULTS: Omit<CliOptions, 'mode'> = {
  filters: [], srcDir: 'src', coverageDir: 'coverage', timeoutMs: 600_000, output: 'text' as const, excludes: [],
};

export function parseOptions(argv: string[]): CliOptions {
  const state: ParseState = {
    filters: [], excludes: [], srcDir: 'src', timeoutMs: 600_000, output: 'text',
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      return { mode: 'help', ...EARLY_EXIT_DEFAULTS };
    }
    if (a === '--version' || a === '-v') {
      return { mode: 'version', ...EARLY_EXIT_DEFAULTS };
    }
    const handler = FLAG_HANDLERS[a];
    if (handler) {
      i = handler(argv, i, state);
    } else {
      state.filters.push(a);
    }
  }

  return { mode: 'report', ...state, coverageDir: 'coverage' };
}
