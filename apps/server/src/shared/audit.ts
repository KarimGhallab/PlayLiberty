import type { FastifyBaseLogger } from 'fastify';

/*
 * The audit line. Every refusal and every access-control mutation writes one, so
 * an operator can reconstruct who acted, on what, and how it ended from the log
 * alone. The message is the fixed word `audit` and the fields carry the meaning,
 * so a collector filters on `audit: true` and reads `action`, `outcome` and the
 * subject without parsing English. A refusal is a warning; anything else is info.
 *
 * The fields are the few a review needs to reconstruct an event: the actor, the
 * playlist or account it was about, and the value it set. A field an event does
 * not have is left out rather than written as null.
 */
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
}

export function audit(logger: FastifyBaseLogger, entry: AuditEntry): void {
  const payload = { audit: true, ...entry };

  if (entry.outcome === 'refused') {
    logger.warn(payload, 'audit');
    return;
  }

  logger.info(payload, 'audit');
}
