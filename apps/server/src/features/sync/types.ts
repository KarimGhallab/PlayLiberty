import type { SyncRun } from '@playliberty/contracts';

import type { Refused } from '../../shared/refusal.js';

export type SyncRunResult = { outcome: 'ok'; run: SyncRun } | Refused;
