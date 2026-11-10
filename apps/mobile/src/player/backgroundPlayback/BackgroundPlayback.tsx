import { usePathname } from 'expo-router';

import type { ApiConfig } from '../../auth/useApiConfig/useApiConfig';
import { useBackgroundPlayback } from './useBackgroundPlayback/useBackgroundPlayback';

export interface BackgroundPlaybackProps {
  readonly config: ApiConfig | null;
}

/** Mounts the player-to-service bridge once, off the app shell's render path. */
export default function BackgroundPlayback({
  config
}: BackgroundPlaybackProps) {
  const route = usePathname();

  useBackgroundPlayback(config, route);

  return null;
}
