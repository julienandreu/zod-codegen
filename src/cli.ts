#!/usr/bin/env node

import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import {Generator} from './generator.js';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

import loudRejection from 'loud-rejection';
import {handleErrors} from './utils/error-handler.js';
import {handleSignals} from './utils/signal-handler.js';
import debug from 'debug';
import {Reporter} from './utils/reporter.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Read package.json from the project root
// When built: dist/src/cli.js -> go up 2 levels to project root
// When in source: src/cli.ts -> go up 1 level to project root
// Try both paths to handle both cases
const packageJsonPath = __dirname.includes('dist')
  ? join(__dirname, '..', '..', 'package.json')
  : join(__dirname, '..', 'package.json');
const packageData = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
  name: string;
  version: string;
  description: string;
};

const {name, description, version} = packageData;
const reporter = new Reporter(process.stdout);
const startTime = process.hrtime.bigint();

debug(`${name}:${String(process.pid)}`);

loudRejection();
handleSignals(process, startTime);
handleErrors(process, startTime);

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
  .help()
  .parseSync();

const {input, output} = argv;

void (async () => {
  try {
    const generator = new Generator(name, version, reporter, input, output);
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
