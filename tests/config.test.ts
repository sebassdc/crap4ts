import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { loadConfig, mergeConfigIntoOptions } from '../src/config';
import type { CliOptions } from '../src/options';
import { parseOptions } from '../src/options';

const TMP_DIR = join(__dirname, '__config-test-tmp__');

function inTmp(name: string): string {
  return join(TMP_DIR, name);
}

describe('loadConfig', () => {
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    mkdirSync(TMP_DIR, { recursive: true });
    process.chdir(TMP_DIR);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(TMP_DIR, { recursive: true, force: true });
  });

  it('returns {} when no config file exists', () => {
    expect(loadConfig()).toEqual({});
  });

  it('loads crap4ts.config.json when it exists', () => {
    const config = { src: 'lib', failOnCrap: 30 };
    writeFileSync(inTmp('crap4ts.config.json'), JSON.stringify(config));
    expect(loadConfig()).toEqual(config);
  });

  it('loads .crap4tsrc.json as fallback', () => {
    const config = { output: 'json' };
    writeFileSync(inTmp('.crap4tsrc.json'), JSON.stringify(config));
    expect(loadConfig()).toEqual(config);
  });

  it('prefers crap4ts.config.json over .crap4tsrc.json', () => {
    writeFileSync(inTmp('crap4ts.config.json'), JSON.stringify({ src: 'primary' }));
    writeFileSync(inTmp('.crap4tsrc.json'), JSON.stringify({ src: 'fallback' }));
    expect(loadConfig()).toEqual({ src: 'primary' });
  });

  it('loads explicit path when provided', () => {
    const customPath = inTmp('custom.json');
    writeFileSync(customPath, JSON.stringify({ top: 5 }));
    expect(loadConfig(customPath)).toEqual({ top: 5 });
  });

  it('throws when explicit path does not exist', () => {
    expect(() => loadConfig('/nonexistent/config.json')).toThrow('Config file not found');
  });

  it('throws with actionable message on invalid JSON', () => {
    writeFileSync(inTmp('crap4ts.config.json'), '{ bad json }');
    expect(() => loadConfig()).toThrow(/Invalid JSON.*syntax errors/);
  });

  it('throws if config file contains a non-object', () => {
    writeFileSync(inTmp('crap4ts.config.json'), '"just a string"');
    expect(() => loadConfig()).toThrow(/must contain a JSON object/);
  });

  it('throws if config file contains an array', () => {
    writeFileSync(inTmp('crap4ts.config.json'), '[1, 2, 3]');
    expect(() => loadConfig()).toThrow(/must contain a JSON object/);
  });

  it('ignores unknown keys (forward-compatible)', () => {
    writeFileSync(inTmp('crap4ts.config.json'), JSON.stringify({ src: 'lib', futureKey: true }));
    const config = loadConfig();
    expect(config.src).toBe('lib');
    expect((config as Record<string, unknown>)['futureKey']).toBe(true);
  });
});

describe('parseOptions --config', () => {
  it('parses --config flag', () => {
    const o = parseOptions(['--config', 'my-config.json']);
    expect(o.configPath).toBe('my-config.json');
  });

  it('throws for --config without argument', () => {
    expect(() => parseOptions(['--config'])).toThrow('--config requires a file path argument');
  });

  it('defaults configPath to undefined', () => {
    const o = parseOptions([]);
    expect(o.configPath).toBeUndefined();
  });
});

describe('mergeConfigIntoOptions', () => {
  function defaults(overrides: Partial<CliOptions> = {}): CliOptions {
    return {
      mode: 'report',
      filters: [],
      srcDir: 'src',
      coverageDir: 'coverage',
      timeoutMs: 600_000,
      output: 'text',
      excludes: [],
      ...overrides,
    };
  }

  it('config fills in defaults when CLI does not specify', () => {
    const merged = mergeConfigIntoOptions(defaults(), {
      src: 'lib',
      exclude: ['dist'],
      output: 'json',
      runner: 'jest',
      coverageCommand: 'npm test',
      failOnCrap: 30,
      failOnComplexity: 10,
      failOnCoverageBelow: 80,
      top: 5,
      timeout: 120,
    });
    expect(merged.srcDir).toBe('lib');
    expect(merged.excludes).toEqual(['dist']);
    expect(merged.output).toBe('json');
    expect(merged.runner).toBe('jest');
    expect(merged.coverageCommand).toBe('npm test');
    expect(merged.failOnCrap).toBe(30);
    expect(merged.failOnComplexity).toBe(10);
    expect(merged.failOnCoverageBelow).toBe(80);
    expect(merged.top).toBe(5);
    expect(merged.timeoutMs).toBe(120_000);
  });

  it('CLI flags override config values', () => {
    const opts = defaults({
      srcDir: 'custom-src',
      excludes: ['my-exclude'],
      output: 'json',
      runner: 'vitest',
      coverageCommand: 'cli-cmd',
      failOnCrap: 50,
      failOnComplexity: 20,
      failOnCoverageBelow: 90,
      top: 10,
      timeoutMs: 30_000,
    });
    const merged = mergeConfigIntoOptions(opts, {
      src: 'config-src',
      exclude: ['config-exclude'],
      output: 'text',
      runner: 'jest',
      coverageCommand: 'config-cmd',
      failOnCrap: 5,
      failOnComplexity: 2,
      failOnCoverageBelow: 50,
      top: 3,
      timeout: 999,
    });
    expect(merged.srcDir).toBe('custom-src');
    expect(merged.excludes).toEqual(['my-exclude']);
    expect(merged.output).toBe('json');
    expect(merged.runner).toBe('vitest');
    expect(merged.coverageCommand).toBe('cli-cmd');
    expect(merged.failOnCrap).toBe(50);
    expect(merged.failOnComplexity).toBe(20);
    expect(merged.failOnCoverageBelow).toBe(90);
    expect(merged.top).toBe(10);
    expect(merged.timeoutMs).toBe(30_000);
  });

  it('empty config has no effect on defaults', () => {
    const opts = defaults();
    const merged = mergeConfigIntoOptions(opts, {});
    expect(merged.srcDir).toBe('src');
    expect(merged.excludes).toEqual([]);
    expect(merged.output).toBe('text');
    expect(merged.timeoutMs).toBe(600_000);
  });

  it('preserves mode, filters, coverageDir, configPath', () => {
    const opts = defaults({ filters: ['foo'], configPath: 'my.json' });
    const merged = mergeConfigIntoOptions(opts, { src: 'lib' });
    expect(merged.mode).toBe('report');
    expect(merged.filters).toEqual(['foo']);
    expect(merged.coverageDir).toBe('coverage');
    expect(merged.configPath).toBe('my.json');
  });
});
