export interface CliOptions {
  filters: string[];
  srcDir: string;
  coverageDir: string;
  timeoutMs: number;
}

export function parseOptions(argv: string[]): CliOptions {
  const filters: string[] = [];
  let srcDir = 'src';
  const coverageDir = 'coverage';
  let timeoutMs = 600_000;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--src') {
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
    } else {
      filters.push(a);
    }
  }

  return { filters, srcDir, coverageDir, timeoutMs };
}
