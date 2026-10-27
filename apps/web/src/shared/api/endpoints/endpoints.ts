import type {
  ApiCommandEndpoint,
  ApiEndpoint,
  ApiMediaEndpoint,
  EndpointParams
} from '@playliberty/contracts';
import { endpointPath } from '@playliberty/contracts';

import {
  API_PREFIX,
  apiCommand,
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiUpload
} from '../clients/apiClient/apiClient';

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

export function uploadEndpoint<T>(
  endpoint: ApiEndpoint<T>,
  body: Blob,
  contentType: string,
  params: EndpointParams = {},
  query?: URLSearchParams
): Promise<T> {
  return apiUpload(
    pathOf(endpoint, params, query),
    body,
    contentType,
    endpoint.response
  );
}

export function deleteEndpoint(
  endpoint: ApiCommandEndpoint,
  params: EndpointParams = {}
): Promise<void> {
  return apiDelete(pathOf(endpoint, params));
}

/* A media route is read whole by a browser element rather than parsed, so its
 * declaration has no response schema; it still owns the path. */
export function mediaPath(
  endpoint: ApiMediaEndpoint,
  params: EndpointParams
): string {
  return endpointPath(endpoint.path, params);
}

/** The same path with the api prefix, what a media element's `src` carries. */
export function mediaUrl(
  endpoint: ApiMediaEndpoint,
  params: EndpointParams
): string {
  return `${API_PREFIX}${mediaPath(endpoint, params)}`;
}
