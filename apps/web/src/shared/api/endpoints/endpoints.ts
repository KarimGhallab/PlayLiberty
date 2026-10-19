import type {
  ApiCommandEndpoint,
  ApiEndpoint,
  EndpointParams
} from '@playliberty/contracts';
import { endpointPath } from '@playliberty/contracts';

import {
  apiCommand,
  apiDelete,
  apiGet,
  apiPatch,
  apiPost
} from '../client/client';

/*
 * The query module's side of an endpoint declaration: the path is substituted,
 * the response is parsed by the schema the declaration owns, and the transport
 * stays in `client`.
 */

function pathOf(
  endpoint: { readonly path: string },
  params: EndpointParams,
  query?: URLSearchParams
): string {
  const path = endpointPath(endpoint.path, params);

  return query === undefined || query.size === 0
    ? path
    : `${path}?${query.toString()}`;
}

export function readEndpoint<T>(
  endpoint: ApiEndpoint<T>,
  params: EndpointParams = {},
  query?: URLSearchParams
): Promise<T> {
  return apiGet(pathOf(endpoint, params, query), endpoint.response);
}

export function postEndpoint<T>(
  endpoint: ApiEndpoint<T>,
  body: unknown,
  params: EndpointParams = {}
): Promise<T> {
  return apiPost(pathOf(endpoint, params), body, endpoint.response);
}

/** A `POST` whose command is read off the path, with no request body. */
export function commandEndpoint<T>(
  endpoint: ApiEndpoint<T>,
  params: EndpointParams = {}
): Promise<T> {
  return apiCommand(pathOf(endpoint, params), endpoint.response);
}

export function patchEndpoint<T>(
  endpoint: ApiEndpoint<T>,
  body: unknown,
  params: EndpointParams = {}
): Promise<T> {
  return apiPatch(pathOf(endpoint, params), body, endpoint.response);
}

export function deleteEndpoint(
  endpoint: ApiCommandEndpoint,
  params: EndpointParams = {}
): Promise<void> {
  return apiDelete(pathOf(endpoint, params));
}
