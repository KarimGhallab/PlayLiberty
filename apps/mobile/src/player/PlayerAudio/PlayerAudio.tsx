import type { StreamFailureClassifier } from '../streamFailure/streamFailure';
import type { SourceResolver } from '../usePlayerAudio/usePlayerAudio';
import { usePlayerAudio } from '../usePlayerAudio/usePlayerAudio';

export interface PlayerAudioProps {
  readonly resolveSource: SourceResolver;
  readonly classifyFailure: StreamFailureClassifier;
}

/** The player's mounting point, so its status updates stay off the app shell. */
export default function PlayerAudio({
  resolveSource,
  classifyFailure
}: PlayerAudioProps) {
  usePlayerAudio(resolveSource, classifyFailure);

  return null;
}
