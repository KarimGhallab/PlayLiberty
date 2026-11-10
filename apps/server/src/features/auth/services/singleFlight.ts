/* One task per key at a time. A second caller awaits the first result, and a
 * settled key is forgotten so the next attempt starts fresh. */
export class SingleFlight<Result> {
  private readonly _inFlight = new Map<string, Promise<Result>>();

  pending(key: string): Promise<Result> | undefined {
    return this._inFlight.get(key);
  }

  run(key: string, task: () => Promise<Result>): Promise<Result> {
    const existing = this._inFlight.get(key);

    if (existing !== undefined) {
      return existing;
    }

    const started = task().finally(() => {
      this._inFlight.delete(key);
    });
    this._inFlight.set(key, started);

    return started;
  }
}
