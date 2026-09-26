import type { Config } from '../config/types.js';
import type { DatabaseHandle } from '../db/client.js';
import type { MediaPaths } from '../media/mediaPaths.js';

export interface AppOptions {
  config: Config;
  database: DatabaseHandle;
  mediaPaths: MediaPaths;
}
