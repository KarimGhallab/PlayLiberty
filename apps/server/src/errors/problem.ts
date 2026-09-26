import type { FastifyReply } from 'fastify';

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
