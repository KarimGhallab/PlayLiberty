import { useEffect } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/* VoiceOver ignores a live region, so iOS gets the explicit call; TalkBack owns
 * the region, so Android must not also speak. */
export function useAnnouncement(
  message: string | null | undefined
): 'polite' | undefined {
  useEffect(() => {
    if (
      Platform.OS !== 'ios' ||
      message === null ||
      message === undefined ||
      message === ''
    ) {
      return;
    }

    AccessibilityInfo.announceForAccessibility(message);
  }, [message]);

  return Platform.OS === 'android' ? 'polite' : undefined;
}
