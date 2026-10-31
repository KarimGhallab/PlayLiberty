import {
  IconCopy,
  IconRotate,
  IconScissorsOff
} from '@tabler/icons-react-native';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useI18n } from '@playliberty/i18n';

import Sheet from '../../../shared/components/Sheet/Sheet';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  touchTarget
} from '../../../shared/styles/tokens';

import type { TrackAction, TrackActionKey } from './trackActions';

const ICONS = {
  copy: IconCopy,
  retry: IconRotate,
  fetchWhole: IconScissorsOff
} as const;

export interface TrackActionsSheetProps {
  readonly trackTitle: string | null;
  readonly actions: readonly TrackAction[];
  readonly onSelect: (key: TrackActionKey) => void;
  readonly onClose: () => void;
}

/* One sheet for one track's actions. The lane opens it; the caller owns the
 * access and state model that chooses its items. */
export default function TrackActionsSheet({
  trackTitle,
  actions,
  onSelect,
  onClose
}: TrackActionsSheetProps) {
  const { t } = useI18n();

  return (
    <Sheet
      visible={trackTitle !== null}
      title={trackTitle ?? ''}
      onRequestClose={onClose}
      testID="track-actions-sheet"
      backdropTestID="track-actions-backdrop">
      {actions.map((action, index) => {
        const Icon = ICONS[action.key];

        return (
          <Pressable
            key={action.key}
            testID={`track-action-${action.key}`}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.row,
              index < actions.length - 1 && styles.rule,
              pressed && styles.pressed
            ]}
            onPress={() => onSelect(action.key)}>
            <Icon size={tokenLength('icon-md')} color={tokenColor('ink')} />
            <Text style={styles.label}>{t(action.label)}</Text>
          </Pressable>
        );
      })}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-3')
  },
  rule: {
    borderBottomWidth: 1,
    borderBottomColor: tokenColor('line')
  },
  pressed: {
    backgroundColor: tokenColor('surface-raised')
  },
  label: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-md')
  }
});
