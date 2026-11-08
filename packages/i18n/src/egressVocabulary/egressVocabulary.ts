import { EgressStatus } from '@playliberty/contracts';

import type {
  MessageKey,
  Translator
} from '../createTranslator/createTranslator.js';
import type { Messages } from '../en.js';
import { formatRelativeTime } from '../formatters/formatters.js';

export enum EgressAction {
  Switch = 'switch',
  Check = 'check'
}

export interface EgressNotice {
  readonly message: string;
  readonly detail: string | null;
}

type EgressNeverKey = 'egress.neverAttempted' | 'egress.neverChecked';

const STATUS_KEYS: Record<EgressStatus, MessageKey<Messages>> = {
  [EgressStatus.Ok]: 'egress.statusOk',
  [EgressStatus.Failed]: 'egress.statusFailed',
  [EgressStatus.Unknown]: 'egress.statusUnknown'
};

const SUCCESS_KEYS: Record<EgressAction, MessageKey<Messages>> = {
  [EgressAction.Switch]: 'egress.toast.switched',
  [EgressAction.Check]: 'egress.toast.checked'
};

const FAILURE_KEYS: Record<EgressAction, MessageKey<Messages>> = {
  [EgressAction.Switch]: 'egress.toast.switchFailed',
  [EgressAction.Check]: 'egress.checkFailed'
};

export function egressStatusLabel(
  t: Translator<Messages>,
  status: EgressStatus
): string {
  return t(STATUS_KEYS[status]);
}

/* The stored code is the server's classification; an unknown one still gets a
 * sentence rather than the tool's stderr. */
export function egressReasonLabel(
  t: Translator<Messages>,
  reason: string
): string {
  switch (reason) {
    case 'blocked':
      return t('egress.reason.blocked');
    case 'unavailable':
    case 'private':
      return t('egress.reason.unavailable');
    case 'network':
      return t('egress.reason.network');
    default:
      return t('egress.reason.unknown');
  }
}

export function egressTimeLabel(
  t: Translator<Messages>,
  value: string | null,
  now: number,
  never: EgressNeverKey
): string {
  return value === null
    ? t(never)
    : formatRelativeTime(t, new Date(value), now);
}

export function egressSuccessNotice(
  t: Translator<Messages>,
  action: EgressAction,
  name: string
): EgressNotice {
  return {
    message: t(SUCCESS_KEYS[action], { name }),
    detail: t('egress.toast.answered')
  };
}

export function egressUnreachableNotice(
  t: Translator<Messages>,
  action: EgressAction
): EgressNotice {
  return {
    message: t(FAILURE_KEYS[action]),
    detail: t('egress.checkUnreachable')
  };
}

export function egressFailureNotice(
  t: Translator<Messages>,
  action: EgressAction,
  detail: string | null
): EgressNotice {
  return {
    message: t(FAILURE_KEYS[action]),
    detail
  };
}
