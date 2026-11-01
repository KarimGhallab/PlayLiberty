import {
  type ApiCommandEndpoint,
  type ApiEndpoint,
  type EndpointParams,
  HttpMethod,
  type Problem,
  ProblemSchema,
  endpointPath
} from '@playliberty/contracts';

import { USER_AGENT, USER_AGENT_HEADER } from '../userAgent';

/*
 * The one place the app speaks to the server. Every request carries the token
 * pair the edge issued and the app's own User-Agent; a mutation also carries
 * the client header. A `401` buys one renewal and one retry, and only a session
 * that has ended needs provisioning.
 */

export const API_PREFIX = '/api/v1';
export const CLIENT_HEADER = 'X-PlayLiberty-Client';
export const CLIENT_HEADER_VALUE = 'mobile';
export const ACCESS_TOKEN_ID_HEADER = 'P-Access-Token-Id';
export const ACCESS_TOKEN_HEADER = 'P-Access-Token';

export interface AccessToken {
  readonly id: string;
  readonly secret: string;
}

export type QueryParams = Readonly<Record<string, string | number>>;

export interface ApiClientOptions {
  readonly baseUrl: string;
  readonly readToken: () => Promise<AccessToken | null>;
  readonly renewToken: (refused: AccessToken) => Promise<AccessToken | null>;
}

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

export class NeedsProvisioningError extends ApiError {
  constructor() {
    super(401, null);
    this.name = 'NeedsProvisioningError';
  }
}

async function readProblem(response: Response): Promise<Problem | null> {
  const body: unknown = await response.json().catch(() => null);
  const problem = ProblemSchema.safeParse(body);

  return problem.success ? problem.data : null;
}

/* A read's query is built here, so no caller writes a path with a `?` in it. */
function queryString(query: QueryParams): string {
  const entries = Object.entries(query);

  if (entries.length === 0) {
    return '';
  }

  return `?${entries
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
    )
    .join('&')}`;
}

export class ApiClient {
  constructor(private readonly _options: ApiClientOptions) {}

  async send<T>(
    endpoint: ApiEndpoint<T>,
    params: EndpointParams = {},
    init: RequestInit = {},
    query: QueryParams = {}
  ): Promise<T> {
    const response = await this._send(
      endpoint.method,
      endpoint.path,
      params,
      init,
      query
    );
    const body: unknown = await response.json();

    return endpoint.response.parse(body);
  }

  async command(
    endpoint: ApiCommandEndpoint,
    params: EndpointParams = {},
    init: RequestInit = {}
  ): Promise<void> {
    await this._send(endpoint.method, endpoint.path, params, init);
  }

  async _send(
    method: HttpMethod,
    path: string,
    params: EndpointParams,
    init: RequestInit,
    query: QueryParams = {}
  ): Promise<Response> {
    const token = await this._options.readToken();

    if (token === null) {
      throw new NeedsProvisioningError();
    }

    const response = await this._attempt(
      token,
      method,
      path,
      params,
      init,
      query
    );

    if (response.status !== 401) {
      return settle(response);
    }

    const renewed = await this._options.renewToken(token);

    if (renewed === null) {
      throw new NeedsProvisioningError();
    }

    const retried = await this._attempt(
      renewed,
      method,
      path,
      params,
      init,
      query
    );

    /* A fresh pair refused as well is the request's failure, not a sign-out:
     * only an ended session needs provisioning. */
    if (retried.status === 401) {
      throw new ApiError(401, await readProblem(retried));
    }

    return settle(retried);
  }

  async _attempt(
    token: AccessToken,
    method: HttpMethod,
    path: string,
    params: EndpointParams,
    init: RequestInit,
    query: QueryParams
  ): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set(ACCESS_TOKEN_ID_HEADER, token.id);
    headers.set(ACCESS_TOKEN_HEADER, token.secret);
    headers.set(USER_AGENT_HEADER, USER_AGENT);

    if (method !== HttpMethod.Get) {
      headers.set(CLIENT_HEADER, CLIENT_HEADER_VALUE);
    }

    return fetch(
      `${this._baseUrl()}${API_PREFIX}${endpointPath(path, params)}${queryString(query)}`,
      { ...init, method, headers }
    );
  }

  _baseUrl(): string {
    return this._options.baseUrl.replace(/\/+$/, '');
  }
}

async function settle(response: Response): Promise<Response> {
  if (!response.ok) {
    throw new ApiError(response.status, await readProblem(response));
  }

  return response;
}
