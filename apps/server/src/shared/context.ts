import type { LiveEvent } from '@playliberty/contracts';
import type { IEgressAgentClient, IYoutubeClient } from '@playliberty/youtube';

import type { Config } from '../platform/config/types.js';
import type { DatabaseHandle } from '../platform/database/client.js';
import type { MediaPaths } from '../platform/media/mediaPaths.js';
import type { EventBus } from './events/eventBus/EventBus.js';

/*
 * Everything a feature may reach, in one shape, so a new need is visible here.
 * `youtube` is the single seam to the source, `events` the shared live bus, and
 * `kickDownloads` a callback because routes register before the worker exists.
 */
export interface AppContext {
  config: Config;
  database: DatabaseHandle;
  mediaPaths: MediaPaths;
  youtube: IYoutubeClient;
  /* The egress agent: the pool and the loaded config, never a policy. */
  egressAgent: IEgressAgentClient;
  kickDownloads: () => void;
  events: EventBus<LiveEvent>;
}
