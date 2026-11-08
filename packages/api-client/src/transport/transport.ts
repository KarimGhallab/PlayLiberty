import type {
  ApiCommandEndpoint,
  ApiEndpoint,
  EndpointParams
} from '@playliberty/contracts';
import { HttpMethod, endpointPath } from '@playliberty/contracts';

import { ApiError } from '../apiError.js';
import { apiUrl } from '../apiAddress/apiAddress.js';
import { readProblem } from '../problem/problem.js';
import { CLIENT_HEADER } from '../protocol.js';

export type QueryParams = Readonly<Record<string, string | number>>;

/** One request the app's adapter sends, with the prefix, path and query built. */
export interface TransportRequest {
  readonly url: string;
  readonly init: RequestInit;
}

/** The app's one auth seam: it adds credentials and sends the request. */
export interface TransportAdapter {
  send(request: TransportRequest): Promise<Response>;
}

export interface TransportOptions {
  readonly baseUrl?: string;
  readonly client: string;
  readonly adapter: TransportAdapter;
}

export interface Transport {
  send<T>(
    endpoint: ApiEndpoint<T>,
    params?: EndpointParams,
    init?: RequestInit,
    query?: QueryParams
  ): Promise<T>;
  command(
    endpoint: ApiCommandEndpoint,
    params?: EndpointParams,
    init?: RequestInit
  ): Promise<void>;
  probe(path: string, params?: EndpointParams): Promise<number>;
  url(path: string, params?: EndpointParams, query?: QueryParams): string;
}

type Method = HttpMethod | 'HEAD';

function queryString(query: QueryParams | undefined): string {
  const entries = Object.entries(query ?? {});

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

export function createTransport(options: TransportOptions): Transport {
  const baseUrl = options.baseUrl ?? '';

  function url(
    path: string,
    params: EndpointParams = {},
    query?: QueryParams
  ): string {
    return `${apiUrl(baseUrl, endpointPath(path, params))}${queryString(query)}`;
  }

  async function request(
    method: Method,
    path: string,
    params: EndpointParams,
    init: RequestInit,
    query?: QueryParams
  ): Promise<Response> {
    const headers = new Headers(init.headers);

    if (method !== HttpMethod.Get && method !== 'HEAD') {
      headers.set(CLIENT_HEADER, options.client);
    }

    return options.adapter.send({
      url: url(path, params, query),
      init: { ...init, method, headers }
    });
  }

  async function expectOk(
    method: Method,
    path: string,
    params: EndpointParams,
    init: RequestInit,
    query?: QueryParams
  ): Promise<Response> {
    const response = await request(method, path, params, init, query);

    if (!response.ok) {
      throw new ApiError(response.status, await readProblem(response));
    }

    return response;
  }

  return {
    async send(endpoint, params = {}, init = {}, query) {
      const response = await expectOk(
        endpoint.method,
        endpoint.path,
        params,
        init,
        query
      );
      const body: unknown = await response.json();

      return endpoint.response.parse(body);
    },

    async command(endpoint, params = {}, init = {}) {
      await expectOk(endpoint.method, endpoint.path, params, init);
    },

    async probe(path, params = {}) {
      const response = await request('HEAD', path, params, {});

      return response.status;
    },

    url
  };
}
