import type { FastifyReply } from 'fastify';
import type { z } from 'zod';

import { ProblemCode } from '@playliberty/contracts';
import type { PlaylistNotFoundReason, Problem } from '@playliberty/contracts';

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

/*
 * Every refusal carries `no-store`. A problem is a state, not a resource: a 404
 * for a thumbnail that has not landed yet must not be remembered, or the browser
 * keeps drawing the sleeve after the artwork arrives, and a 404 is exactly the
 * status a cache is allowed to store by heuristic. `private` alone would not fix
 * it, so the whole document is barred from every cache.
 */
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

/*
 * A playlist the account cannot reach, as the one code and the scope it was
 * refused in. The library, the detail, the shares and the latest run all answer
 * this, and the client maps the reason to its own sentence, so the server keeps
 * no second copy of that English.
 */
export function sendPlaylistNotFound(
  reply: FastifyReply,
  reason: PlaylistNotFoundReason
): FastifyReply {
  return sendProblem(reply, {
    status: 404,
    code: ProblemCode.PlaylistNotFound,
    title: 'Playlist Not Found',
    params: { reason }
  });
}

/* One Zod issue as the wire carries it: the field and the shape of the fault. */
export interface ProblemIssue {
  readonly path: string;
  readonly code: string;
}

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; issues: readonly ProblemIssue[] };

/*
 * Parses any untrusted input against a schema and reports the failure as a
 * problem document, so every route turns a bad body or a bad query string the
 * same way. The name says body because the first caller was a body; the query
 * string on a paginated list goes through here as well.
 *
 * The failure is the structured issues and never Zod's English prose: the code
 * and the parameters travel, and the client owns the sentence it renders.
 */
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

/*
 * The other way a request produces a problem document, and the reason the two sit
 * in one module: both write the same shape to the same content type, and a
 * route that produced a malformed-input problem by hand would be the one route
 * whose 400 looked different.
 */
export function sendInvalidRequest(reply: FastifyReply): FastifyReply {
  return sendProblem(reply, {
    status: 400,
    code: ProblemCode.InvalidRequest,
    title: 'Invalid Request'
  });
}

/*
 * A Zod failure, as one code and its parameters rather than Zod's own English.
 * The status is the caller's, because the add-track route refuses a body it read
 * and would not act on with a 422 while every other route uses the plain 400.
 */
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

/*
 * The batch add's whole-request refusal. The request is syntactically fine and
 * still cannot be carried out, because "add a video" was handed a playlist URL, or
 * an empty list, or more ids than one request may name. 422 rather than 400 keeps
 * the two apart: a 400 is a body the server could not read, a 422 is a body it read
 * and would not act on.
 */
export function sendUnprocessable(reply: FastifyReply): FastifyReply {
  return sendProblem(reply, {
    status: 422,
    code: ProblemCode.UnprocessableRequest,
    title: 'Unprocessable Request'
  });
}
