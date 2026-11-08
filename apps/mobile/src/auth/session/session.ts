import {
  API_PREFIX,
  CLIENT_HEADER,
  USER_AGENT_HEADER,
  readProblem
} from '@playliberty/api-client';
import {
  type MobileToken,
  MobileTokenSchema,
  ProblemCode,
  endpoints
} from '@playliberty/contracts';

import { apiBaseUrl } from '../../api/apiBaseUrl';
import type { AccessToken } from '../../api/credentialed/credentialed';
import { credentialHeaders } from '../../api/credentialed/credentialed';
import { USER_AGENT } from '../../api/userAgent';
import {
  type SessionRecord,
  accessTokenOf,
  recordFromToken,
  sessionRecordStore
} from '../sessionRecord/sessionRecord';

/* Renewal belongs here. A send inside the margin refreshes first, one flight is
 * shared by every caller, and the rotated record is written before the flight
 * resolves. Only an exact invalid grant ends the session; everything else keeps
 * the record and surfaces a retry. */

export const ACCESS_MARGIN_MS = 60_000;

export interface SessionStore {
  read(): Promise<SessionRecord | null>;
  write(record: SessionRecord): Promise<void>;
  clear(): Promise<void>;
}

export interface SessionDeps {
  readonly baseUrl: string;
  readonly fetch: typeof fetch;
  readonly store: SessionStore;
  readonly now: () => number;
}

/** A renewal that failed without a verdict: the record still stands. */
export class SessionRefreshError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SessionRefreshError';
  }
}

type Listener = (record: SessionRecord | null) => void;

export class Session {
  private _record: SessionRecord | null = null;
  private _loaded = false;
  private _inFlight: Promise<SessionRecord | null> | null = null;
  /* Bumped by every write and clear, so a read or refresh that started before
   * a sign-out cannot put the record back. */
  private _version = 0;
  private readonly _listeners = new Set<Listener>();

  constructor(private readonly _deps: SessionDeps) {}

  async load(): Promise<SessionRecord | null> {
    if (this._loaded) {
      return this._record;
    }

    const version = this._version;
    const record = await this._deps.store.read();

    if (version !== this._version) {
      return this._record;
    }

    this._record = record;
    this._loaded = true;

    return record;
  }

  /** The pair a send may use, renewed first when the margin is reached. */
  async accessToken(): Promise<AccessToken | null> {
    const record = await this.load();

    if (record === null) {
      return null;
    }

    if (record.accessDeadline - this._deps.now() > ACCESS_MARGIN_MS) {
      return accessTokenOf(record);
    }

    const renewed = await this.refreshNow();

    return renewed === null ? null : accessTokenOf(renewed);
  }

  /** The pair the app still holds, without a renewal. */
  async usableAccessToken(): Promise<AccessToken | null> {
    const record = await this.load();

    if (record === null || record.accessDeadline <= this._deps.now()) {
      return null;
    }

    return accessTokenOf(record);
  }

  /** The answer to a pair the edge refused: a pair another caller already
   * rotated is reused, otherwise one renewal runs. */
  async renewAccessToken(refused: AccessToken): Promise<AccessToken | null> {
    const record = await this.load();

    if (
      record !== null &&
      (record.accessId !== refused.id || record.accessSecret !== refused.secret)
    ) {
      return accessTokenOf(record);
    }

    const renewed = await this.refreshNow();

    return renewed === null ? null : accessTokenOf(renewed);
  }

  /** One flight at a time, shared by every caller. */
  refreshNow(): Promise<SessionRecord | null> {
    if (this._inFlight !== null) {
      return this._inFlight;
    }

    const attempt = this._refresh().finally(() => {
      this._inFlight = null;
    });
    this._inFlight = attempt;

    return attempt;
  }

  /** A provisioning's pair becomes the record, in one write. */
  async adopt(token: MobileToken): Promise<SessionRecord> {
    const record = recordFromToken(token, this._deps.now());

    await this._deps.store.write(record);

    this._version += 1;
    this._record = record;
    this._loaded = true;
    this._notify(record);

    return record;
  }

  /** Ends the family at the edge when it can, then clears locally. A refused
   * or unreachable server never keeps the record on the phone. */
  async signOut(): Promise<void> {
    try {
      const access = await this.accessToken();

      if (access !== null) {
        const current = await this.load();

        if (current !== null) {
          await this._deps.fetch(
            `${this._deps.baseUrl.replace(/\/+$/, '')}${API_PREFIX}${endpoints.revokeSession.path}`,
            {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                [USER_AGENT_HEADER]: USER_AGENT,
                [CLIENT_HEADER]: 'mobile',
                ...credentialHeaders(access)
              },
              body: JSON.stringify({ refresh_token: current.refreshToken })
            }
          );
        }
      }
    } catch {
      /* Best effort: a failure to reach the server must not keep the session. */
    }

    await this.clear();
  }

  async clear(): Promise<void> {
    await this._deps.store.clear();

    this._version += 1;
    this._record = null;
    this._loaded = true;
    this._notify(null);
  }

  subscribe(listener: Listener): () => void {
    this._listeners.add(listener);

    return () => {
      this._listeners.delete(listener);
    };
  }

  private async _refresh(): Promise<SessionRecord | null> {
    const record = await this.load();

    if (record === null) {
      return null;
    }

    const version = this._version;
    let response: Response;

    try {
      response = await this._deps.fetch(
        `${this._deps.baseUrl.replace(/\/+$/, '')}/auth/refresh`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            [USER_AGENT_HEADER]: USER_AGENT,
            [CLIENT_HEADER]: 'mobile'
          },
          body: JSON.stringify({ refresh_token: record.refreshToken })
        }
      );
    } catch (error) {
      throw new SessionRefreshError('The session could not be renewed.', {
        cause: error
      });
    }

    if (response.status === 400) {
      const problem = await readProblem(response);

      if (problem?.code === ProblemCode.InvalidGrant) {
        await this.clear();
        return null;
      }

      throw new SessionRefreshError('The session could not be renewed.');
    }

    if (!response.ok) {
      throw new SessionRefreshError(
        `The session could not be renewed (${response.status}).`
      );
    }

    const body: unknown = await response.json().catch(() => null);
    const pair = MobileTokenSchema.safeParse(body);

    if (!pair.success) {
      throw new SessionRefreshError(
        'The session answered an unexpected payload.'
      );
    }

    if (version !== this._version) {
      return null;
    }

    return this.adopt(pair.data);
  }

  private _notify(record: SessionRecord | null): void {
    for (const listener of this._listeners) {
      listener(record);
    }
  }
}

/** The app's one session, over the stored record and the configured origin. */
export const mobileSession = new Session({
  baseUrl: apiBaseUrl(),
  fetch: (input, init) => fetch(input, init),
  store: sessionRecordStore,
  now: Date.now
});
