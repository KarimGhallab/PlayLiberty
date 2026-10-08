import type { LiveEvent } from '@playliberty/contracts';
import type { IYoutubeClient } from '@playliberty/youtube';

import type { Config } from '../platform/config/types.js';
import type { DatabaseHandle } from '../platform/database/client.js';
import type { MediaPaths } from '../platform/media/mediaPaths.js';
import type { EventBus } from './events/eventBus/EventBus.js';

/*
 * Everything a feature is allowed to reach, in one shape.
 *
 * It exists because the alternative was a bundle threaded through five route
 * registrars by hand, two of which took nothing at all. A registrar that accepts
 * the context has every resource the app owns; a feature that needs something new
 * makes that visible here rather than by reaching past its own route.
 *
 * `youtube` is here rather than behind a feature because the adapter is the
 * instance's single seam to the source, and both features that use it are
 * consumers of the same seam rather than owners of it. It is an interface, so the
 * seam is substitutable: a test that drives a real app over a fake adapter passes
 * one in and never spawns a process.
 *
 * This is a plain object shape, not a class contract, so it takes no `I` prefix.
 * Nothing here is behaviour, and nothing needs a second implementation of the
 * object as a whole.
 *
 * `kickDownloads` is the one behaviour here, and it is a callback rather than a
 * handle to the worker because of the order the app builds in: routes are
 * registered before the worker exists, and a sync that queued tracks has to be
 * able to wake it. The worker replaces the default no-op in `buildApp`'s `onReady`
 * hook, so a feature that calls it before the worker is up does nothing rather
 * than reaching for a handle that is not there.
 *
 * `events` is the live bus, built with the context because it is a resource
 * every feature sits on rather than one feature's. A feature publishes to it
 * when server state changes, and the events route subscribes each connection to
 * the account's channel.
 */
export interface AppContext {
  config: Config;
  database: DatabaseHandle;
  mediaPaths: MediaPaths;
  youtube: IYoutubeClient;
  kickDownloads: () => void;
  events: EventBus<LiveEvent>;
}
