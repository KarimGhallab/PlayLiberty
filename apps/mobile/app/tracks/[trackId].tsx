import { useLocalSearchParams } from 'expo-router';

import LibraryShell from '../../src/views/library/LibraryShell/LibraryShell';
import BareTrackEntry from '../../src/views/track/BareTrackEntry/BareTrackEntry';

export default function TrackRoute() {
  const { trackId } = useLocalSearchParams<{ trackId: string }>();

  return (
    <>
      <LibraryShell />
      <BareTrackEntry trackId={trackId ?? null} />
    </>
  );
}
