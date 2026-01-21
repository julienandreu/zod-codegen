#!/usr/bin/env node

import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import {Generator, type GeneratorOptions, type NamingConvention} from './generator';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

import loudRejection from 'loud-rejection';
import {handleErrors} from './utils/error-handler';
import {handleSignals} from './utils/signal-handler';
import debug from 'debug';
import {Reporter} from './utils/reporter';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Read package.json from the project root
// Handle multiple scenarios:
// 1. Built locally: dist/src/cli.js -> go up 2 levels
// 2. Source: src/cli.ts -> go up 1 level
// 3. Installed via npm: node_modules/zod-codegen/dist/src/cli.js -> go up 2 levels
// Try multiple paths to ensure we find package.json
const possiblePaths = [
  join(__dirname, '..', '..', 'package.json'), // dist/src/cli.js or node_modules/pkg/dist/src/cli.js
  join(__dirname, '..', 'package.json'), // src/cli.ts
];

let packageJsonPath: string | undefined;
for (const path of possiblePaths) {
  try {
    readFileSync(path, 'utf-8');
    packageJsonPath = path;
    break;
  } catch {
    // Try next path
  }
}

if (!packageJsonPath) {
  throw new Error('Could not find package.json. Please ensure the package is properly installed.');
}

const packageData = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
  name: string;
  version: string;
  description: string;
};

const {name, description, version} = packageData;
const reporter = new Reporter(process.stdout, process.stderr);
const startTime = process.hrtime.bigint();

debug(`${name}:${String(process.pid)}`);

loudRejection();
handleSignals(process, startTime, reporter);
handleErrors(process, startTime, reporter);

const argv = yargs(hideBin(process.argv))
  .scriptName(name)
  .usage(`${description}\n\nUsage: $0 [options]`)
  .version(version)
  .option('input', {
    alias: 'i',
    type: 'string',
    description: 'Path or URL to OpenAPI file',
    demandOption: true,
  })
  .option('output', {
    alias: 'o',
    type: 'string',
    description: 'Directory to output the generated files',
    default: 'generated',
  })
  .option('naming-convention', {
    alias: 'n',
    type: 'string',
    description: 'Naming convention to apply to operation IDs',
    choices: ['camelCase', 'PascalCase', 'snake_case', 'kebab-case', 'SCREAMING_SNAKE_CASE', 'SCREAMING-KEBAB-CASE'],
    default: undefined,
  })
  .option('explicit-types', {
    alias: 'e',
    type: 'boolean',
    description: 'Generate explicit TypeScript interfaces alongside Zod schemas to avoid ts(7056) errors',
    default: false,
  })
  .strict()
  .help()
  .parseSync();

const {input, output, namingConvention, explicitTypes} = argv;

/**
 * Type guard to validate that a string is a valid naming convention.
 * This ensures type safety when parsing CLI arguments.
 *
 * @param value - The value to check
 * @returns True if the value is a valid NamingConvention
 */
function isValidNamingConvention(value: string | undefined): value is NamingConvention {
  if (value === undefined) {
    return false;
  }
  const validConventions: readonly NamingConvention[] = [
    'camelCase',
    'PascalCase',
    'snake_case',
    'kebab-case',
    'SCREAMING_SNAKE_CASE',
    'SCREAMING-KEBAB-CASE',
  ] as const;
  return validConventions.includes(value as NamingConvention);
}

void (async () => {
  try {
    const options: GeneratorOptions = {
      ...(isValidNamingConvention(namingConvention) ? {namingConvention} : {}),
      ...(explicitTypes ? {explicitTypes} : {}),
    };

    const generator = new Generator(name, version, reporter, input, output, options);
    const exitCode = await generator.run();
    process.exit(exitCode);
  } catch (error) {
    if (error instanceof Error) {
      reporter.error(`Fatal error: ${error.message}`);
    } else {
      reporter.error('An unknown fatal error occurred');
    }
    process.exit(1);
  }
})();
