import {
  IconCopy,
  IconRotate,
  IconScissorsOff,
  IconTrash
} from '@tabler/icons-react-native';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useI18n } from '@playliberty/i18n';
import type { TrackAction, TrackActionKey } from '@playliberty/library';

import Sheet from '../../../shared/components/Sheet/Sheet';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  touchTarget
} from '../../../shared/styles/tokens';

const ICONS = {
  copy: IconCopy,
  retry: IconRotate,
  fetchWhole: IconScissorsOff,
  remove: IconTrash
} as const;

export interface TrackActionsSheetProps {
  readonly trackTitle: string | null;
  readonly actions: readonly TrackAction[];
  readonly onSelect: (key: TrackActionKey) => void;
  readonly onClose: () => void;
  readonly onExited?: () => void;
}

/* One sheet for one track's actions. The lane opens it; the caller owns the
 * access and state model that chooses its items. */
export default function TrackActionsSheet({
  trackTitle,
  actions,
  onSelect,
  onClose,
  onExited
}: TrackActionsSheetProps) {
  const { t } = useI18n();

  return (
    <Sheet
      visible={trackTitle !== null}
      title={trackTitle ?? ''}
      onRequestClose={onClose}
      onExited={onExited}
      closeLabel={t('common.close')}
      testID="track-actions-sheet"
      backdropTestID="track-actions-backdrop">
      {actions.map((action, index) => {
        const Icon = ICONS[action.key];
        const destructive = action.key === 'remove';
        const color = destructive
          ? tokenColor('tone-failed')
          : tokenColor('ink');

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
            <Icon size={tokenLength('icon-md')} color={color} />
            <Text style={[styles.label, destructive && styles.destructive]}>
              {t(action.label)}
            </Text>
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
  },
  destructive: {
    color: tokenColor('tone-failed')
  }
});
