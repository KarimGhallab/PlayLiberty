import type { EgressAgentConfig } from '@playliberty/youtube';

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
