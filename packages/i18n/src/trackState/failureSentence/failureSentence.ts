import { FailureKind } from '@playliberty/contracts';

import type { Translator } from '../../createTranslator/createTranslator.js';
import type { Messages } from '../../en.js';

/* The sentence comes from the stored kind, so the row cannot disagree with the
 * server's own reading; the raw reason stays behind the disclosure. */
export function failureSentence(
  t: Translator<Messages>,
  kind: FailureKind | null
): string {
  switch (kind) {
    case FailureKind.Unavailable:
      return t('trackRow.failure.unavailable');
    case FailureKind.Private:
      return t('trackRow.failure.private');
    case FailureKind.Blocked:
      return t('trackRow.failure.blocked');
    case FailureKind.Network:
      return t('trackRow.failure.network');
    case FailureKind.Unknown:
    case null:
      return t('trackRow.failure.unknown');
  }
}
