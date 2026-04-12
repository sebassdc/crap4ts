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
npx crap4ts --exclude dist      # exclude paths containing "dist"
npx crap4ts --timeout 120       # set analysis timeout to 120 seconds
```

## Configuration File

Instead of passing flags every time, create a `crap4ts.config.json` (or `.crap4tsrc.json`) in your project root:

```json
{
  "src": "lib",
  "exclude": ["dist", "fixtures"],
  "output": "json",
  "failOnCrap": 30,
  "timeout": 120
}
```

### File Discovery

crap4ts looks for config files in the current working directory in this order:

1. `crap4ts.config.json` (preferred)
2. `.crap4tsrc.json` (fallback)

The first file found is used. If neither exists, all options use their defaults.

To load a config file from a custom path, use the `--config` flag:

```bash
npx crap4ts --config configs/crap4ts.json
```

### CLI Override Precedence

CLI flags always take precedence over config file values. For example, if your config file sets `"src": "lib"` but you run `npx crap4ts --src app`, the `app` directory is used.

### Supported Keys

| Key                  | Type       | Description                                      | Default |
|----------------------|------------|--------------------------------------------------|---------|
| `src`                | `string`   | Source directory to analyze                       | `"src"` |
| `exclude`            | `string[]` | Exclude paths containing these patterns           | `[]`    |
| `output`             | `string`   | Output format: `"text"` or `"json"`              | `"text"`|
| `runner`             | `string`   | Test runner: `"vitest"` or `"jest"`              | auto    |
| `coverageCommand`    | `string`   | Custom shell command to generate coverage         | none    |
| `failOnCrap`         | `number`   | Fail if any CRAP score >= this value             | none    |
| `failOnComplexity`   | `number`   | Fail if any cyclomatic complexity >= this value  | none    |
| `failOnCoverageBelow`| `number`   | Fail if any function coverage < this % (0-100)   | none    |
| `top`                | `number`   | Show only the top N entries                       | all     |
| `timeout`            | `number`   | Analysis timeout in seconds                       | `600`   |

Unknown keys are silently ignored, so config files are forward-compatible with future versions.

## CI Integration

Use threshold flags to fail CI when code quality drops below acceptable levels:

```bash
# Fail if any function has CRAP >= 30 or coverage below 70%
npx crap4ts --fail-on-crap 30 --fail-on-coverage-below 70

# Fail if any function has complexity >= 15, show only top 10
npx crap4ts --fail-on-complexity 15 --top 10
```

Multiple thresholds can be combined. The report is always printed before any failure.

The `--top` flag limits displayed entries but all entries are evaluated against thresholds.

### Exit Codes

| Code | Meaning |
|------|---------|
| 0    | Pass -- no threshold violations |
| 1    | Threshold violated or runtime error |
| 2    | Usage error (invalid flags or arguments) |

## JSON Output

Use `--json` to get machine-readable output for CI pipelines and automation:

```bash
npx crap4ts --json > crap-report.json
```

The JSON structure:

```json
{
  "tool": "crap4ts",
  "entries": [
    {
      "name": "complexFn",
      "module": "my.module",
      "complexity": 12,
      "coverage": 45,
      "crap": 130.2
    }
  ]
}
```

Text output remains the default. Pass `--json` explicitly to switch formats.

## Excluding Paths

Use `--exclude` to filter out files whose path contains a given substring. The flag is repeatable:

```bash
# Skip dist and fixtures directories
npx crap4ts --exclude dist --exclude fixtures

# Analyze lib/ but skip generated code
npx crap4ts --src lib --exclude __generated__

# Combine with other options
npx crap4ts --src packages/core/src --exclude __mocks__ --exclude .stories --json
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

## Limitations

- Only TypeScript (`.ts`) files are analyzed — `.tsx`, `.js`, and `.jsx` files are ignored.
- Only functions found within the configured source directory (default: `src/`) are scanned.
- Coverage data must be in Istanbul JSON format (`coverage-final.json`). Other coverage formats are not supported.
- Runner detection is heuristic: crap4ts checks for Vitest config files first, then Jest config files, then falls back to the `scripts` field in `package.json`. Use `--runner vitest|jest` to override.
- Nested functions are attributed to their enclosing function rather than being extracted as separate symbols.
- Dynamic or computed method names (e.g., `[Symbol.iterator]()` or `["methodName"]()`) are not extracted.
- Only statement coverage is used when computing the coverage fraction — branch and function coverage are ignored.
- Coverage is calculated using statement-to-function overlap: a statement is attributed to a function if its line range overlaps the function's line range. This is an approximation; a multi-line statement that spans a function boundary may be counted for both the enclosing and the adjacent function.

For advanced usage patterns, see [docs/advanced-usage.md](docs/advanced-usage.md).

## Extracted Symbols

- Top-level `function` declarations
- Top-level `const f = () => {}` and `const f = function() {}`
- Class `constructor`, methods, getters, and setters (named as `ClassName.methodName`)
- Object literal methods, getters, and setters in top-level variable declarations (named as `varName.methodName` or `varName['string-key']`)

Nested functions (functions defined inside other functions, methods, or arrows) are intentionally excluded. They are not extracted as separate symbols; their complexity is attributed to the enclosing function.

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

## Runner Configuration

crap4ts supports three ways to run your test suite for coverage, applied in this order of precedence:

### 1. `--coverage-command` (highest priority)

Run an arbitrary shell command instead of the built-in runner logic. The command is executed with `shell: true`, so pipes, environment variables, and shell syntax all work.

```bash
# Monorepo: run tests only for a specific package
npx crap4ts --coverage-command "npm run test:api -- --coverage"

# Custom script with environment variables
npx crap4ts --coverage-command "CI=1 yarn test --coverage --coverageReporters=json"

# Turborepo / Nx workspace
npx crap4ts --coverage-command "npx turbo run test -- --coverage"
```

The command must produce a `coverage/coverage-final.json` file in Istanbul JSON format.

### 2. `--runner vitest|jest` (skip auto-detection)

Use the built-in runner invocation for Vitest or Jest, but skip the config-file heuristic:

```bash
# Force Jest even if a vitest.config.ts exists
npx crap4ts --runner jest

# Force Vitest in a project without a vitest.config file
npx crap4ts --runner vitest
```

### 3. Auto-detection (default)

When neither flag is provided, crap4ts detects the runner automatically:

1. If any `vitest.config.*` file exists, use Vitest.
2. If any `jest.config.*` file exists, use Jest.
3. If `package.json` lists `jest` as a dependency, use Jest.
4. Otherwise, default to Vitest.

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
