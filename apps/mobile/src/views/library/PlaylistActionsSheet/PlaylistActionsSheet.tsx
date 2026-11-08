import {
  IconPencil,
  IconPhoto,
  IconPin,
  IconPinnedOff,
  IconRotate,
  IconShare,
  IconTrash
} from '@tabler/icons-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@playliberty/i18n';
import type { PlaylistAction, PlaylistActionKey } from '@playliberty/library';

import { useAnnouncement } from '../../../shared/a11y/useAnnouncement';
import Sheet from '../../../shared/components/Sheet/Sheet';
import {
  lineHeightFor,
  useTextScale
} from '../../../shared/styles/textMetrics';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  touchTarget
} from '../../../shared/styles/tokens';

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
  readonly onExited?: () => void;
  /** The status block above the actions: the playlist's sync evidence. */
  readonly summary?: ReactNode;
  /** The playlist's own settings below the actions: the skip switch. */
  readonly extra?: ReactNode;
}

/* One sheet for one playlist's actions, gated by the caller's access model. A
 * destructive item is the only one that takes the failed tone. */
export default function PlaylistActionsSheet({
  playlistName,
  actions,
  problem = null,
  onSelect,
  onClose,
  onExited,
  summary,
  extra
}: PlaylistActionsSheetProps) {
  const scale = useTextScale();
  const { t } = useI18n();
  const liveRegion = useAnnouncement(problem);
  /* Without actions the settings' top rule is the only one the two blocks
   * need, so the summary does not draw a second. */
  const summaryRule = actions.length > 0;

  return (
    <Sheet
      visible={playlistName !== null}
      title={playlistName ?? ''}
      onRequestClose={onClose}
      onExited={onExited}
      closeLabel={t('common.close')}
      testID="playlist-actions-sheet"
      backdropTestID="playlist-actions-backdrop">
      {summary === undefined ? null : (
        <View
          testID="playlist-actions-summary"
          style={[styles.summary, !summaryRule && styles.summaryWithoutRule]}>
          {summary}
        </View>
      )}
      {problem === null ? null : (
        <Text
          testID="playlist-actions-problem"
          accessibilityRole="alert"
          accessibilityLiveRegion={liveRegion}
          style={[
            styles.problem,
            { lineHeight: lineHeightFor('text-sm', 'leading-normal', scale) }
          ]}>
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
      {extra === undefined ? null : (
        <View testID="playlist-actions-extra" style={styles.extra}>
          {extra}
        </View>
      )}
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
  summary: {
    marginBottom: tokenLength('space-3'),
    paddingBottom: tokenLength('space-3'),
    borderBottomWidth: 1,
    borderBottomColor: tokenColor('line')
  },
  summaryWithoutRule: {
    borderBottomWidth: 0
  },
  extra: {
    gap: tokenLength('space-3'),
    marginTop: tokenLength('space-3'),
    paddingTop: tokenLength('space-3'),
    borderTopWidth: 1,
    borderTopColor: tokenColor('line')
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
    marginBottom: tokenLength('space-3')
  }
});
