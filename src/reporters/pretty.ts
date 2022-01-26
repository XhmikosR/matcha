import { moveCursor, clearLine } from 'readline';
import { EOL } from 'os';
import pc from 'picocolors';
import { Benchmark, IReporter, IReporterFactory } from '.';

const center = 30;

export const prettyFactory: IReporterFactory = {
  description: 'Pretty prints results to the console',
  start: () => new PrettyReporter(process.stdout),
};

export class PrettyReporter implements IReporter {
  private readonly numberFormat = Intl.NumberFormat('en-US', { maximumSignificantDigits: 3 });
  private readonly results: Benchmark[] = [];

  constructor(private readonly out: NodeJS.WriteStream) {
    this.out.write(EOL);
  }

  onStartCycle(benchmark: Benchmark) {
    this.out.write(pc.yellow('running > '.padStart(center)) + pc.gray(benchmark.name));
    this.out.write(EOL);
  }

  onFinishCycle(newResult: Benchmark) {
    this.results.push(newResult);
    moveCursor(this.out, 0, -this.results.length);

    let minHz = Number.POSITIVE_INFINITY;
    let maxHz = 0;

    for (const benchmark of this.results) {
      if (benchmark.hz) {
        minHz = Math.min(minHz, benchmark.hz);
        maxHz = Math.max(maxHz, benchmark.hz);
      }
    }

    for (const benchmark of this.results) {
      clearLine(this.out, 0);

      if (benchmark.error) {
        this.out.write(pc.red('error > '.padStart(center)) + pc.gray(benchmark.name));
      } else {
        const text = benchmark.name + ` (${this.numberFormat.format(benchmark.hz / minHz)}x)`;
        this.out.write(
          pc.green(`${this.numberFormat.format(benchmark.hz)} ops/sec > `.padStart(center)) +
            (benchmark.hz === maxHz ? text : pc.gray(text)),
        );
      }

      this.out.write(EOL);
    }
  }

  onComplete() {
    const cases = [...this.results];
    const error = cases.find((c) => Boolean(c.error));

    if (error) {
      this.out.write(pc.red(error.error.stack));
      return;
    }

    cases.sort((a, b) => b.hz - a.hz);
    const elapsed = cases.reduce((n, c) => n + c.times.elapsed, 0);

    this.out.write(EOL);
    this.out.write(`  ${pc.gray('Benches')}: ${cases.length}${EOL}`);
    this.out.write(`  ${pc.gray('Fastest')}: ${(cases[0] as any)?.name}${EOL}`);
    this.out.write(`  ${pc.gray('Elapsed')}: ${this.numberFormat.format(elapsed)}s${EOL}`);
    this.out.write(EOL);
  }
}
