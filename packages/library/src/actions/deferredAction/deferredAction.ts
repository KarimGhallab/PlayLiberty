/* The deferred-action seam: a surface opens a window with a commit and reads
 * back every open window, so each toast owns its cancel and countdown. */

export interface PendingAction {
  /** The subject's id, which a surface matches instead of the shared name. */
  readonly id: string;
  /** What the window acts on, so a surface can tell its own windows apart. */
  readonly kind?: string;
  /** The sentence the toast shows, in the present tense. */
  readonly message: string;
  readonly detail: string | null;
  readonly commit: () => void;
}

/** One open window, as the toast surface reads it. */
export interface DeferredWindow {
  /** Stable identity for the list entry and its ring. */
  readonly key: number;
  readonly id: string;
  readonly kind: string | null;
  readonly message: string;
  readonly detail: string | null;
  /** When the countdown ends, or null while the surface holds the window. */
  readonly expiresAt: number | null;
  /** Whether the countdown runs. A held window waits for its surface. */
  readonly started: boolean;
}

export interface DeferOptions {
  /** False holds the window until the surface starts it. Defaults to true. */
  readonly started?: boolean;
  /** The quiet time after the countdown before the commit. Defaults to zero. */
  readonly graceMs?: number;
}

export interface DeferredAction {
  readonly windows: readonly DeferredWindow[];
  readonly defer: (action: PendingAction, options?: DeferOptions) => number;
  readonly startAll: () => void;
  readonly cancel: (key: number) => void;
  readonly commit: (key: number) => void;
}

type TimerHandle = ReturnType<typeof setTimeout>;

interface WindowEntry {
  readonly key: number;
  readonly action: PendingAction;
  readonly durationMs: number;
  readonly graceMs: number;
  readonly started: boolean;
  readonly expiresAt: number | null;
  readonly timer: TimerHandle | null;
}

function sameIntent(a: PendingAction, b: PendingAction): boolean {
  return (
    a.id === b.id &&
    (a.kind ?? null) === (b.kind ?? null) &&
    a.message === b.message &&
    a.detail === b.detail
  );
}

/* Windows live above every route, so leaving a surface neither cancels its
 * timer nor loses its toast. One window owns one timer and one commit. */
class DeferredActionStore {
  private _entries: readonly WindowEntry[] = [];
  private _snapshot: readonly DeferredWindow[] = [];
  private _listeners = new Set<() => void>();
  private _nextKey = 0;

  subscribe = (listener: () => void): (() => void) => {
    this._listeners.add(listener);

    return () => {
      this._listeners.delete(listener);
    };
  };

  getSnapshot = (): readonly DeferredWindow[] => this._snapshot;

  defer(
    action: PendingAction,
    durationMs: number,
    options: DeferOptions = {}
  ): number {
    const existing = this._entries.find(entry =>
      sameIntent(entry.action, action)
    );
    const started = options.started ?? existing?.started ?? true;
    const graceMs = options.graceMs ?? existing?.graceMs ?? 0;

    if (existing !== undefined) {
      const refreshed = this._arm(
        existing,
        action,
        durationMs,
        graceMs,
        started
      );

      this._entries = this._entries.map(entry =>
        entry.key === existing.key ? refreshed : entry
      );
      this._publish();

      return existing.key;
    }

    const key = ++this._nextKey;
    const entry = this._arm(
      {
        key,
        action,
        durationMs,
        graceMs,
        started: false,
        expiresAt: null,
        timer: null
      },
      action,
      durationMs,
      graceMs,
      started
    );

    this._entries = [...this._entries, entry];
    this._publish();

    return key;
  }

  startAll(): void {
    if (!this._entries.some(entry => !entry.started)) {
      return;
    }

    this._entries = this._entries.map(entry =>
      entry.started
        ? entry
        : this._arm(entry, entry.action, entry.durationMs, entry.graceMs, true)
    );
    this._publish();
  }

  cancel(key: number): void {
    const entry = this._entries.find(candidate => candidate.key === key);

    if (entry === undefined) {
      return;
    }

    this._clear(entry);
    this._entries = this._entries.filter(candidate => candidate.key !== key);
    this._publish();
  }

  commit(key: number): void {
    const entry = this._entries.find(candidate => candidate.key === key);

    if (entry === undefined) {
      return;
    }

    this._clear(entry);
    this._entries = this._entries.filter(candidate => candidate.key !== key);
    this._publish();
    entry.action.commit();
  }

  reset(): void {
    for (const entry of this._entries) {
      this._clear(entry);
    }

    this._entries = [];
    this._publish();
  }

  private _arm(
    entry: WindowEntry,
    action: PendingAction,
    durationMs: number,
    graceMs: number,
    started: boolean
  ): WindowEntry {
    this._clear(entry);

    if (!started) {
      return {
        ...entry,
        action,
        durationMs,
        graceMs,
        started: false,
        expiresAt: null,
        timer: null
      };
    }

    const expiresAt = Date.now() + durationMs;
    const timer = setTimeout(
      () => this.commit(entry.key),
      durationMs + graceMs
    );

    return {
      ...entry,
      action,
      durationMs,
      graceMs,
      started: true,
      expiresAt,
      timer
    };
  }

  private _clear(entry: WindowEntry): void {
    clearTimeout(entry.timer ?? undefined);
  }

  private _replace(key: number, next: WindowEntry): void {
    this._entries = this._entries.map(entry =>
      entry.key === key ? next : entry
    );
  }

  private _publish(): void {
    this._snapshot = this._entries.map(
      ({ key, action, expiresAt, started }) => ({
        key,
        id: action.id,
        kind: action.kind ?? null,
        message: action.message,
        detail: action.detail,
        expiresAt,
        started
      })
    );

    for (const listener of this._listeners) {
      listener();
    }
  }
}

export const deferredActions = new DeferredActionStore();

/* Tests share the module-level store, so each resets the windows it opened. */
export function resetDeferredActions(): void {
  deferredActions.reset();
}
