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
import {isManifest} from './utils/manifest.js';
import {Reporter} from './utils/reporter.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifestData: unknown = JSON.parse(readFileSync(join(__dirname, 'assets', 'manifest.json'), 'utf-8'));

if (!isManifest(manifestData)) {
  process.exit(1);
}

const {name, description, version} = manifestData;
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
