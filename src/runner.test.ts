import { promisify } from 'util';
import { expect } from 'chai';
import { benchmark } from './runner';
import { IOptions } from './options';
import { GatherReporter } from './reporters/gather';
import { grepMiddleware } from './middleware/grep';

const timeout = promisify(setTimeout);

const noop = () => {};

// There's really no other test setup I could use for a project
// called matcha but mocha and chai

describe('runner', () => {
  it('sets options correctly', async () => {
    const results: [string, IOptions][] = [];
    await benchmark({
      reporter: new GatherReporter(),
      async runFunction(name, options) {
        const { maxTime, initCount } = options;
        results.push([name, { maxTime, initCount }]);
      },
      prepare(api) {
        api.set('maxTime', 1);
        api.bench('a', noop);
        api.bench('aaa', noop);
        api.suite('aSuite', () => {
          api.set('initCount', 100);
          api.bench('c', noop);
        });
      },
    });

    expect(results).to.deep.equal([
      ['a', { maxTime: 1, initCount: undefined }],
      ['aaa', { maxTime: 1, initCount: undefined }],
      ['aSuite#c', { maxTime: 1, initCount: 100 }],
    ]);
  });

  it('greps for tests', async () => {
    const results: string[] = [];
    await benchmark({
      middleware: [grepMiddleware(/^a/)],
      reporter: new GatherReporter(),
      async runFunction(name) {
        results.push(name);
      },
      prepare(api) {
        api.bench('a', noop);
        api.bench('b', noop);
        api.bench('aaa', noop);
        api.bench('ba', noop);
      },
    });

    expect(results).to.deep.equal(['a', 'aaa']);
  });

  it('handles lifecycle correctly', async () => {
    const results: string[] = [];
    await benchmark({
      reporter: new GatherReporter(),
      async runFunction() {
        results.push('bench');
      },
      prepare(api) {
        api.set('setup', async () => {
          results.push('in a');
          return timeout(1);
        });

        api.set('teardown', async () => {
          results.push('out a');
          return timeout(1);
        });

        api.suite('b', () => {
          api.set('setup', () => {
            results.push('in b');
          });

          api.set('teardown', () => {
            results.push('out b');
          });

          api.suite('c', () => {
            api.set('setup', (callback) => {
              results.push('in c');
              setTimeout(() => {
                callback(null);
              }, 1);
            });

            api.set('teardown', (callback) => {
              results.push('out c');
              setTimeout(() => {
                callback(null);
              }, 1);
            });

            api.bench('', noop);
          });
        });
      },
    });

    expect(results).to.deep.equal(['in a', 'in b', 'in c', 'bench', 'out c', 'out b', 'out a']);
  });

  it('runs e2e', async function () {
    this.timeout(10_000);

    const reporter = new GatherReporter();
    const obj1 = { a: 1, b: 2, c: 3 };
    const obj2 = { ...obj1 };
    await benchmark({
      reporter,
      prepare(api) {
        api.set('maxTime', 0.5);
        api.bench('deepEqual', () => {
          expect(obj1).to.deep.equal(obj2);
        });
        api.bench('strictEqual', () => {
          expect(obj1).to.equal(obj1);
        });
      },
    });

    expect(reporter.results).to.have.lengthOf(2);
    for (const result of reporter.results) {
      expect(result.error).to.be.undefined;
      expect(result.hz).to.be.greaterThan(1);
    }
  });
});
