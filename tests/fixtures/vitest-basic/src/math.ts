export function add(a: number, b: number): number {
  if (a < 0 || b < 0) {
    return Math.abs(a) + Math.abs(b);
  }
  return a + b;
}

export function multiply(a: number, b: number): number {
  if (a === 0 || b === 0) {
    return 0;
  }
  return a * b;
}
