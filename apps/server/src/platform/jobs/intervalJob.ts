export interface JobHandle {
  stop(): void;
}

export interface IntervalJobOptions {
  intervalMs: number;
  tick: () => void;
}

/* A repeating tick with a stop. `unref` is easy to lose: without it a pending
 * timer holds the event loop open, turning a clean shutdown into a hang. */
export function startIntervalJob(options: IntervalJobOptions): JobHandle {
  const timer = setInterval(options.tick, options.intervalMs);
  timer.unref();

  return {
    stop: (): void => {
      clearInterval(timer);
    }
  };
}
