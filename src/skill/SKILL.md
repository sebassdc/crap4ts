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

Install crap4ts from npm:
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

## Usage

Run from the project root (where `src/` lives):

```bash
crap4ts

# Filter to specific modules
crap4ts parser validator

# Exclude paths
crap4ts --exclude dist --exclude fixtures

# Custom source directory
crap4ts --src packages/core/src
```

crap4ts automatically deletes stale coverage data, runs the test suite with coverage, and prints the report.

### CLI Options

| Flag | Argument | Description | Default |
|------|----------|-------------|---------|
| `--src` | `<dir>` | Source directory to analyze | `src` |
| `--exclude` | `<pattern>` | Exclude paths containing pattern (repeatable) | none |
| `--output` | `text\|json\|markdown\|csv` | Output format | `text` |
| `--json` | — | Shorthand for `--output json` | — |
| `--runner` | `vitest\|jest` | Skip auto-detection, use specified runner | auto-detect |
| `--coverage-command` | `<cmd>` | Custom shell command for coverage generation | none |
| `--fail-on-crap` | `<n>` | Exit 1 if any function CRAP score >= n | none |
| `--fail-on-complexity` | `<n>` | Exit 1 if any function complexity >= n | none |
| `--fail-on-coverage-below` | `<n>` | Exit 1 if coverage < n% (0-100) | none |
| `--top` | `<n>` | Show only top N entries (thresholds still check all) | all |
| `--timeout` | `<seconds>` | Analysis timeout | `600` |
| `--config` | `<path>` | Load config from specific file | auto-discover |
| `--help, -h` | — | Show help | — |
| `--version, -v` | — | Show version | — |

### Configuration File

crap4ts auto-discovers `crap4ts.config.json` or `.crap4tsrc.json` in the working directory. CLI flags override config values.

```json
{
  "src": "lib",
  "exclude": ["dist", "fixtures"],
  "output": "json",
  "runner": "vitest",
  "coverageCommand": "npm run test:api -- --coverage",
  "failOnCrap": 30,
  "failOnComplexity": 15,
  "failOnCoverageBelow": 70,
  "top": 10,
  "timeout": 120
}
```

### Output Formats

**Text** (default) — sorted table:
```
CRAP Report
===========
Function                       Module                              CC   Cov%     CRAP
-------------------------------------------------------------------------------------
complexFn                      my.module                          12  45.0%    130.2
simpleFn                       my.module                           1 100.0%      1.0
```

**JSON** (`--json` or `--output json`):
```json
{
  "tool": "crap4ts",
  "entries": [
    { "name": "complexFn", "module": "my.module", "complexity": 12, "coverage": 45, "crap": 130.2 }
  ]
}
```

**Markdown** (`--output markdown`) — pipe-table format.

**CSV** (`--output csv`) — header row + data rows.

### CI Integration

Use `--fail-on-*` flags to enforce quality gates:

```bash
crap4ts --fail-on-crap 30 --fail-on-complexity 15 --fail-on-coverage-below 70
```

Exit codes: `0` success, `1` threshold violation or error, `2` usage error.

### Custom Coverage Command

For non-standard setups, bypass runner auto-detection entirely:

```bash
crap4ts --coverage-command "CI=1 yarn test --coverage --coverageReporters=json"
```

## Interpreting Scores

| CRAP Score | Meaning |
|-----------|---------|
| 1-5       | Clean — low complexity, well tested |
| 5-30      | Moderate — consider refactoring or adding tests |
| 30+       | Crappy — high complexity with poor coverage |

## Programmatic API

```typescript
import { generateReport } from '@sebassdc/crap4ts';

const { entries } = generateReport({
  srcDir: 'src',
  coverageDir: 'coverage',
  filters: ['parser', 'validator'],
  excludes: ['__mocks__', '.stories']
});

entries.forEach(e => console.log(`${e.name}: CRAP ${e.crap}`));
```

Also exports: `extractFunctions`, `parseCoverage`, `coverageForRange`, `crapScore`, `sortByCrap`, `formatReport`, `formatJsonReport`, `formatMarkdownReport`, `formatCsvReport`, `findSourceFiles`, `filterSources`, `analyzeFile`, `sourceToModule`, `normalizePath`.

## How It Works

1. Deletes stale `coverage/` directory
2. Detects test runner (Vitest or Jest) from config files, or uses `--runner` / `--coverage-command`
3. Runs tests with coverage to generate `coverage/coverage-final.json`
4. Finds all `.ts` / `.tsx` files under the source directory
5. Extracts top-level functions, class methods/getters/setters, and object literal methods using the TypeScript compiler API
6. Computes cyclomatic complexity:
   - `if`/`else if`, ternary: +1 each
   - `for`, `for...of`, `for...in`, `while`, `do...while`: +1 each
   - `catch` handler: +1 each
   - `&&`, `||`, `??`: +1 per operator
   - `case` in `switch`: +1 each (`default` excluded)
   - Nested functions and classes are skipped
7. Reads `coverage/coverage-final.json` for per-statement coverage data
8. Applies CRAP formula: `CC` x `(1 - cov)^3 + CC`
9. Applies filters, exclusions, and `--top` limit
10. Formats output and checks thresholds
