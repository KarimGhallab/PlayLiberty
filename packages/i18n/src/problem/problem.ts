import { PlaylistNotFoundReason, ProblemCode } from '@playliberty/contracts';
import type { Problem } from '@playliberty/contracts';

import type { Translator } from '../createTranslator/createTranslator.js';
import type { Messages } from '../en.js';

/*
 * A problem document as a sentence. The server owns a stable code and the
 * parameters that vary its copy; the client owns the words, so a known code maps
 * to a catalog sentence and anything else falls back to the server's own English.
 * The `detail` stays every server's fallback for a code this client does not know.
 *
 * The code and the reason are the shared contract's members, so a rename on
 * either end is a compile error here rather than a sentence that silently stops
 * matching.
 */
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

  return problem.detail ?? null;
}
