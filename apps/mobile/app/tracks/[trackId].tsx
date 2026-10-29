import { useLocalSearchParams } from 'expo-router';

import Screen from '../../src/shared/components/Screen/Screen';

export default function TrackRoute() {
  const { trackId } = useLocalSearchParams<{ trackId: string }>();

  return <Screen title={trackId ?? ''} />;
}
