#!/usr/bin/env node

import { resolve } from 'path';
import { promises as fs } from 'fs';
import { EOL } from 'os';
import { Command } from 'commander';
import { reporters } from './reporters';
import { benchmark, Middleware } from './runner';
import { grepMiddleware } from './middleware/grep';
import { cpuProfiler } from './middleware/cpu-profiler';
import { IBenchmarkCase } from './suite';

const { version } = require('../package.json');

interface IArgs {
  reporters?: boolean;
  reporter: string;
  grep: string;
  cpuProfile?: string | true;
}

const program = new Command();

program
  .name('matcha')
  .version(version)
  .option('-g, --grep <pattern>', 'Run a subset of benchmarks', '')
  .option('-R, --reporter <reporter>', 'Specify the reporter to use', 'pretty')
  .option(
    '--cpu-profile [pattern]',
    'Run on all tests, or those matching the regex. Saves a .cpuprofile file that can be opened in the Chrome devtools.',
  )
  .option('--reporters', 'Display available reporters')
  .parse(process.argv);

const options = program.opts() as IArgs;

if (options.reporters) {
  printReporters();
} else if (process.argv.length === 2) {
  program.help();
} else {
  program.arguments('<file>');
  benchmarkFiles();
}

function benchmarkFiles() {
  const reporterFactory =
    typeof options.reporter === 'string' ? reporters[options.reporter] : options.reporter;

  if (!reporterFactory) {
    console.error(`Unknown reporter ${options.reporter}`);
    program.help();
  }

  const middleware: Middleware[] = [];
  if (options.grep) {
    middleware.push(grepMiddleware(new RegExp(options.grep, 'i')));
  }

  if (options.cpuProfile === true) {
    middleware.push(cpuProfiler(writeProfile));
  } else if (options.cpuProfile) {
    middleware.push(cpuProfiler(writeProfile, new RegExp(options.cpuProfile, 'i')));
  }

  benchmark({
    middleware,
    reporter: reporterFactory.start(),
    prepare(api) {
      Object.assign(global, api);
      for (const file of program.args) {
        require(resolve(process.cwd(), file));
      }
    },
  });
}

async function writeProfile(bench: Readonly<IBenchmarkCase>, profile: object) {
  const safeName = bench.name.replace(/[^a-z0-9]/gi, '-');
  await fs.writeFile(`${safeName}.cpuprofile`, JSON.stringify(profile));
}

function printReporters() {
  for (const [name, reporter] of Object.entries(reporters)) {
    process.stdout.write(`${name.padStart(15)} - ${reporter.description}${EOL}`);
  }
}
