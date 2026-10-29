import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import type {
  IProvisioningCodes,
  MintCodeInput,
  ProvisioningCode
} from '../../../shared/provisioning.js';

/* The short-lived code a browser SSO hands the app, and the PKCE check the
 * exchange makes. State is one process and one minute, so the store is a map:
 * a table would be durability for a value that must not outlive a restart. */

export const CODE_TTL_MS = 60_000;
export const RATE_LIMIT_ATTEMPTS = 10;
export const RATE_LIMIT_WINDOW_MS = 60_000;

export class ProvisioningService implements IProvisioningCodes {
  private readonly _codes = new Map<string, ProvisioningCode>();
  private readonly _attempts = new Map<string, number[]>();

  constructor(
    private readonly _now: () => number = Date.now,
    private readonly _codeTtlMs: number = CODE_TTL_MS
  ) {}

  mintCode(input: MintCodeInput): string {
    this._prune();
    const code = randomBytes(32).toString('base64url');
    this._codes.set(code, {
      ...input,
      expiresAt: this._now() + this._codeTtlMs
    });

    return code;
  }

  /** Removes the code whatever the outcome: one attempt, one code. */
  consumeCode(code: string): ProvisioningCode | null {
    const entry = this._codes.get(code) ?? null;
    this._codes.delete(code);

    return entry;
  }

  isExpired(entry: ProvisioningCode): boolean {
    return entry.expiresAt <= this._now();
  }

  allowExchange(key: string): boolean {
    const now = this._now();
    const recent = (this._attempts.get(key) ?? []).filter(
      attempt => now - attempt < RATE_LIMIT_WINDOW_MS
    );

    if (recent.length >= RATE_LIMIT_ATTEMPTS) {
      this._attempts.set(key, recent);
      return false;
    }

    recent.push(now);
    this._attempts.set(key, recent);

    return true;
  }

  verifyPkce(verifier: string, challenge: string): boolean {
    return constantTimeEqual(challengeFor(verifier), challenge);
  }

  _prune(): void {
    const now = this._now();

    for (const [code, entry] of this._codes) {
      if (entry.expiresAt <= now) {
        this._codes.delete(code);
      }
    }
  }
}

/** S256: the base64url SHA-256 of the verifier, which is what the app sent. */
export function challengeFor(verifier: string): string {
  return createHash('sha256').update(verifier, 'ascii').digest('base64url');
}

export function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);

  return (
    leftBytes.length === rightBytes.length &&
    timingSafeEqual(leftBytes, rightBytes)
  );
}
