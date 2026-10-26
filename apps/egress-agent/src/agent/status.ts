import type { EgressAgentConfig } from '@playliberty/youtube';

/* A name the operator set that is not in the pool is a typo, not a state: it
 * refuses rather than reporting an active config nothing can match. */
export function chooseActive(
  pool: readonly EgressAgentConfig[],
  override: string | undefined,
  source = 'PROTON_ACTIVE_CONFIG'
): string | null {
  if (override !== undefined && override.length > 0) {
    if (!pool.some(config => config.name === override)) {
      throw new Error(
        `${source} names "${override}", which is not in the pool.`
      );
    }

    return override;
  }

  return pool[0]?.name ?? null;
}

/* The remembered name is the reboot guarantee; the explicit name is the first
 * boot, and the first file is the last resort. */
export function resolveActive(
  pool: readonly EgressAgentConfig[],
  remembered: string | null,
  override: string | undefined
): string | null {
  if (remembered !== null) {
    return chooseActive(pool, remembered, 'The active state file');
  }

  return chooseActive(pool, override);
}
