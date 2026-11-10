import { IconRefresh } from '@tabler/icons-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@playliberty/i18n';

import Spinner from '../../shared/components/Spinner';
import { lineHeightFor, useTextScale } from '../../shared/styles/textMetrics';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenNumber,
  tokenWeight,
  touchTarget
} from '../../shared/styles/tokens/tokens';

export interface PlaylistEmptyProps {
  /* Absent for a read collaborator, who cannot sync. */
  readonly onSync?: () => void;
  readonly syncing?: boolean;
}

/* A playlist that has never synced: the state, the promise and the one action
 * a writer can take. */
export default function PlaylistEmpty({
  onSync,
  syncing = false
}: PlaylistEmptyProps) {
  const { t } = useI18n();
  const scale = useTextScale();
  const proseStyle = [
    styles.prose,
    { lineHeight: lineHeightFor('text-md', 'leading-normal', scale) }
  ];
  const promiseStyle = [
    styles.promise,
    { lineHeight: lineHeightFor('text-sm', 'leading-relaxed', scale) }
  ];

  return (
    <View testID="playlist-empty" style={styles.empty}>
      <Text accessibilityRole="header" style={styles.heading}>
        {t('emptyState.heading')}
      </Text>
      <Text style={proseStyle}>{t('emptyState.prose')}</Text>
      <Text style={promiseStyle}>{t('emptyState.promise')}</Text>
      {onSync === undefined ? null : (
        <Pressable
          testID="empty-sync"
          accessibilityRole="button"
          accessibilityLabel={
            syncing ? t('emptyState.syncing') : t('emptyState.sync')
          }
          accessibilityState={{ disabled: syncing, busy: syncing }}
          disabled={syncing}
          style={({ pressed }) => [
            styles.action,
            pressed && styles.actionPressed,
            syncing && styles.actionDisabled
          ]}
          onPress={onSync}>
          {syncing ? (
            <Spinner color={tokenColor('bg')} />
          ) : (
            <IconRefresh
              size={tokenLength('icon-md')}
              color={tokenColor('bg')}
            />
          )}
          <Text style={styles.actionLabel}>
            {syncing ? t('emptyState.syncing') : t('emptyState.sync')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    gap: tokenLength('space-3'),
    paddingVertical: tokenLength('space-5')
  },
  heading: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-lg'),
    fontWeight: tokenWeight('weight-semibold')
  },
  prose: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-md')
  },
  promise: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-sm')
  },
  action: {
    minHeight: touchTarget,
    minWidth: touchTarget,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokenLength('space-2'),
    paddingHorizontal: tokenLength('space-5'),
    borderRadius: tokenLength('radius-control'),
    backgroundColor: tokenColor('accent')
  },
  actionPressed: {
    backgroundColor: tokenColor('accent-hover')
  },
  actionDisabled: {
    opacity: tokenNumber('opacity-disabled')
  },
  actionLabel: {
    color: tokenColor('bg'),
    fontFamily,
    fontSize: tokenLength('text-md'),
    fontWeight: tokenWeight('weight-medium')
  }
});
