import { problemDetail } from '@playliberty/i18n';
import type { Messages, Translator } from '@playliberty/i18n';

import { ApiError } from '../client/client';

/*
 * The one seam where a refusal becomes a sentence: the client's `ApiError`
 * carries the server's problem document, so the unwrap and mapping are written
 * once.
 */
export function problemSentence(
  t: Translator<Messages>,
  error: unknown
): string | null {
  return error instanceof ApiError ? problemDetail(t, error.problem) : null;
}

/* The raw download reason is yt-dlp's stderr, so the client classifies it into
 * the few outcomes a person can act on. The phrases are the vendor's own. */
enum FailureClass {
  Unavailable = 'unavailable',
  Private = 'private',
  Blocked = 'blocked',
  Network = 'network',
  Unknown = 'unknown'
}

const PRIVATE_PATTERN = /private video|this video is private|video is private/i;
const UNAVAILABLE_PATTERN =
  /video unavailable|this video is not available|uploader has not made this video available|video has been deleted|has been removed|no longer available|removed by the uploader/i;
const BLOCKED_PATTERN =
  /http error (?:401|403|429)|forbidden|blocked|not available in your country|geo.?block|sign in to confirm|confirm you.re not a bot/i;
const NETWORK_PATTERN =
  /network|connection|timed out|timeout|temporary failure|name resolution|ssl|unable to download (?:webpage|video data)/i;

function failureClass(reason: string): FailureClass {
  if (PRIVATE_PATTERN.test(reason)) {
    return FailureClass.Private;
  }

  if (UNAVAILABLE_PATTERN.test(reason)) {
    return FailureClass.Unavailable;
  }

  if (BLOCKED_PATTERN.test(reason)) {
    return FailureClass.Blocked;
  }

  if (NETWORK_PATTERN.test(reason)) {
    return FailureClass.Network;
  }

  return FailureClass.Unknown;
}

/** A sentence for a failed download, never the vendor's diagnostic. */
export function failureSentence(
  t: Translator<Messages>,
  reason: string
): string {
  switch (failureClass(reason)) {
    case FailureClass.Private:
      return t('trackRow.failure.private');
    case FailureClass.Unavailable:
      return t('trackRow.failure.unavailable');
    case FailureClass.Blocked:
      return t('trackRow.failure.blocked');
    case FailureClass.Network:
      return t('trackRow.failure.network');
    case FailureClass.Unknown:
      return t('trackRow.failure.unknown');
  }
}
