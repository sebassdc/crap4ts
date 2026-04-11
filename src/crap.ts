export interface CrapEntry {
  name: string;
  module: string;
  complexity: number;
  coverage: number; // 0–100
  crap: number;
}

export function crapScore(complexity: number, coveragePct: number): number {
  const cc = complexity;
  const uncov = 1.0 - coveragePct / 100.0;
  return cc * cc * uncov * uncov * uncov + cc;
}

export function sortByCrap(entries: CrapEntry[]): CrapEntry[] {
  return [...entries].sort((a, b) => b.crap - a.crap);
}

export function formatReport(entries: CrapEntry[]): string {
  const header =
    `${'Function'.padEnd(30)} ${'Module'.padEnd(35)} ${'CC'.padStart(4)} ${'Cov%'.padStart(6)} ${'CRAP'.padStart(8)}`;
  const sep = '-'.repeat(header.length);
  const rows = entries.map(e => {
    const name = e.name.slice(0, 30).padEnd(30);
    const mod = e.module.slice(0, 35).padEnd(35);
    const cc = String(e.complexity).padStart(4);
    const cov = `${e.coverage.toFixed(1)}%`.padStart(6);
    const crap = e.crap.toFixed(1).padStart(8);
    return `${name} ${mod} ${cc} ${cov} ${crap}`;
  });
  return ['CRAP Report', '===========', header, sep, ...rows, ''].join('\n');
}
