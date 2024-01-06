#!/usr/bin/env node
import {program} from 'commander';
import {Generator} from './generator';
import manifestData from './assets/manifest.json';
import loudRejection from 'loud-rejection';
import {handleErrors} from './utils/error-handler';
import {handleSignals} from './utils/signal-handler';
import debug from 'debug';
import {isManifest} from './utils/manifest';
import {Reporter} from './utils/reporter';

interface CLIOptions {
  input: string;
  output: string;
}

if (!isManifest(manifestData)) {
  process.exit(1);
}

// Get manifest data
const {name, description, version} = manifestData;

// Set output stream
const reporter = new Reporter(process.stdout);

// Get HRTime
const startTime = process.hrtime.bigint();

// Define debug namespace
debug(`${name}:${process.pid}`);

// Loud rejection
loudRejection();

// Handle signals
handleSignals(process, startTime);

// Handle errors
handleErrors(process, startTime);

// Define program params
program
  .name(name)
  .description(description)
  .version(version)
  .requiredOption('-i, --input <path|url>', 'Path or URL to OpenAPI file')
  .option('-o, --output [directory]', 'Directory to output the generated files', 'generated')
  .parse();

// Parse params
const {input, output} = program.opts<CLIOptions>();

// Cli
void (() => {
  // Setup Generator
  const generator = new Generator(name, version, reporter, input, output);

  // Run
  const exitCode = generator.run();

  // Return exit code
  process.exit(exitCode);
})();
