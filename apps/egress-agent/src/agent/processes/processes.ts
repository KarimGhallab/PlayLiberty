import type { ChildProcess } from 'node:child_process';

/* How long after a kill a late failure still reads as the switch's. */
const INTERRUPTED_WINDOW_MS = 2000;

/*
 * The children a switch must drain: every yt-dlp run registers here, the
 * switch waits for them, then kills the ones that outlived the drain.
 */
export class ChildRegistry {
  private readonly _children = new Set<ChildProcess>();
  private readonly _idle = new Set<() => void>();
  private _switching = false;
  private _killedAt = 0;

  public readonly track = (child: ChildProcess): (() => void) => {
    this._children.add(child);

    return () => {
      this._children.delete(child);

      if (this._children.size === 0) {
        for (const wake of this._idle) {
          wake();
        }

        this._idle.clear();
      }
    };
  };

  public get size(): number {
    return this._children.size;
  }

  /* A route that fails inside this window answers `switching`, so its caller
   * releases the claim instead of blaming the source. */
  public get interrupted(): boolean {
    return (
      this._switching || Date.now() - this._killedAt < INTERRUPTED_WINDOW_MS
    );
  }

  public beginSwitch(): void {
    this._switching = true;
  }

  public endSwitch(): void {
    this._switching = false;
  }

  public async drain(timeoutMs: number): Promise<void> {
    if (this._children.size === 0) {
      return;
    }

    await new Promise<void>(resolve => {
      const wake = (): void => {
        clearTimeout(timer);
        this._idle.delete(wake);
        resolve();
      };
      const timer = setTimeout(() => {
        this._idle.delete(wake);
        resolve();
      }, timeoutMs);

      this._idle.add(wake);
    });
  }

  public killAll(): void {
    if (this._children.size === 0) {
      return;
    }

    this._killedAt = Date.now();

    for (const child of this._children) {
      if (child.pid === undefined) {
        continue;
      }

      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        child.kill('SIGKILL');
      }
    }
  }
}
