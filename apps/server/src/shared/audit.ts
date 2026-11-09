import type { FastifyBaseLogger } from 'fastify';

/* One line per refusal and access-control mutation: fixed message `audit`, a
 * refusal as warning, and fields collectors read as structure, not English. */
export interface AuditEntry {
  action: string;
  outcome: 'allowed' | 'refused';
  reason?: string;
  path?: string;
  actor?: string | null;
  playlist?: string;
  account?: string;
  level?: string;
  role?: string;
  family?: string;
  token?: string;
}

export function audit(logger: FastifyBaseLogger, entry: AuditEntry): void {
  const payload = { audit: true, ...entry };

  if (entry.outcome === 'refused') {
    logger.warn(payload, 'audit');
    return;
  }

  logger.info(payload, 'audit');
}
