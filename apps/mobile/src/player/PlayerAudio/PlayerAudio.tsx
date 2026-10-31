import type { SourceResolver } from '../usePlayerAudio/usePlayerAudio';
import { usePlayerAudio } from '../usePlayerAudio/usePlayerAudio';

export interface PlayerAudioProps {
  readonly resolveSource: SourceResolver;
}

/** The player's mounting point, so its status updates stay off the app shell. */
export default function PlayerAudio({ resolveSource }: PlayerAudioProps) {
  usePlayerAudio(resolveSource);

  return null;
}
