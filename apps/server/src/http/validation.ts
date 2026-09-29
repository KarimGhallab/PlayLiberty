import type { FastifyReply } from 'fastify';
import type { z } from 'zod';

import { sendProblem } from '../errors/problem.js';

export type ParseResult<T> =
  { success: true; data: T } | { success: false; message: string };

/*
 * Parses any untrusted input against a schema and reports the failure as a
 * problem document, so every route turns a bad body or a bad query string the
 * same way. The name says body because the first caller was a body; the query
 * string on a paginated list goes through here as well.
 */
export function parseBody<T>(
  schema: z.ZodType<T>,
  body: unknown
): ParseResult<T> {
  const result = schema.safeParse(body);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const message = result.error.issues
    .map(issue => `${issue.path.join('.') || 'body'}: ${issue.message}`)
    .join('; ');

  return { success: false, message };
}

export function sendInvalidRequest(
  reply: FastifyReply,
  message: string
): FastifyReply {
  return sendProblem(reply, {
    status: 400,
    code: 'invalid_request',
    title: 'Invalid Request',
    detail: message
  });
}
