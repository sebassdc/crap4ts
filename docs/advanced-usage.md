# Advanced Usage

This document covers advanced invocation patterns, CI integration, and troubleshooting for crap4ts.

## Monorepo Invocation

In a monorepo, point crap4ts at a specific package's source directory:

```bash
npx crap4ts --src packages/core/src
```

crap4ts will look for `coverage-final.json` and run tests scoped to that directory. Run this from the package root that contains the relevant `package.json` and test config.

## Custom Source Roots

If your TypeScript source lives outside `src/`, specify it explicitly:

```bash
npx crap4ts --src lib
```

Any directory name is accepted. The path is resolved relative to the current working directory.

## JSON Output in CI

Emit machine-readable JSON for downstream processing, threshold checks, or artifact storage:

```bash
npx crap4ts --json > report.json
```

The output schema:

```json
{
  "tool": "crap4ts",
  "entries": [
    {
      "name": "myFunction",
      "module": "my.module",
      "complexity": 5,
      "coverage": 80,
      "crap": 5.2
    }
  ]
}
```

In a CI step you can fail the build when high-CRAP entries are present:

```bash
npx crap4ts --json > report.json
node -e "
  const r = require('./report.json');
  const hot = r.entries.filter(e => e.crap > 30);
  if (hot.length) { console.error('High CRAP:', hot.map(e=>e.name)); process.exit(1); }
"
```

## Filtering by Module Path Fragment

Pass one or more path fragments as positional arguments to restrict the report to matching files:

```bash
npx crap4ts auth payment
```

crap4ts retains only entries whose module path contains at least one of the supplied fragments. This is useful for focusing on a specific feature area without changing your source directory.

## Skill Management

crap4ts ships a bundled `SKILL.md` for cross-agent harnesses (Claude Code, Codex, Pi, etc.):

```bash
# Install globally (~/.agents/skills/crap4ts/SKILL.md)
npx crap4ts skill install

# Install project-locally (./.agents/skills/crap4ts/SKILL.md)
npx crap4ts skill install --project

# Print the bundled skill content
npx crap4ts skill show

# Print the resolved install path
npx crap4ts skill path
npx crap4ts skill path --project

# Remove
npx crap4ts skill uninstall
npx crap4ts skill uninstall --project
```

## Timeout Adjustment

The default timeout for the coverage run is 60 seconds. For large test suites, increase it:

```bash
npx crap4ts --timeout 120
```

The value is in seconds. If the coverage run exceeds the timeout, crap4ts exits with an error. Increase proportionally to your suite's typical wall-clock time.

---

## Troubleshooting

### `Source directory 'src' not found`

Your project uses a different source root. Fix it with:

```bash
npx crap4ts --src <your-source-dir>
```

### `No TypeScript files found`

The source directory exists but contains no `.ts` files. Verify the path and check that you are not accidentally pointing at a build output directory (`dist/`, `out/`).

### `No files match the filters`

Your filter arguments do not match any module paths in the report. Module paths are derived from the file path relative to the project root, with `/` replaced by `.`. Run without filters first to see the full list of module names, then narrow down.

### `Unable to parse package.json`

Your `package.json` is malformed. Fix the JSON syntax, or bypass auto-detection by specifying the runner explicitly:

```bash
npx crap4ts --runner vitest
# or
npx crap4ts --runner jest
```

### `Coverage run failed`

The test suite itself is failing. Run your tests independently first:

```bash
npx vitest run --coverage
# or
npx jest --coverage
```

Fix any failures, then re-run crap4ts.

### `No coverage-final.json found`

Your test runner is not emitting Istanbul JSON coverage. Add `json` to your coverage reporters (see Quick Start in the README), then re-run.

### `Coverage run timed out`

The test suite takes longer than the configured timeout. Increase it:

```bash
npx crap4ts --timeout 180
```

If your suite is inherently slow, consider running it separately and pointing crap4ts at a pre-existing `coverage-final.json` by placing it where the tool expects it before invoking crap4ts.
