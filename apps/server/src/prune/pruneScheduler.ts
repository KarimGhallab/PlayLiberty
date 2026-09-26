import { Cron } from 'croner';
import type { FastifyBaseLogger } from 'fastify';

export interface PruneSchedulerHandle {
  stop(): void;
}

export interface PruneSchedulerOptions {
  cron: string;
  logger: FastifyBaseLogger;
  prune: () => Promise<number>;
}

export function startPruneScheduler(
  options: PruneSchedulerOptions
): PruneSchedulerHandle {
  const job = new Cron(options.cron, { protect: true }, async () => {
    try {
      const removed = await options.prune();
      options.logger.info({ removed }, 'orphan prune finished');
    } catch (error) {
      options.logger.error({ err: error }, 'orphan prune failed');
    }
  });

  return {
    stop: (): void => {
      job.stop();
    }
  };
}
