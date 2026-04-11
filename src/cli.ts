import { runReport } from './report';
import { parseOptions } from './options';

export async function runCli(argv: string[]): Promise<number> {
  if (argv[0] === 'skill') {
    const { runSkillCommand } = await import('./skill-cmd');
    return runSkillCommand(argv.slice(1));
  }
  try {
    const opts = parseOptions(argv);
    return await runReport(opts);
  } catch (e) {
    console.error((e as Error).message);
    return 2;
  }
}
