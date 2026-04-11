# crap4ts

**CRAP** (Change Risk Anti-Pattern) metric for TypeScript projects.

Combines cyclomatic complexity with test coverage to identify functions that are both complex and under-tested — the riskiest code to change.

## Quick Start

Install as a dev dependency:

```bash
npm install --save-dev crap4ts
```

Configure your test runner to emit Istanbul JSON coverage:

**Vitest** (`vitest.config.ts`):
```ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',          // or 'istanbul'
      reporter: ['text', 'json'],
    },
  },
});
```

**Jest** (`jest.config.ts`):
```ts
export default {
  coverageReporters: ['text', 'json'],
};
```

Run from your project root (where `src/` lives):

```bash
npx crap4ts
```

crap4ts automatically deletes stale coverage data, runs your test suite with coverage, and prints the report.

## Output

```
CRAP Report
===========
Function                       Module                              CC   Cov%     CRAP
-------------------------------------------------------------------------------------
complexFn                      my.module                          12  45.0%    130.2
simpleFn                       my.module                           1 100.0%      1.0
```

## Filtering

Pass module path fragments as arguments to filter:

```bash
npx crap4ts parser validator   # only files matching those strings
```

## CRAP Formula

```
CRAP(fn) = CC² × (1 - coverage)³ + CC
```

- **CC** = cyclomatic complexity (decision points + 1)
- **coverage** = fraction of statements covered by tests

| Score | Risk |
|-------|------|
| 1–5   | Low — clean code |
| 5–30  | Moderate — refactor or add tests |
| 30+   | High — complex and under-tested |

## What It Counts

Decision points that increase cyclomatic complexity:

- `if` / ternary (`c ? a : b`)
- `else if` (each adds 1)
- `for` / `for...of` / `for...in`
- `while` / `do...while`
- `catch` clauses (each adds 1)
- `case` clauses in `switch` (each `case` adds 1; `default` does not)
- `&&` / `||` / `??` operators (each operator adds 1)

Nested functions and class bodies are skipped — only the enclosing function's body is analyzed.

## Extracted Symbols

- Top-level `function` declarations
- Top-level `const f = () => {}` and `const f = function() {}`
- Class `constructor`, methods, getters, and setters (named as `ClassName.methodName`)

## Development

```bash
npm install
npm test          # run tests
npm run build     # compile to dist/
npm run coverage  # run tests with coverage
```

## License

MIT
