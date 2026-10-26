import { asc, eq, sql } from 'drizzle-orm';

import { EgressStatus } from '@playliberty/contracts';
import type {
  DownloadTrackRequest,
  DownloadTrackResult,
  IEgressAgentClient,
  IYoutubeClient,
  YoutubeSource
} from '@playliberty/youtube';
import {
  EgressCircuitOpenError,
  EgressSourceUnavailableError,
  isExitLevelFailure
} from '@playliberty/youtube';

import type { DatabaseHandle } from '../../../platform/database/client.js';
import type { EgressConfigRow } from '../../../platform/database/schema.js';
import { egressConfigs } from '../../../platform/database/schema.js';
import { applyEgressStatus, reconcileEgress } from './egressService.js';

export interface EgressPolicyOptions {
  database: DatabaseHandle;
  agent: IEgressAgentClient;
  failureLimit: number;
  switchCooldownMs: number;
  drainTimeoutMs: number;
}

/* The policy sits around the source calls, not inside the agent: the agent
 * executes a switch, the server decides when one is earned. */
export class EgressPolicyClient implements IYoutubeClient {
  /* A burst of parallel failures reaches the limit together; the chain makes
   * the counter and the switch one decision instead of two. */
  private _chain: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly _inner: IYoutubeClient,
    private readonly _options: EgressPolicyOptions
  ) {}

  public listSource(url: string): Promise<YoutubeSource> {
    /* A listing is the recovery path: it is allowed to try while the circuit
     * is open, so an exit that came back is noticed by the next sync. */
    return this._run(() => this._inner.listSource(url), true);
  }

  public downloadTrack(
    request: DownloadTrackRequest
  ): Promise<DownloadTrackResult> {
    /* A download waits for the sync to find a working exit; asking a failed
     * pool again would only add traffic and another failure. */
    return this._run(() => this._inner.downloadTrack(request), false);
  }

  public fetchThumbnail(url: string, outputPath: string): Promise<void> {
    /* Thumbnails leave from the server's own address and never count. */
    return this._inner.fetchThumbnail(url, outputPath);
  }

  private async _run<T>(
    operation: () => Promise<T>,
    recoverWhenOpen: boolean
  ): Promise<T> {
    if (!recoverWhenOpen && circuitOpen(this._options.database)) {
      throw new EgressCircuitOpenError();
    }

    try {
      const result = await operation();
      recordSuccess(this._options.database, new Date().toISOString());
      return result;
    } catch (error) {
      if (!isExitFailure(error)) {
        throw error;
      }

      return this._serial(() => this._recover(operation, error));
    }
  }

  private _serial<T>(task: () => Promise<T>): Promise<T> {
    const run = this._chain.then(task, task);
    this._chain = run.then(
      () => undefined,
      () => undefined
    );

    return run;
  }

  private async _recover<T>(
    operation: () => Promise<T>,
    error: EgressSourceUnavailableError
  ): Promise<T> {
    const database = this._options.database;

    /* The agent is authoritative for the pool and the loaded config: a restart
     * or a manual switch must not let the stored active row disagree with the
     * interface the next failure is counted against. */
    await reconcileEgress(database, this._options.agent);

    const failures = recordFailure(
      database,
      error.reason,
      new Date().toISOString()
    );

    if (failures === null) {
      throw error;
    }

    if (circuitOpen(database)) {
      throw new EgressCircuitOpenError();
    }

    if (failures < this._options.failureLimit) {
      throw error;
    }

    const active = activeConfig(database);
    const now = new Date();

    if (
      active === undefined ||
      cooldownActive(active, now, this._options.switchCooldownMs)
    ) {
      throw error;
    }

    const next = nextConfig(database, active.name);

    if (next === null) {
      throw new EgressCircuitOpenError();
    }

    /* One operation switches at most once: the retry below runs on the new
     * config and never asks for another switch, whatever it answers. */
    const status = await this._options.agent.switch(
      next.name,
      this._options.drainTimeoutMs
    );

    applyEgressStatus(database, status);
    markActive(database, next.name, new Date().toISOString());

    try {
      const result = await operation();
      recordSuccess(database, new Date().toISOString());
      return result;
    } catch (retryError) {
      if (isExitFailure(retryError)) {
        recordFailure(database, retryError.reason, new Date().toISOString());

        if (circuitOpen(database)) {
          throw new EgressCircuitOpenError();
        }
      }

      throw retryError;
    }
  }
}

function isExitFailure(error: unknown): error is EgressSourceUnavailableError {
  return (
    error instanceof EgressSourceUnavailableError &&
    isExitLevelFailure(error.reason)
  );
}

function activeConfig(database: DatabaseHandle): EgressConfigRow | undefined {
  return database.db
    .select()
    .from(egressConfigs)
    .where(eq(egressConfigs.active, true))
    .get();
}

/* The circuit is derived, never stored: it is open when every config's last
 * measured state is failed. */
function circuitOpen(database: DatabaseHandle): boolean {
  const rows = database.db.select().from(egressConfigs).all();

  if (rows.length === 0) {
    return false;
  }

  return rows.every(row => row.status === EgressStatus.Failed);
}

function recordSuccess(database: DatabaseHandle, now: string): void {
  database.db
    .update(egressConfigs)
    .set({
      status: EgressStatus.Ok,
      consecutiveFailures: 0,
      lastAttemptAt: now,
      lastError: null
    })
    .where(eq(egressConfigs.active, true))
    .run();
}

function recordFailure(
  database: DatabaseHandle,
  reason: EgressSourceUnavailableError['reason'],
  now: string
): number | null {
  const row = database.db
    .update(egressConfigs)
    .set({
      status: EgressStatus.Failed,
      consecutiveFailures: sql`${egressConfigs.consecutiveFailures} + 1`,
      lastAttemptAt: now,
      lastError: reason
    })
    .where(eq(egressConfigs.active, true))
    .returning({ consecutiveFailures: egressConfigs.consecutiveFailures })
    .get();

  return row?.consecutiveFailures ?? null;
}

/* Round robin in file order, skipping the failed and the unusable. The active
 * row itself is never chosen. */
function nextConfig(
  database: DatabaseHandle,
  activeName: string
): EgressConfigRow | null {
  const rows = database.db
    .select()
    .from(egressConfigs)
    .orderBy(asc(egressConfigs.name))
    .all();
  const start = rows.findIndex(row => row.name === activeName);

  if (start === -1) {
    return null;
  }

  for (let offset = 1; offset <= rows.length; offset += 1) {
    const row = rows[(start + offset) % rows.length];

    if (
      row.name !== activeName &&
      row.status !== EgressStatus.Failed &&
      row.endpoint !== null
    ) {
      return row;
    }
  }

  return null;
}

function cooldownActive(
  row: EgressConfigRow,
  now: Date,
  cooldownMs: number
): boolean {
  if (row.lastSwitchAt === null || cooldownMs <= 0) {
    return false;
  }

  const elapsed = now.getTime() - Date.parse(row.lastSwitchAt);

  return Number.isFinite(elapsed) && elapsed >= 0 && elapsed < cooldownMs;
}

/* Becoming active resets the counter: the new config has no failures of its
 * own, and the cooldown starts here. */
function markActive(database: DatabaseHandle, name: string, now: string): void {
  database.unitOfWork(() => {
    database.db
      .update(egressConfigs)
      .set({ active: false })
      .where(eq(egressConfigs.active, true))
      .run();

    database.db
      .update(egressConfigs)
      .set({ active: true, consecutiveFailures: 0, lastSwitchAt: now })
      .where(eq(egressConfigs.name, name))
      .run();
  });
}
