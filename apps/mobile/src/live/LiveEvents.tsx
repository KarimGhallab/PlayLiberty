import type { ApiConfig } from '../auth/useApiConfig';
import { fetchLiveEvents } from './fetchLiveEvents';
import { useLiveEvents } from './useLiveEvents/useLiveEvents';

export interface LiveEventsProps {
  readonly config: ApiConfig | null;
}

/** Mounts the app's one live connection. It draws nothing. */
export default function LiveEvents({ config }: LiveEventsProps) {
  useLiveEvents(config, fetchLiveEvents);

  return null;
}
