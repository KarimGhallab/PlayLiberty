import {
  IconPencil,
  IconPhoto,
  IconPin,
  IconPinnedOff,
  IconRotate,
  IconShare,
  IconTrash
} from '@tabler/icons-react-native';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useI18n } from '@playliberty/i18n';

import Sheet from '../../../shared/components/Sheet/Sheet';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenNumber,
  touchTarget
} from '../../../shared/styles/tokens';

import type {
  PlaylistAction,
  PlaylistActionKey
} from '../playlistActions/playlistActions';

const ICONS = {
  pin: IconPin,
  share: IconShare,
  rename: IconPencil,
  cover: IconPhoto,
  sync: IconRotate,
  delete: IconTrash
} as const;

export interface PlaylistActionsSheetProps {
  readonly playlistName: string | null;
  readonly actions: readonly PlaylistAction[];
  /* The refusal beside the item that caused it; the sheet stays open. */
  readonly problem?: string | null;
  readonly onSelect: (key: PlaylistActionKey) => void;
  readonly onClose: () => void;
}

/* One sheet for one playlist's actions, gated by the caller's access model. A
 * destructive item is the only one that takes the failed tone. */
export default function PlaylistActionsSheet({
  playlistName,
  actions,
  problem = null,
  onSelect,
  onClose
}: PlaylistActionsSheetProps) {
  const { t } = useI18n();

  return (
    <Sheet
      visible={playlistName !== null}
      title={playlistName ?? ''}
      onRequestClose={onClose}
      testID="playlist-actions-sheet"
      backdropTestID="playlist-actions-backdrop">
      {problem === null ? null : (
        <Text
          testID="playlist-actions-problem"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={styles.problem}>
          {problem}
        </Text>
      )}
      {actions.map((action, index) => {
        const Icon =
          action.key === 'pin' && action.label === 'header.unpin'
            ? IconPinnedOff
            : ICONS[action.key];
        const destructive = action.key === 'delete';
        const color = destructive
          ? tokenColor('tone-failed')
          : tokenColor('ink');

        return (
          <Pressable
            key={action.key}
            testID={`playlist-action-${action.key}`}
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
  },
  problem: {
    color: tokenColor('tone-failed'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    lineHeight: tokenLength('text-sm') * tokenNumber('leading-normal'),
    marginBottom: tokenLength('space-3')
  }
});
