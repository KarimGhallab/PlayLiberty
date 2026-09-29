export interface JobHandle {
  stop(): void;
}

export interface IntervalJobOptions {
  intervalMs: number;
  tick: () => void;
}

/*
 * A repeating tick with a stop, and nothing else. The pairing with cronJob is
 * deliberate: two features need a job, one runs on a cron expression and can
 * overlap, the other runs on a fixed interval and cannot, and the only thing they
 * have in common is that the server has to be able to stop them.
 *
 * `unref` is the part that is easy to lose. Without it a pending interval holds the
 * event loop open and the process stays alive after the server has closed, which
 * turns a clean shutdown into a hang that only shows up in a container.
 */
export function startIntervalJob(options: IntervalJobOptions): JobHandle {
  const timer = setInterval(options.tick, options.intervalMs);
  timer.unref();

  return {
    stop: (): void => {
      clearInterval(timer);
    }
  };
}
