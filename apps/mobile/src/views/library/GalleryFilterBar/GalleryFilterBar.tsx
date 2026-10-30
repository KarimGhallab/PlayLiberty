import { IconUserShare } from '@tabler/icons-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TrackFileStatus } from '@playliberty/contracts';
import type { TrackFileStatusCounts } from '@playliberty/contracts';
import type { MessageKey, Messages } from '@playliberty/i18n';
import { useI18n } from '@playliberty/i18n';
import { TrackTone } from '@playliberty/ui-foundation';

import Chip from '../../../shared/components/Chip/Chip';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  touchTarget
} from '../../../shared/styles/tokens';

export type LibraryScope = 'all' | 'shared';

interface StatusChip {
  readonly value: TrackFileStatus;
  readonly label: MessageKey<Messages>;
  readonly tone: TrackTone;
}

const STATUSES: readonly StatusChip[] = [
  {
    value: TrackFileStatus.Stored,
    label: 'trackState.stored',
    tone: TrackTone.Stored
  },
  {
    value: TrackFileStatus.Pending,
    label: 'trackState.pending',
    tone: TrackTone.Pending
  },
  {
    value: TrackFileStatus.Downloading,
    label: 'trackState.downloading',
    tone: TrackTone.Downloading
  },
  {
    value: TrackFileStatus.Failed,
    label: 'trackState.failed',
    tone: TrackTone.Failed
  },
  {
    value: TrackFileStatus.Unavailable,
    label: 'trackState.unavailable',
    tone: TrackTone.Unavailable
  }
];

export interface GalleryFilterBarProps {
  readonly hasShared: boolean;
  readonly totalCount: number;
  readonly sharedCount: number;
  readonly scope: LibraryScope;
  readonly onScopeChange: (scope: LibraryScope) => void;
  readonly counts: TrackFileStatusCounts;
  readonly activeStatus: TrackFileStatus | null;
  readonly onStatusChange: (status: TrackFileStatus | null) => void;
}

/* One rail above the grid: the ownership scope leads, the status chips follow.
 * A scope in force names itself in the shared role, not a state tone. */
export default function GalleryFilterBar({
  hasShared,
  totalCount,
  sharedCount,
  scope,
  onScopeChange,
  counts,
  activeStatus,
  onStatusChange
}: GalleryFilterBarProps) {
  const { t } = useI18n();
  const total = STATUSES.reduce((sum, status) => sum + counts[status.value], 0);
  const hasStatus = total > 0;

  if (!hasShared && !hasStatus) {
    return null;
  }

  return (
    <ScrollView
      testID="gallery-filter-bar"
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.bar}
      contentContainerStyle={styles.content}>
      {hasShared ? (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={t('library.scopeLabel')}
          style={styles.pair}>
          <Pressable
            testID="scope-all"
            accessibilityRole="button"
            accessibilityState={{ selected: scope === 'all' }}
            accessibilityLabel={`${t('library.scopeAll')} ${totalCount}`}
            style={[styles.segment, scope === 'all' && styles.segmentAll]}
            onPress={() => onScopeChange('all')}>
            <Text
              style={[
                styles.segmentLabel,
                scope === 'all' && styles.segmentLabelAll
              ]}>
              {t('library.scopeAll')}
            </Text>
            <Text style={styles.segmentCount}>{totalCount}</Text>
          </Pressable>
          <Pressable
            testID="scope-shared"
            accessibilityRole="button"
            accessibilityState={{ selected: scope === 'shared' }}
            accessibilityLabel={`${t('library.scopeShared')} ${sharedCount}`}
            style={[styles.segment, scope === 'shared' && styles.segmentShared]}
            onPress={() => onScopeChange('shared')}>
            <IconUserShare
              size={tokenLength('icon-sm')}
              color={
                scope === 'shared' ? tokenColor('shared') : tokenColor('muted')
              }
            />
            <Text
              style={[
                styles.segmentLabel,
                scope === 'shared' && styles.segmentLabelShared
              ]}>
              {t('library.scopeShared')}
            </Text>
            <Text
              style={[
                styles.segmentCount,
                scope === 'shared' && styles.segmentCountShared
              ]}>
              {sharedCount}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {hasShared && hasStatus ? <View style={styles.divider} /> : null}

      {hasStatus ? (
        <View style={styles.chips}>
          <Chip
            label={t(hasShared ? 'library.allTracks' : 'detail.filterAll')}
            count={total}
            selected={activeStatus === null}
            onPress={() => onStatusChange(null)}
          />
          {STATUSES.filter(status => counts[status.value] > 0).map(status => (
            <Chip
              key={status.value}
              label={t(status.label)}
              count={counts[status.value]}
              tone={status.tone}
              selected={activeStatus === status.value}
              onPress={() => onStatusChange(status.value)}
            />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexGrow: 0
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-2')
  },
  pair: {
    flexDirection: 'row',
    gap: 2,
    padding: 2,
    borderWidth: 1,
    borderColor: tokenColor('control-border'),
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('surface')
  },
  segment: {
    height: touchTarget - 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-2'),
    paddingHorizontal: tokenLength('space-3'),
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: tokenLength('radius-chip')
  },
  segmentAll: {
    backgroundColor: tokenColor('surface-raised'),
    borderColor: tokenColor('control-border')
  },
  segmentShared: {
    backgroundColor: tokenColor('shared-surface'),
    borderColor: tokenColor('shared-border')
  },
  segmentLabel: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: '500'
  },
  segmentLabelAll: {
    color: tokenColor('ink')
  },
  segmentLabelShared: {
    color: tokenColor('shared')
  },
  segmentCount: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-xs'),
    fontVariant: ['tabular-nums']
  },
  segmentCountShared: {
    color: tokenColor('shared-muted')
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: tokenColor('control-border')
  },
  chips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-2')
  }
});
