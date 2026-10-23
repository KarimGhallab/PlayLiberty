import type {
  EgressAgentConfig,
  EgressAgentStatus
} from '@playliberty/youtube';

import { readPool } from '../pool/pool.js';

export interface StatusOptions {
  poolDirectory: string;
  /* The unit names the config it loaded; absent, the first file is assumed. */
  activeOverride?: string | undefined;
  /* The process start: this ticket opens no interface, so that is the truth. */
  loadedSince: string;
}

/* A name the operator set that is not in the pool is a typo, not a state: it
 * refuses rather than reporting an active config nothing can match. */
export function chooseActive(
  pool: readonly EgressAgentConfig[],
  override: string | undefined
): string | null {
  if (override !== undefined && override.length > 0) {
    if (!pool.some(config => config.name === override)) {
      throw new Error(
        `PROTON_ACTIVE_CONFIG names "${override}", which is not in the pool.`
      );
    }

    return override;
  }

  return pool[0]?.name ?? null;
}

export async function readStatus(
  options: StatusOptions
): Promise<EgressAgentStatus> {
  const pool = await readPool(options.poolDirectory);
  const active = chooseActive(pool, options.activeOverride);

  return {
    pool,
    active,
    loadedSince: active === null ? null : options.loadedSince
  };
}
