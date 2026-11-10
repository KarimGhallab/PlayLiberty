import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

/**
 * Whether another route covers this screen. A transparent modal leaves the
 * screen below mounted but out of reach.
 */
export function useCoveredScreen(): boolean {
  const [covered, setCovered] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setCovered(false);

      return () => {
        setCovered(true);
      };
    }, [])
  );

  return covered;
}
