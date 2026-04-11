---
name: crap4ts
description: Use when the user asks for a CRAP report, cyclomatic complexity analysis, or code quality metrics on a TypeScript project
---

# crap4ts — CRAP Metric for TypeScript

Computes the **CRAP** (Change Risk Anti-Pattern) score for every function and method in a TypeScript project. CRAP combines cyclomatic complexity with test coverage to identify functions that are both complex and under-tested.

## Setup

The target project must use Vitest or Jest with Istanbul JSON coverage output.

**Vitest** — add to `vitest.config.ts`:
```ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'json'],
}
```

**Jest** — add to `jest.config.ts`:
```ts
coverageReporters: ['text', 'json']
```

Install crap4ts:
```bash
npm install --save-dev crap4ts
```

## Usage

Run from the project root (where `src/` lives):

```bash
npx crap4ts

# Filter to specific modules
npx crap4ts parser validator
```

crap4ts automatically deletes stale coverage data, runs the test suite with coverage, and prints the report.

### Output

A table sorted by CRAP score (worst first):

```
CRAP Report
===========
Function                       Module                              CC   Cov%     CRAP
-------------------------------------------------------------------------------------
complexFn                      my.module                          12  45.0%    130.2
simpleFn                       my.module                           1 100.0%      1.0
```

## Interpreting Scores

| CRAP Score | Meaning |
|-----------|---------|
| 1–5       | Clean — low complexity, well tested |
| 5–30      | Moderate — consider refactoring or adding tests |
| 30+       | Crappy — high complexity with poor coverage |

## How It Works

1. Deletes stale `coverage/` directory
2. Detects test runner (Vitest or Jest) from config files
3. Runs tests with coverage to generate `coverage/coverage-final.json`
4. Finds all `.ts` / `.tsx` files under `src/`
5. Extracts top-level functions and class methods using the TypeScript compiler API
6. Computes cyclomatic complexity:
   - `if`/`else if`, ternary: +1 each
   - `for`, `for...of`, `for...in`, `while`, `do...while`: +1 each
   - `catch` handler: +1 each
   - `&&`, `||`, `??`: +1 per operator
   - `case` in `switch`: +1 each (`default` excluded)
   - Nested functions and classes are skipped
7. Reads `coverage/coverage-final.json` for per-statement coverage data
8. Applies CRAP formula: `CC² × (1 - cov)³ + CC`
9. Sorts by CRAP score descending and prints report
