import { PlaylistNotFoundReason, ProblemCode } from '@playliberty/contracts';
import type { Problem } from '@playliberty/contracts';

import type { Translator } from '../createTranslator/createTranslator.js';
import type { Messages } from '../en.js';

/* A known code maps to a catalog sentence, else the server's `detail`. Code and
 * reason are shared contract members, so a rename fails to compile. */
export function problemDetail(
  t: Translator<Messages>,
  problem: Problem | null
): string | null {
  if (problem === null) {
    return null;
  }

  if (problem.code === ProblemCode.PlaylistNotFound) {
    const reason = problem.params?.reason;

    if (reason === PlaylistNotFoundReason.Read) {
      return t('problem.playlistNotFound.read');
    }
    if (reason === PlaylistNotFoundReason.Write) {
      return t('problem.playlistNotFound.write');
    }
    if (reason === PlaylistNotFoundReason.Manage) {
      return t('problem.playlistNotFound.manage');
    }
    if (reason === PlaylistNotFoundReason.Track) {
      return t('problem.playlistNotFound.track');
    }

    return problem.detail ?? null;
  }

  if (problem.code === ProblemCode.InvalidRequest) {
    return t('problem.invalidRequest');
  }
  if (problem.code === ProblemCode.UnprocessableRequest) {
    return t('problem.unprocessableRequest');
  }
  if (problem.code === ProblemCode.ValidationFailed) {
    return t('problem.validationFailed');
  }
  if (problem.code === ProblemCode.InvalidGrant) {
    return t('problem.invalidGrant');
  }
  if (problem.code === ProblemCode.ProvisioningUnavailable) {
    return t('problem.provisioningUnavailable');
  }
  if (problem.code === ProblemCode.ProvisioningFailed) {
    return t('problem.provisioningFailed');
  }
  if (problem.code === ProblemCode.RateLimited) {
    return t('problem.rateLimited');
  }

  return problem.detail ?? null;
}
