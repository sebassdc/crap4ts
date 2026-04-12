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

## CLI Options

```bash
npx crap4ts --help              # show usage and available options
npx crap4ts --version           # print version number
npx crap4ts --src lib           # analyze from lib/ instead of src/
npx crap4ts --timeout 120       # set analysis timeout to 120 seconds
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

## Cross-Agent Skill

crap4ts ships a bundled `SKILL.md` that you can install into the cross-agent
skill directory consumed by Claude Code, Codex, Pi, and any harness that reads
`.agents/skills/`.

```bash
# Global install for the current user (~/.agents/skills/crap4ts/SKILL.md)
npx crap4ts skill install

# Project-local install (./.agents/skills/crap4ts/SKILL.md)
npx crap4ts skill install --project

# Print the bundled skill
npx crap4ts skill show

# Print where the skill is (or would be) installed
npx crap4ts skill path
npx crap4ts skill path --project

# Remove
npx crap4ts skill uninstall
npx crap4ts skill uninstall --project
```

The bundled skill lives inside the published package at `src/skill/SKILL.md`
and is shipped via the `files` field in `package.json`.

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Source directory 'src' not found` | Use `--src <dir>` to point to your source directory |
| `No TypeScript files found` | Verify your source directory contains `.ts` files |
| `No files match the filters` | Check your filter arguments match actual file paths |
| `Unable to parse package.json` | Fix your `package.json` or use `--runner vitest\|jest` |
| `Coverage run failed` | Ensure your test suite passes independently before running crap4ts |
| `No coverage-final.json found` | Configure your test runner to output Istanbul JSON coverage (see Quick Start) |
| `Coverage run timed out` | Increase timeout with `--timeout <seconds>` |

## Development

```bash
npm install
npm test          # run tests
npm run build     # compile to dist/
npm run coverage  # run tests with coverage
```

## License

MIT
