import * as SecureStore from 'expo-secure-store';

import type { MobileToken } from '@playliberty/contracts';

const SESSION_RECORD_KEY = 'playliberty.session';

/* One record, one key: the access pair with its local deadline and the refresh
 * token. A single write cannot leave half a credential behind. */
export interface SessionRecord {
  readonly accessId: string;
  readonly accessSecret: string;
  /* Local epoch milliseconds; derived from the server's duration, so a wrong
   * device clock cannot make a fresh token look expired. */
  readonly accessDeadline: number;
  readonly refreshToken: string;
  readonly refreshExpiresAt: string;
}

export function recordFromToken(
  token: MobileToken,
  receivedAt: number
): SessionRecord {
  return {
    accessId: token.access.id,
    accessSecret: token.access.secret,
    accessDeadline: receivedAt + token.access.expires_in * 1000,
    refreshToken: token.refresh.token,
    refreshExpiresAt: token.refresh.expires_at
  };
}

export function accessTokenOf(record: SessionRecord): {
  readonly id: string;
  readonly secret: string;
} {
  return { id: record.accessId, secret: record.accessSecret };
}

export class SessionRecordStore {
  async read(): Promise<SessionRecord | null> {
    return parseRecord(await SecureStore.getItemAsync(SESSION_RECORD_KEY));
  }

  async write(record: SessionRecord): Promise<void> {
    await SecureStore.setItemAsync(SESSION_RECORD_KEY, JSON.stringify(record));
  }

  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(SESSION_RECORD_KEY);
  }
}

export const sessionRecordStore = new SessionRecordStore();

function parseRecord(value: string | null): SessionRecord | null {
  if (value === null) {
    return null;
  }

  let body: unknown;

  try {
    body = JSON.parse(value);
  } catch {
    return null;
  }

  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const record = body as Record<string, unknown>;

  if (
    !isNonEmptyString(record.accessId) ||
    !isNonEmptyString(record.accessSecret) ||
    typeof record.accessDeadline !== 'number' ||
    !Number.isFinite(record.accessDeadline) ||
    !isNonEmptyString(record.refreshToken) ||
    !isNonEmptyString(record.refreshExpiresAt)
  ) {
    return null;
  }

  return {
    accessId: record.accessId,
    accessSecret: record.accessSecret,
    accessDeadline: record.accessDeadline,
    refreshToken: record.refreshToken,
    refreshExpiresAt: record.refreshExpiresAt
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}
