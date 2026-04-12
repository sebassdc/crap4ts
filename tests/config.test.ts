import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { loadConfig } from '../src/config';

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
