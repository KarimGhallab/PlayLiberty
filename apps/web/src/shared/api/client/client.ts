import type { Problem } from '@playliberty/contracts';
import { ProblemSchema } from '@playliberty/contracts';

/*
 * The one place the API is spoken to. Every request is same-origin (`/api/v1`),
 * so nginx or the Vite dev proxy forwards it and no CORS is in play. A mutation
 * carries the client header the architecture requires; a `GET` never does,
 * because a `GET` never mutates.
 *
 * The edge can answer `401` or redirect to its SSO login. Both mean the browser
 * is not authenticated, and the fix is a top-level navigation so the edge can
 * re-run the flow, which a fetch cannot do itself. That navigation is attempted
 * once per tab: a second navigation is a reload loop with no exit, so if the app
 * comes back still unauthenticated the request fails with the problem. Any
 * response that is not that failure clears the flag, so a session that expires
 * later can re-authenticate.
 */

export const API_PREFIX = '/api/v1';
export const CLIENT_HEADER = 'X-PlayLiberty-Client';
export const CLIENT_HEADER_VALUE = 'web';

const RE_AUTH_ATTEMPT_KEY = 'playliberty.re-auth-attempt';

export class ApiError extends Error {
  readonly status: number;
  readonly problem: Problem | null;

  constructor(status: number, problem: Problem | null) {
    super(problem?.title ?? `Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
  }
}

function readReAuthAttempt(): boolean {
  try {
    return window.sessionStorage.getItem(RE_AUTH_ATTEMPT_KEY) === '1';
  } catch {
    return false;
  }
}

function writeReAuthAttempt(attempted: boolean): void {
  try {
    if (attempted) {
      window.sessionStorage.setItem(RE_AUTH_ATTEMPT_KEY, '1');
      return;
    }

    window.sessionStorage.removeItem(RE_AUTH_ATTEMPT_KEY);
  } catch {
    // A storage that refuses the write must not become a reload loop.
  }
}

function needsAuthentication(response: Response): boolean {
  return response.status === 401 || response.type === 'opaqueredirect';
}

function redirectToEdge(): never {
  window.location.assign(window.location.href);
  throw new ApiError(401, null);
}

async function readError(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null);
  const problem = ProblemSchema.safeParse(body);

  return new ApiError(response.status, problem.success ? problem.data : null);
}

async function send(path: string, init: RequestInit): Promise<Response> {
  const method = init.method ?? 'GET';
  const headers = new Headers(init.headers);

  if (method !== 'GET' && method !== 'HEAD') {
    headers.set(CLIENT_HEADER, CLIENT_HEADER_VALUE);
  }

  const response = await fetch(`${API_PREFIX}${path}`, {
    credentials: 'same-origin',
    redirect: 'manual',
    ...init,
    headers
  });

  if (needsAuthentication(response)) {
    if (readReAuthAttempt()) {
      throw await readError(response);
    }

    writeReAuthAttempt(true);
    return redirectToEdge();
  }

  writeReAuthAttempt(false);
  return response;
}

/** The part of a Zod schema the client needs, without depending on Zod. */
export interface ResponseSchema<T> {
  parse: (input: unknown) => T;
}

export async function apiGet<T>(
  path: string,
  schema: ResponseSchema<T>
): Promise<T> {
  const response = await send(path, { method: 'GET' });

  if (!response.ok) {
    throw await readError(response);
  }

  return schema.parse(await response.json());
}

/*
 * The status of a stream request that has already failed in the audio element.
 *
 * An `<audio>` element reports a load failure as a `MediaError` and never the
 * HTTP status: a `401`, a `404` and a `409` are one code to it. The player has
 * to tell an expired session apart from a track that is gone, so on the
 * element's failure it asks the route again for the status alone.
 *
 * It is deliberately the same `send` path every other request uses, so a refusal
 * because the session expired reaches the re-authentication guard and a second
 * refusal in the same tab surfaces as the problem rather than a reload loop. It
 * is a `HEAD`, so the probe transfers no media, and it runs only after a load has
 * already failed, so playback that succeeds makes no request of its own.
 */
export async function probeStreamStatus(path: string): Promise<number> {
  const response = await send(path, { method: 'HEAD' });

  return response.status;
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  schema: ResponseSchema<T>
): Promise<T> {
  const response = await send(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw await readError(response);
  }

  return schema.parse(await response.json());
}

/*
 * A `POST` with no body, for a verb the server reads as a command rather than as
 * a document: starting a sync carries the playlist id in the path and nothing in
 * the body, so sending `{}` would be a body the route does not read.
 */
export async function apiCommand<T>(
  path: string,
  schema: ResponseSchema<T>
): Promise<T> {
  const response = await send(path, { method: 'POST' });

  if (!response.ok) {
    throw await readError(response);
  }

  return schema.parse(await response.json());
}

export async function apiPatch<T>(
  path: string,
  body: unknown,
  schema: ResponseSchema<T>
): Promise<T> {
  const response = await send(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw await readError(response);
  }

  return schema.parse(await response.json());
}

/*
 * A `DELETE` whose success carries no body: `204` is the route's answer for a
 * deleted playlist, so there is nothing to parse and a schema would be a lie.
 */
export async function apiDelete(path: string): Promise<void> {
  const response = await send(path, { method: 'DELETE' });

  if (!response.ok) {
    throw await readError(response);
  }
}
