import {
  type ApiCommandEndpoint,
  type ApiEndpoint,
  type EndpointParams,
  HttpMethod,
  type Problem,
  ProblemSchema,
  endpointPath
} from '@playliberty/contracts';

/*
 * The one place the app speaks to the server. Every request carries the token
 * pair the edge issued; a mutation also carries the client header. A `401` means
 * provisioning, never a broken screen.
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

    const headers = new Headers(init.headers);
    headers.set(ACCESS_TOKEN_ID_HEADER, token.id);
    headers.set(ACCESS_TOKEN_HEADER, token.secret);

    if (method !== HttpMethod.Get) {
      headers.set(CLIENT_HEADER, CLIENT_HEADER_VALUE);
    }

    const response = await fetch(
      `${this._baseUrl()}${API_PREFIX}${endpointPath(path, params)}${queryString(query)}`,
      { ...init, method, headers }
    );

    if (response.status === 401) {
      throw new NeedsProvisioningError();
    }

    if (!response.ok) {
      throw new ApiError(response.status, await readProblem(response));
    }

    return response;
  }

  _baseUrl(): string {
    return this._options.baseUrl.replace(/\/+$/, '');
  }
}
