import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { CliOptions } from './options';

export interface Crap4tsConfig {
  src?: string;
  exclude?: string[];
  output?: 'text' | 'json' | 'markdown' | 'csv';
  runner?: 'vitest' | 'jest';
  coverageCommand?: string;
  failOnCrap?: number;
  failOnComplexity?: number;
  failOnCoverageBelow?: number;
  top?: number;
  timeout?: number;
}

const CONFIG_FILES = ['crap4ts.config.json', '.crap4tsrc.json'];

export function loadConfig(explicitPath?: string): Crap4tsConfig {
  if (explicitPath) {
    if (!existsSync(explicitPath)) {
      throw new Error(`Config file not found: ${explicitPath}`);
    }
    return parseConfigFile(explicitPath);
  }

  for (const name of CONFIG_FILES) {
    const fullPath = join(process.cwd(), name);
    if (existsSync(fullPath)) {
      return parseConfigFile(fullPath);
    }
  }

  return {};
}

function parseConfigFile(filePath: string): Crap4tsConfig {
  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch (err) {
    throw new Error(`Failed to read config file: ${filePath}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in config file ${filePath}. Check for syntax errors.`);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Config file ${filePath} must contain a JSON object.`);
  }

  return parsed as Crap4tsConfig;
}

function mergeNullableOptions(opts: CliOptions, config: Crap4tsConfig): Partial<CliOptions> {
  return {
    runner: opts.runner ?? config.runner,
    coverageCommand: opts.coverageCommand ?? config.coverageCommand,
    failOnCrap: opts.failOnCrap ?? config.failOnCrap,
    failOnComplexity: opts.failOnComplexity ?? config.failOnComplexity,
    failOnCoverageBelow: opts.failOnCoverageBelow ?? config.failOnCoverageBelow,
    top: opts.top ?? config.top,
  };
}

function mergeDefaultOptions(opts: CliOptions, config: Crap4tsConfig): Partial<CliOptions> {
  return {
    srcDir: opts.srcDir !== 'src' ? opts.srcDir : (config.src ?? opts.srcDir),
    excludes: opts.excludes.length > 0 ? opts.excludes : (config.exclude ?? []),
    output: opts.output !== 'text' ? opts.output : (config.output ?? 'text'),
    timeoutMs: opts.timeoutMs !== 600_000 ? opts.timeoutMs : ((config.timeout ?? 600) * 1000),
  };
}

export function mergeConfigIntoOptions(opts: CliOptions, config: Crap4tsConfig): CliOptions {
  return {
    ...opts,
    ...mergeDefaultOptions(opts, config),
    ...mergeNullableOptions(opts, config),
  };
}
