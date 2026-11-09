import { StyleSheet, Text, View } from 'react-native';

import type { AccountSummary } from '@playliberty/contracts';

import { sleeveColor } from '../../styles/sleeve';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenWeight
} from '../../styles/tokens/tokens';
import AppImage from '../AppImage';

export type AccountAvatarSize = 'sm' | 'md';

export interface AccountAvatarProps {
  readonly account: AccountSummary;
  readonly size?: AccountAvatarSize;
}

const SIZES = {
  sm: { box: tokenLength('control-height'), font: tokenLength('text-md') },
  md: { box: tokenLength('space-9'), font: tokenLength('text-lg') }
} as const;

/* The account's face: its avatar, or its initial on the sleeve hue its id
 * derives, so two accounts are told apart before the name is read. */
export default function AccountAvatar({
  account,
  size = 'md'
}: AccountAvatarProps) {
  const { box, font } = SIZES[size];

  if (account.avatarUrl !== null) {
    return (
      <AppImage
        accessible={false}
        testID="account-avatar"
        source={{ uri: account.avatarUrl }}
        style={[styles.image, { width: box, height: box }]}
      />
    );
  }

  const initial = account.displayName.trim().charAt(0).toUpperCase() || '?';

  return (
    <View
      testID="account-monogram"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.monogram,
        { width: box, height: box, backgroundColor: sleeveColor(account.id) }
      ]}>
      <Text style={[styles.label, { fontSize: font }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('surface-raised')
  },
  monogram: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokenLength('radius-chip')
  },
  label: {
    color: tokenColor('ink'),
    fontFamily,
    fontWeight: tokenWeight('weight-semibold')
  }
});
