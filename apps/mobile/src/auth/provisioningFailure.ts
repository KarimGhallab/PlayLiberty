import {
  type Messages,
  type Translator,
  problemDetail
} from '@playliberty/i18n';

import { ProvisioningError } from './provisioning/provisioning';

/** The problem's sentence, or the generic one when the browser never returned. */
export function provisioningFailure(
  t: Translator<Messages>,
  error: unknown
): string {
  return error instanceof ProvisioningError
    ? (problemDetail(t, error.problem) ?? t('signedOut.failed'))
    : t('signedOut.failed');
}
