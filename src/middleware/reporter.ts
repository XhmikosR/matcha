import { Middleware } from '../runner';
import { IReporter } from '../reporters';

/**
 * A middleware that instruments a reporter.
 */
export const reporterMiddleware = (reporter: IReporter): Middleware => {
  return async (bench, next) => {
    return next({
      ...bench,
      options: bench.options?.merge({
        onStart: (evt) => reporter.onStartCycle(evt.target),
        onComplete: (evt) => reporter.onFinishCycle(evt.target),
      }),
    });
  };
};
