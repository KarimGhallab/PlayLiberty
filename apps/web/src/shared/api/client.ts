import type { Problem } from '@playliberty/contracts';
import { ProblemSchema } from '@playliberty/contracts';

/*
 * The one place the API is spoken to. Every request is same-origin (`/api/v1`),
 * so nginx or the Vite dev proxy forwards it and no CORS is in play. A mutation
 * carries the client header ADR 0006 requires; a `GET` never does, because a
 * `GET` never mutates.
 *
 * The edge can answer `401` or redirect to its SSO login. Both mean the browser
 * is not authenticated, and the fix is a top-level navigation so the edge can
 * re-run the flow, which a fetch cannot do itself. That navigation is attempted
 * once per tab: if the app comes back and is still unauthenticated the request
 * fails with the problem instead of navigating again, because a second
 * navigation is a reload loop with no exit. Any response that is not that
 * failure clears the flag, so a session that expires later can re-authenticate.
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
