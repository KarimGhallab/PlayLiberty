import { Cron } from 'croner';
import type { FastifyBaseLogger } from 'fastify';

export interface JobHandle {
  /* Stop the clock and signal the run in flight, so a started job stops safely
   * rather than being cut off. */
  stop(): void;
}

export interface CronJobOptions {
  cron: string;
  logger: FastifyBaseLogger;
  run: (signal: AbortSignal) => Promise<void>;
}

/* A scheduled job owns when it runs, that runs cannot overlap, and a tick's
 * throw is contained. `run` gets a signal so it can stop at a safe point. */
export function startCronJob(options: CronJobOptions): JobHandle {
  let controller = new AbortController();

  const job = new Cron(options.cron, { protect: true }, async () => {
    // A fresh controller per tick, so a stop signals only the run it was called
    // during.
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
