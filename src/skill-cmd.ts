export async function runSkillCommand(argv: string[]): Promise<number> {
  const sub = argv[0];
  if (sub === 'show') {
    console.log('crap4ts skill (stub) — see Task 4 for full implementation');
    return 0;
  }
  console.error(`Unknown skill subcommand: ${sub ?? '(none)'}`);
  return 1;
}
