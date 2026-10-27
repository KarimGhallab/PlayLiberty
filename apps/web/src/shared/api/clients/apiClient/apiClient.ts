import type { Problem } from '@playliberty/contracts';
import { ProblemSchema } from '@playliberty/contracts';

/*
 * The one place the API is spoken to, same-origin (`/api/v1`) so no CORS is in
 * play; a mutation carries the client header, a `GET` never does. A `401` or
 * SSO redirect triggers one navigation per tab, then fails rather than looping.
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

/* Re-ask the route for the status the element cannot report: a 401, 404 and 409
 * are one code to it. A `HEAD` through `send`, so the re-auth guard applies. */
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
 * A `POST` with no body, for a command the server reads off the path: sending
 * `{}` would be a body the route does not read.
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

/* A raw body, for an image whose bytes and type the server owns. */
export async function apiUpload<T>(
  path: string,
  body: Blob,
  contentType: string,
  schema: ResponseSchema<T>
): Promise<T> {
  const bytes = await body.arrayBuffer();
  const response = await send(path, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: bytes
  });

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
 * A `DELETE` whose success carries no body (`204`), so there is nothing to
 * parse and a schema would be a lie.
 */
export async function apiDelete(path: string): Promise<void> {
  const response = await send(path, { method: 'DELETE' });

  if (!response.ok) {
    throw await readError(response);
  }
}
