import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/* The answer is kept for later mounts, so a screen pushed after the first read
 * starts with the truth instead of the safe default. */
let known: boolean | null = null;

/** The system's reduce-motion preference, read and kept current. */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(known ?? true);

  useEffect(() => {
    let active = true;

    void AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      known = enabled;

      if (active) {
        setReduceMotion(enabled);
      }
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      enabled => {
        known = enabled;
        setReduceMotion(enabled);
      }
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
