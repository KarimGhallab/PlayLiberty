import type { FastifyReply } from 'fastify';
import type { z } from 'zod';

import type { Problem } from '@playliberty/contracts';

export interface ProblemInput {
  status: number;
  code: string;
  title: string;
  detail?: string;
  type?: string;
}

export function createProblem(input: ProblemInput): Problem {
  return {
    type: input.type ?? `https://playliberty.dev/problems/${input.code}`,
    title: input.title,
    status: input.status,
    code: input.code,
    detail: input.detail
  };
}

export function sendProblem(
  reply: FastifyReply,
  input: ProblemInput
): FastifyReply {
  return reply
    .code(input.status)
    .type('application/problem+json')
    .send(createProblem(input));
}

export function sendNotImplemented(
  reply: FastifyReply,
  detail?: string
): FastifyReply {
  return sendProblem(reply, {
    status: 501,
    code: 'not_implemented',
    title: 'Not Implemented',
    detail
  });
}

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

/*
 * The other way a request produces a problem document, and the reason the two sit
 * in one module: both write the same shape to the same content type, and a
 * route that produced a malformed-input problem by hand would be the one route
 * whose 400 looked different.
 */
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
