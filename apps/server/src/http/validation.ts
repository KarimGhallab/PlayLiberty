import type { FastifyReply } from 'fastify';
import type { z } from 'zod';

import { sendProblem } from '../errors/problem.js';

export type ParseResult<T> =
  { success: true; data: T } | { success: false; message: string };

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
