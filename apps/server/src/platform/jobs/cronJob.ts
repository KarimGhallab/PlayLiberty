import { Cron } from 'croner';
import type { FastifyBaseLogger } from 'fastify';

export interface JobHandle {
  /*
   * Stop the clock and signal the run in flight. The signal is what lets a job that
   * has started stop at a safe point rather than being cut off, and it is why this
   * is not just `clearInterval`.
   */
  stop(): void;
}

export interface CronJobOptions {
  cron: string;
  logger: FastifyBaseLogger;
  run: (signal: AbortSignal) => Promise<void>;
}

/*
 * A scheduled job owns four things and nothing else: when it runs, that two runs
 * cannot overlap, that a throwing tick is contained rather than left to reject
 * into a timer nobody awaits, and that a shutdown can tell the run in flight to
 * finish at a safe point.
 *
 * `run` receives a signal and returns nothing on purpose. The signal is how a
 * feature that deletes files stops between units of work instead of being
 * interrupted inside one; the return stays empty because what a job does on a tick,
 * and what it logs about it, belong to the feature that scheduled it, which already
 * receives a logger and is the only thing that knows what a meaningful number looks
 * like.
 */
export function startCronJob(options: CronJobOptions): JobHandle {
  let controller = new AbortController();

  const job = new Cron(options.cron, { protect: true }, async () => {
    // A fresh controller per tick, so a stop only signals the run it was called
    // during. The previous run's controller has already been retired by its own
    // tick finishing.
    controller = new AbortController();

    try {
      await options.run(controller.signal);
    } catch (error) {
      options.logger.error({ err: error }, 'scheduled job failed');
    }
  });

  return {
    stop: (): void => {
      job.stop();
      controller.abort();
    }
  };
}
