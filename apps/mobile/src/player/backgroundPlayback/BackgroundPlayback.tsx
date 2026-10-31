import type { ApiConfig } from '../../auth/useApiConfig';
import { useBackgroundPlayback } from './useBackgroundPlayback/useBackgroundPlayback';

export interface BackgroundPlaybackProps {
  readonly config: ApiConfig | null;
}

/** Mounts the player-to-service bridge once, off the app shell's render path. */
export default function BackgroundPlayback({
  config
}: BackgroundPlaybackProps) {
  useBackgroundPlayback(config);

  return null;
}
