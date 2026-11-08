import type { QueryParams } from '@playliberty/api-client';
import { apiUrl } from '@playliberty/api-client';
import type {
  ApiCommandEndpoint,
  ApiEndpoint,
  ApiMediaEndpoint,
  EndpointParams
} from '@playliberty/contracts';
import { endpointPath } from '@playliberty/contracts';

import { transport } from '../transport';

/*
 * The query module's side of an endpoint declaration: the path is substituted,
 * the response is parsed by the schema the declaration owns, and the protocol
 * stays in the transport.
 */

export function readEndpoint<T>(
  endpoint: ApiEndpoint<T>,
  params: EndpointParams = {},
  query?: QueryParams
): Promise<T> {
  return transport.send(endpoint, params, {}, query);
}

export function postEndpoint<T>(
  endpoint: ApiEndpoint<T>,
  body: unknown,
  params: EndpointParams = {}
): Promise<T> {
  return transport.send(endpoint, params, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

/** A `POST` whose command is read off the path, with no request body. */
export function commandEndpoint<T>(
  endpoint: ApiEndpoint<T>,
  params: EndpointParams = {}
): Promise<T> {
  return transport.send(endpoint, params);
}

export function patchEndpoint<T>(
  endpoint: ApiEndpoint<T>,
  body: unknown,
  params: EndpointParams = {}
): Promise<T> {
  return transport.send(endpoint, params, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export async function uploadEndpoint<T>(
  endpoint: ApiEndpoint<T>,
  body: Blob,
  contentType: string,
  params: EndpointParams = {},
  query?: QueryParams
): Promise<T> {
  const bytes = await body.arrayBuffer();

  return transport.send(
    endpoint,
    params,
    {
      headers: { 'Content-Type': contentType },
      body: bytes
    },
    query
  );
}

export function deleteEndpoint(
  endpoint: ApiCommandEndpoint,
  params: EndpointParams = {}
): Promise<void> {
  return transport.command(endpoint, params);
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
  return apiUrl('', mediaPath(endpoint, params));
}
