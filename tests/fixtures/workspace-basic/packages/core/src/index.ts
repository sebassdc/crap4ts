export function validate(input: string): boolean {
  if (!input) {
    return false;
  }
  if (input.length > 100) {
    return false;
  }
  return true;
}

export function transform(value: number): number {
  if (value < 0) {
    return -value;
  } else if (value === 0) {
    return 1;
  }
  return value * 2;
}
