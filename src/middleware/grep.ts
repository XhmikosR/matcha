import { Middleware } from '../runner';

export const grepMatches = (pattern: string | RegExp, name: string) => {
  return typeof pattern === 'string' ? name.toLowerCase().includes(pattern) : pattern.test(name);
};

/**
 * A middleware that only runs benchmark cases matching
 * the given pattern.
 */
export const grepMiddleware = (pattern: string | RegExp): Middleware => {
  return async (bench, next) =>
    grepMatches(pattern, bench.name) ? next(bench) : Promise.resolve();
};
