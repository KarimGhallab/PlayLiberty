import { asc, notInArray } from 'drizzle-orm';

import type { EgressRead } from '@playliberty/contracts';
import type { IEgressAgentClient } from '@playliberty/youtube';

import type { DatabaseHandle } from '../../../platform/database/client.js';
import { egressConfigs } from '../../../platform/database/schema.js';

/*
 * The pool is the agent's fact and the history is the server's. Reconciling is
 * the only writer that turns one into the other, and an unreachable agent is an
 * answer, not an error: the page must still draw the last known pool.
 */

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

  const now = new Date().toISOString();
  const names = status.pool.map(config => config.name);

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
  });

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
      lastProbeAt: row.lastProbeAt,
      lastError: row.lastError
    }));
}
