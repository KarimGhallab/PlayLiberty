import type {
  FastifyInstance,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
  RouteGenericInterface,
  RouteHandlerMethod
} from 'fastify';

import type { EndpointDeclaration } from '@playliberty/contracts';
import { HttpMethod } from '@playliberty/contracts';

/*
 * One registration for every route: the method and the path come from the
 * endpoint declaration, so a path is written once and the transport cannot
 * drift from the contract. The handler keeps its own request and reply types.
 */

type EndpointHandler<Route extends RouteGenericInterface> = RouteHandlerMethod<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  Route
>;

export function registerEndpoint<Route extends RouteGenericInterface>(
  app: FastifyInstance,
  endpoint: EndpointDeclaration,
  handler: EndpointHandler<Route>
): void {
  switch (endpoint.method) {
    case HttpMethod.Get:
      app.get<Route>(endpoint.path, handler);
      return;
    case HttpMethod.Post:
      app.post<Route>(endpoint.path, handler);
      return;
    case HttpMethod.Patch:
      app.patch<Route>(endpoint.path, handler);
      return;
    case HttpMethod.Delete:
      app.delete<Route>(endpoint.path, handler);
      return;
  }
}
