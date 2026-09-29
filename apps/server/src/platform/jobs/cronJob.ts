import { Cron } from 'croner';
import type { FastifyBaseLogger } from 'fastify';

export interface JobHandle {
  stop(): void;
}

export interface CronJobOptions {
  cron: string;
  logger: FastifyBaseLogger;
  run: () => Promise<void>;
}

/*
 * A scheduled job owns three things and nothing else: when it runs, that two runs
 * cannot overlap, and that a throwing tick is contained rather than left to reject
 * into a timer nobody awaits.
 *
 * `run` returns nothing on purpose. The first job this replaced logged a count it
 * got back from its own service, and giving the runner a return type would have
 * frozen the first feature's answer into shared code. What a job does on a tick,
 * and what it logs about it, belong to the feature that scheduled it, which
 * already receives a logger and is the only thing that knows what a meaningful
 * number looks like.
 */
export function startCronJob(options: CronJobOptions): JobHandle {
  const job = new Cron(options.cron, { protect: true }, async () => {
    try {
      await options.run();
    } catch (error) {
      options.logger.error({ err: error }, 'scheduled job failed');
    }
  });

  return {
    stop: (): void => {
      job.stop();
    }
  };
}
