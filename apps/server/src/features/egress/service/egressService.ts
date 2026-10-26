import { asc, eq, notInArray } from 'drizzle-orm';

import type { EgressRead } from '@playliberty/contracts';
import { EgressStatus } from '@playliberty/contracts';
import type {
  EgressAgentStatus,
  EgressCheckFacts,
  IEgressAgentClient
} from '@playliberty/youtube';
import {
  EgressConfigUnknownError,
  EgressSwitchFailedError
} from '@playliberty/youtube';

import type { DatabaseHandle } from '../../../platform/database/client.js';
import { egressConfigs } from '../../../platform/database/schema.js';

/*
 * The pool is the agent's fact and the history is the server's. Reconciling is
 * the only writer that turns one into the other, and an unreachable agent is an
 * answer, not an error: the page must still draw the last known pool.
 */

/* The agent is authoritative for the pool and the loaded config; the row's
 * history is left alone. A switch and a boot reconcile share this writer. */
export function applyEgressStatus(
  database: DatabaseHandle,
  status: EgressAgentStatus
): void {
  const now = new Date().toISOString();
  const names = status.pool.map(config => config.name);
  const previous = database.db
    .select({ name: egressConfigs.name })
    .from(egressConfigs)
    .where(eq(egressConfigs.active, true))
    .get();
  /* A different loaded config is a switch, even one made outside the policy:
   * the new active starts clean and its cooldown starts now. */
  const nextActive = status.active;
  const becameActive =
    nextActive !== null &&
    previous !== undefined &&
    nextActive !== previous.name;

  database.unitOfWork(() => {
    for (const config of status.pool) {
      database.db
        .insert(egressConfigs)
        .values({
          name: config.name,
          endpoint: config.endpoint,
          active: config.name === status.active,
          updatedAt: now
        })
        .onConflictDoUpdate({
          target: egressConfigs.name,
          set: {
            endpoint: config.endpoint,
            active: config.name === status.active,
            updatedAt: now
          }
        })
        .run();
    }

    // A config removed from the pool leaves the page with the pool it has.
    if (names.length === 0) {
      database.db.delete(egressConfigs).run();
      return;
    }

    database.db
      .delete(egressConfigs)
      .where(notInArray(egressConfigs.name, names))
      .run();

    if (becameActive && nextActive !== null) {
      database.db
        .update(egressConfigs)
        .set({ consecutiveFailures: 0, lastSwitchAt: now })
        .where(eq(egressConfigs.name, nextActive))
        .run();
    }
  });
}

export async function reconcileEgress(
  database: DatabaseHandle,
  agent: IEgressAgentClient
): Promise<boolean> {
  let status;

  try {
    status = await agent.status();
  } catch {
    return false;
  }

  applyEgressStatus(database, status);

  return true;
}

export function readEgress(database: DatabaseHandle): EgressRead['configs'] {
  return database.db
    .select()
    .from(egressConfigs)
    .orderBy(asc(egressConfigs.name))
    .all()
    .map(row => ({
      name: row.name,
      endpoint: row.endpoint,
      status: row.status,
      active: row.active,
      lastAttemptAt: row.lastAttemptAt,
      lastCheckAt: row.lastCheckAt,
      lastExitIp: row.lastExitIp,
      lastError: row.lastError
    }));
}

export type SwitchOutcome =
  | { outcome: 'ok'; read: EgressRead }
  | { outcome: 'agent_unreachable' }
  | { outcome: 'config_unknown' }
  | { outcome: 'switch_failed'; message: string };

export type CheckOutcome =
  { outcome: 'ok'; read: EgressRead } | { outcome: 'agent_unreachable' };

/*
 * The switch action: apply the config if needed, then check it. The check is
 * the evidence the row stores; a refused switch writes nothing, so the active
 * row stays as it was.
 */
export async function switchEgress(
  database: DatabaseHandle,
  agent: IEgressAgentClient,
  name: string
): Promise<SwitchOutcome> {
  let facts;

  try {
    facts = await agent.switch(name);
  } catch (error) {
    if (error instanceof EgressConfigUnknownError) {
      return { outcome: 'config_unknown' };
    }

    if (error instanceof EgressSwitchFailedError) {
      return { outcome: 'switch_failed', message: error.message };
    }

    return { outcome: 'agent_unreachable' };
  }

  applyCheckFacts(database, name, facts);

  return {
    outcome: 'ok',
    read: { agentReachable: true, configs: readEgress(database) }
  };
}

/* The check action: read the active config and never switch. */
export async function checkEgress(
  database: DatabaseHandle,
  agent: IEgressAgentClient
): Promise<CheckOutcome> {
  let facts;

  try {
    facts = await agent.check();
  } catch {
    return { outcome: 'agent_unreachable' };
  }

  if (facts.active !== null) {
    applyCheckFacts(database, facts.active, facts);
  }

  return {
    outcome: 'ok',
    read: { agentReachable: true, configs: readEgress(database) }
  };
}

/*
 * A check is evidence, not a download: it writes the row it measured and the
 * active flag the agent reports after the switch, and nothing else. A check
 * that fails at the listing still keeps the exit address it managed to read.
 */
function applyCheckFacts(
  database: DatabaseHandle,
  name: string,
  facts: EgressCheckFacts
): void {
  const ok = facts.listing && facts.exitIp !== null;
  const now = new Date().toISOString();
  const previous = database.db
    .select({ name: egressConfigs.name })
    .from(egressConfigs)
    .where(eq(egressConfigs.active, true))
    .get();
  /* A switch of a standby changes the agent: the new active starts clean. */
  const becameActive =
    facts.active !== null && facts.active !== (previous?.name ?? null);

  database.unitOfWork(() => {
    database.db
      .update(egressConfigs)
      .set({
        status: ok ? EgressStatus.Ok : EgressStatus.Failed,
        lastCheckAt: now,
        lastExitIp: facts.exitIp,
        lastError: ok ? null : facts.reason,
        ...(ok || becameActive ? { consecutiveFailures: 0 } : {})
      })
      .where(eq(egressConfigs.name, name))
      .run();

    /* A switch of a standby moved the agent, so the marker follows. */
    database.db
      .update(egressConfigs)
      .set({ active: false })
      .where(eq(egressConfigs.active, true))
      .run();

    if (facts.active !== null) {
      database.db
        .update(egressConfigs)
        .set({
          active: true,
          ...(becameActive ? { lastSwitchAt: now } : {})
        })
        .where(eq(egressConfigs.name, facts.active))
        .run();
    }
  });
}
