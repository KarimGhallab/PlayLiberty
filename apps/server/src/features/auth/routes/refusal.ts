import type { FastifyReply } from 'fastify';

import { ProblemCode } from '@playliberty/contracts';

import { sendProblem } from '../../../shared/problem.js';

/* One refusal for a missing, used, expired or mismatched credential: the
 * caller learns nothing about which. */
export function sendInvalidGrant(reply: FastifyReply): FastifyReply {
  return sendProblem(reply, {
    status: 400,
    code: ProblemCode.InvalidGrant,
    title: 'Invalid Grant'
  });
}
