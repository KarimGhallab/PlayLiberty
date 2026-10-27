import type { FastifyReply } from 'fastify';
import type { z } from 'zod';

import { ProblemCode } from '@playliberty/contracts';
import type { Problem } from '@playliberty/contracts';

/* The values a problem carries for the copy that varies under one code. */
export type ProblemParams = Readonly<Record<string, string | number>>;

export interface ProblemInput {
  status: number;
  code: ProblemCode;
  title: string;
  detail?: string;
  params?: ProblemParams;
  type?: string;
}

export function createProblem(input: ProblemInput): Problem {
  return {
    type: input.type ?? `https://playliberty.dev/problems/${input.code}`,
    title: input.title,
    status: input.status,
    code: input.code,
    detail: input.detail,
    params: input.params
  };
}

/* `no-store` on every refusal: a 404 is exactly the status a cache may store by
 * heuristic, so the document is barred from every cache. */
export function sendProblem(
  reply: FastifyReply,
  input: ProblemInput
): FastifyReply {
  return reply
    .header('Cache-Control', 'no-store')
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
    code: ProblemCode.NotImplemented,
    title: 'Not Implemented',
    detail
  });
}

export interface ProblemIssue {
  readonly path: string;
  readonly code: string;
}

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; issues: readonly ProblemIssue[] };

/* Parses untrusted input, reporting failure as issues, never Zod's prose: the
 * code and params travel, and the client owns the sentence. */
export function parseBody<T>(
  schema: z.ZodType<T>,
  body: unknown
): ParseResult<T> {
  const result = schema.safeParse(body);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    issues: result.error.issues.map(issue => ({
      path: issue.path.join('.') || 'body',
      code: issue.code
    }))
  };
}

/* Both malformed-input helpers live here: one shape, one content type, so no
 * route's 400 looks different. */
export function sendInvalidRequest(reply: FastifyReply): FastifyReply {
  return sendProblem(reply, {
    status: 400,
    code: ProblemCode.InvalidRequest,
    title: 'Invalid Request'
  });
}

/* One code and its parameters, never Zod's English. The status is the caller's:
 * add-track uses 422 where every other route uses 400. */
export function sendValidationFailed(
  reply: FastifyReply,
  issues: readonly ProblemIssue[],
  status = 400
): FastifyReply {
  const [first] = issues;

  return sendProblem(reply, {
    status,
    code: ProblemCode.ValidationFailed,
    title: 'Invalid Request',
    params:
      first === undefined ? undefined : { path: first.path, issue: first.code }
  });
}

/* The batch add's whole-request refusal. 422, not 400: a 400 is a body the
 * server could not read, a 422 a body it read and would not act on. */
export function sendUnprocessable(reply: FastifyReply): FastifyReply {
  return sendProblem(reply, {
    status: 422,
    code: ProblemCode.UnprocessableRequest,
    title: 'Unprocessable Request'
  });
}
