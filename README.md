# crap4ts

**CRAP** (Change Risk Anti-Pattern) metric for TypeScript projects.

Combines cyclomatic complexity with test coverage to identify functions that are both complex and under-tested — the riskiest code to change.

## Quick Start

Install from npm:

```bash
npm install -g @sebassdc/crap4ts
```

Or from source:

```bash
git clone https://github.com/sebassdc/crap4ts.git
cd crap4ts
npm install
npm run build
npm install -g .
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
crap4ts
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
crap4ts --help              # show usage and available options
crap4ts --version           # print version number
crap4ts --src lib           # analyze from lib/ instead of src/
crap4ts --exclude dist      # exclude paths containing "dist"
crap4ts --timeout 120       # set analysis timeout to 120 seconds
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
crap4ts --config configs/crap4ts.json
```

### CLI Override Precedence

CLI flags always take precedence over config file values. For example, if your config file sets `"src": "lib"` but you run `crap4ts --src app`, the `app` directory is used.

### Supported Keys

| Key                  | Type       | Description                                      | Default |
|----------------------|------------|--------------------------------------------------|---------|
| `src`                | `string`   | Source directory to analyze                       | `"src"` |
| `exclude`            | `string[]` | Exclude paths containing these patterns           | `[]`    |
| `output`             | `string`   | Output format: `"text"`, `"json"`, `"markdown"`, or `"csv"` | `"text"`|
| `runner`             | `string`   | Test runner: `"vitest"` or `"jest"`              | auto    |
| `coverageCommand`    | `string`   | Custom shell command to generate coverage         | none    |
| `failOnCrap`         | `number`   | Fail if any CRAP score >= this value             | none    |
| `failOnComplexity`   | `number`   | Fail if any cyclomatic complexity >= this value  | none    |
| `failOnCoverageBelow`| `number`   | Fail if any function coverage < this % (0-100)   | none    |
| `top`                | `number`   | Show only the top N entries                       | all     |
| `timeout`            | `number`   | Analysis timeout in seconds                       | `600`   |

Unknown keys are silently ignored, so config files are forward-compatible with future versions.

## Programmatic API

crap4ts can be used as a library in your own tools and scripts. The API assumes coverage data already exists (run your test suite with coverage first).

```ts
import { generateReport, crapScore, extractFunctions } from '@sebassdc/crap4ts';

// High-level: analyze an entire source tree against existing coverage
const { entries } = generateReport({
  srcDir: 'src',
  coverageDir: 'coverage',
});

entries.forEach(e => console.log(`${e.name}: CRAP ${e.crap}`));
```

### `generateReport(options)`

Finds source files, parses coverage, analyzes each file, and returns entries sorted by CRAP score. This does **not** run your test suite -- it reads from an existing `coverage-final.json`.

| Option        | Type       | Description                                      | Default |
|---------------|------------|--------------------------------------------------|---------|
| `srcDir`      | `string`   | Source directory to scan for `.ts` files          | --      |
| `coverageDir` | `string`   | Directory containing `coverage-final.json`        | --      |
| `filters`     | `string[]` | Only include files matching these substrings      | `[]`    |
| `excludes`    | `string[]` | Exclude files whose path contains these substrings| `[]`    |

### Low-level exports

For fine-grained control, individual functions are also exported:

```ts
import {
  extractFunctions,    // parse a TS source string into FunctionInfo[]
  parseCoverage,       // read coverage-final.json from a directory
  coverageForRange,    // get coverage % for a line range
  sourceToModule,      // convert file path to dotted module name
  crapScore,           // compute CRAP score from complexity and coverage
  sortByCrap,          // sort CrapEntry[] by CRAP descending
  formatReport,        // render text table from CrapEntry[]
  formatJsonReport,    // render JSON string from CrapEntry[]
  formatMarkdownReport, // render markdown table from CrapEntry[]
  formatCsvReport,     // render CSV string from CrapEntry[]
  findSourceFiles,     // find all .ts files in a directory
  filterSources,       // filter file list by substring patterns
  analyzeFile,         // analyze a single file against coverage data
} from '@sebassdc/crap4ts';
```

TypeScript types `CrapEntry`, `FunctionInfo`, `CoverageData`, and `FileCoverageData` are also exported.

## CI Integration

Use threshold flags to fail CI when code quality drops below acceptable levels:

```bash
# Fail if any function has CRAP >= 30 or coverage below 70%
crap4ts --fail-on-crap 30 --fail-on-coverage-below 70

# Fail if any function has complexity >= 15, show only top 10
crap4ts --fail-on-complexity 15 --top 10
```

Multiple thresholds can be combined. The report is always printed before any failure.

The `--top` flag limits displayed entries but all entries are evaluated against thresholds.

### Exit Codes

| Code | Meaning |
|------|---------|
| 0    | Pass -- no threshold violations |
| 1    | Threshold violated or runtime error |
| 2    | Usage error (invalid flags or arguments) |

## Output Formats

crap4ts supports four output formats:

```bash
crap4ts                      # default text table
crap4ts --json               # JSON (shorthand for --output json)
crap4ts --output markdown    # Markdown table
crap4ts --output csv         # CSV
```

### Text (default)

```
CRAP Report
===========
Function                       Module                              CC   Cov%     CRAP
-------------------------------------------------------------------------------------
complexFn                      my.module                          12  45.0%    130.2
simpleFn                       my.module                           1 100.0%      1.0
```

### JSON

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

### Markdown

```markdown
# CRAP Report

| Function | Module | CC | Cov% | CRAP |
|---|---|---:|---:|---:|
| complexFn | my.module | 12 | 45.0% | 130.2 |
| simpleFn | my.module | 1 | 100.0% | 1.0 |
```

### CSV

```csv
Function,Module,CC,Coverage,CRAP
complexFn,my.module,12,45.0,130.2
simpleFn,my.module,1,100.0,1.0
```

Text output is the default. Use `--json` as a shorthand or `--output <format>` for any format.

## Excluding Paths

Use `--exclude` to filter out files whose path contains a given substring. The flag is repeatable:

```bash
# Skip dist and fixtures directories
crap4ts --exclude dist --exclude fixtures

# Analyze lib/ but skip generated code
crap4ts --src lib --exclude __generated__

# Combine with other options
crap4ts --src packages/core/src --exclude __mocks__ --exclude .stories --json
```

## Filtering

Pass module path fragments as arguments to filter:

```bash
crap4ts parser validator   # only files matching those strings
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

## Compatibility

| Layout | Status | Notes |
|--------|--------|-------|
| Standard (`src/`) | Supported | Default, no config needed |
| Custom source dir | Supported | Use `--src <dir>` |
| Monorepo workspace | Supported | Point `--src` to package source |
| Multiple src dirs | Supported | Use `--exclude` to filter |
| Windows paths | Supported | Normalized internally |
| Istanbul JSON coverage | Required | Other formats not supported |
| Branch coverage | Not used | Statement coverage only |

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
crap4ts skill install

# Project-local install (./.agents/skills/crap4ts/SKILL.md)
crap4ts skill install --project

# Print the bundled skill
crap4ts skill show

# Print where the skill is (or would be) installed
crap4ts skill path
crap4ts skill path --project

# Remove
crap4ts skill uninstall
crap4ts skill uninstall --project
```

The bundled skill lives inside the published package at `src/skill/SKILL.md`
and is shipped via the `files` field in `package.json`.

### Claude Code

Claude Code reads skills from `~/.claude/skills/`, not `~/.agents/skills/`.
After installing, symlink the skill so both directories stay in sync:

```bash
crap4ts skill install
ln -s ~/.agents/skills/crap4ts ~/.claude/skills/crap4ts
```

For project-local installs, symlink into `.claude/skills/` at the repo root:

```bash
crap4ts skill install --project
ln -s .agents/skills/crap4ts .claude/skills/crap4ts
```

## Runner Configuration

crap4ts supports three ways to run your test suite for coverage, applied in this order of precedence:

### 1. `--coverage-command` (highest priority)

Run an arbitrary shell command instead of the built-in runner logic. The command is executed with `shell: true`, so pipes, environment variables, and shell syntax all work.

```bash
# Monorepo: run tests only for a specific package
crap4ts --coverage-command "npm run test:api -- --coverage"

# Custom script with environment variables
crap4ts --coverage-command "CI=1 yarn test --coverage --coverageReporters=json"

# Turborepo / Nx workspace
crap4ts --coverage-command "npx turbo run test -- --coverage"
```

The command must produce a `coverage/coverage-final.json` file in Istanbul JSON format.

### 2. `--runner vitest|jest` (skip auto-detection)

Use the built-in runner invocation for Vitest or Jest, but skip the config-file heuristic:

```bash
# Force Jest even if a vitest.config.ts exists
crap4ts --runner jest

# Force Vitest in a project without a vitest.config file
crap4ts --runner vitest
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

## Inspiration

This project was inspired by [crap4clj](https://github.com/unclebob/crap4clj) by Uncle Bob.

## License

MIT
