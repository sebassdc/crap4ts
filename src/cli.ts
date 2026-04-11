import { runReport } from './report';

export async function runCli(argv: string[]): Promise<number> {
  if (argv[0] === 'skill') {
    const { runSkillCommand } = await import('./skill-cmd');
    return runSkillCommand(argv.slice(1));
  }
  return runReport({
    filters: argv,
    srcDir: 'src',
    coverageDir: 'coverage',
    timeoutMs: 10 * 60 * 1000,
  });
}
