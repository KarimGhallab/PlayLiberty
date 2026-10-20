import type { DeferredWindow, PendingAction } from './types';

interface WindowEntry {
  readonly key: number;
  readonly action: PendingAction;
  readonly expiresAt: number;
  readonly timer: ReturnType<typeof setTimeout>;
}

function sameIntent(a: PendingAction, b: PendingAction): boolean {
  return a.id === b.id && a.message === b.message && a.detail === b.detail;
}

/*
 * The open windows live above every route, so leaving a surface neither cancels
 * its timer nor loses its toast. One window owns one timer and one commit.
 */
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

  defer(action: PendingAction, durationMs: number): void {
    const existing = this._entries.find(entry =>
      sameIntent(entry.action, action)
    );

    if (existing !== undefined) {
      this._refresh(existing, action, durationMs);
      return;
    }

    const key = ++this._nextKey;
    const timer = setTimeout(() => this._commit(key), durationMs);

    this._entries = [
      ...this._entries,
      { key, action, expiresAt: Date.now() + durationMs, timer }
    ];
    this._publish();
  }

  cancel(key: number): void {
    const entry = this._entries.find(candidate => candidate.key === key);

    if (entry === undefined) {
      return;
    }

    clearTimeout(entry.timer);
    this._entries = this._entries.filter(candidate => candidate.key !== key);
    this._publish();
  }

  reset(): void {
    for (const entry of this._entries) {
      clearTimeout(entry.timer);
    }

    this._entries = [];
    this._publish();
  }

  private _refresh(
    existing: WindowEntry,
    action: PendingAction,
    durationMs: number
  ): void {
    clearTimeout(existing.timer);
    const timer = setTimeout(() => this._commit(existing.key), durationMs);

    this._entries = this._entries.map(entry =>
      entry.key === existing.key
        ? { ...entry, action, expiresAt: Date.now() + durationMs, timer }
        : entry
    );
    this._publish();
  }

  private _commit(key: number): void {
    const entry = this._entries.find(candidate => candidate.key === key);

    if (entry === undefined) {
      return;
    }

    this._entries = this._entries.filter(candidate => candidate.key !== key);
    this._publish();
    entry.action.commit();
  }

  private _publish(): void {
    this._snapshot = this._entries.map(({ key, action, expiresAt }) => ({
      key,
      id: action.id,
      message: action.message,
      detail: action.detail,
      expiresAt
    }));

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
