import { IconUserShare } from '@tabler/icons-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

import { TrackFileStatus } from '@playliberty/contracts';
import type { TrackFileStatusCounts } from '@playliberty/contracts';
import { useI18n } from '@playliberty/i18n';
import { standardEasingBezier } from '@playliberty/ui-foundation';

import { useReduceMotion } from '../../../shared/a11y/useReduceMotion';
import Chip from '../../../shared/components/Chip/Chip';
import {
  fontFamily,
  tokenColor,
  tokenDuration,
  tokenLength,
  touchTarget
} from '../../../shared/styles/tokens';
import {
  STATUS_CHIPS,
  totalStatusCount
} from '../../../shared/trackState/statusChips';

export type LibraryScope = 'all' | 'shared';

interface SegmentRect {
  readonly x: number;
  readonly width: number;
}

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
  const reduceMotion = useReduceMotion();
  const [allRect, setAllRect] = useState<SegmentRect | null>(null);
  const [sharedRect, setSharedRect] = useState<SegmentRect | null>(null);
  const selection = useRef(
    new Animated.Value(scope === 'shared' ? 1 : 0)
  ).current;
  const total = totalStatusCount(counts);
  const hasStatus = total > 0;
  const measured = allRect !== null && sharedRect !== null;

  /* The selected ground is one plate that slides between the pair, so the
   * scope reads as a single choice rather than two repainted boxes. */
  useEffect(() => {
    const target = scope === 'shared' ? 1 : 0;

    if (reduceMotion) {
      selection.setValue(target);
      return;
    }

    Animated.timing(selection, {
      toValue: target,
      duration: tokenDuration('motion-base'),
      easing: Easing.bezier(...standardEasingBezier),
      useNativeDriver: false
    }).start();
  }, [reduceMotion, scope, selection]);

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
          <View style={styles.pairInner}>
            {measured ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.scopePlate,
                  {
                    left: selection.interpolate({
                      inputRange: [0, 1],
                      outputRange: [allRect.x, sharedRect.x]
                    }),
                    width: selection.interpolate({
                      inputRange: [0, 1],
                      outputRange: [allRect.width, sharedRect.width]
                    }),
                    backgroundColor: selection.interpolate({
                      inputRange: [0, 1],
                      outputRange: [
                        tokenColor('surface-raised'),
                        tokenColor('shared-surface')
                      ]
                    }),
                    borderColor: selection.interpolate({
                      inputRange: [0, 1],
                      outputRange: [
                        tokenColor('control-border'),
                        tokenColor('shared-border')
                      ]
                    })
                  }
                ]}
              />
            ) : null}
            <Pressable
              testID="scope-all"
              accessibilityRole="button"
              accessibilityState={{ selected: scope === 'all' }}
              accessibilityLabel={`${t('library.scopeAll')} ${totalCount}`}
              style={[
                styles.segment,
                !measured && scope === 'all' && styles.segmentAll
              ]}
              onLayout={event => {
                setAllRect({
                  x: event.nativeEvent.layout.x,
                  width: event.nativeEvent.layout.width
                });
              }}
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
              style={[
                styles.segment,
                !measured && scope === 'shared' && styles.segmentShared
              ]}
              onLayout={event => {
                setSharedRect({
                  x: event.nativeEvent.layout.x,
                  width: event.nativeEvent.layout.width
                });
              }}
              onPress={() => onScopeChange('shared')}>
              <IconUserShare
                size={tokenLength('icon-sm')}
                color={
                  scope === 'shared'
                    ? tokenColor('shared')
                    : tokenColor('muted')
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
          {STATUS_CHIPS.filter(status => counts[status.value] > 0).map(
            status => (
              <Chip
                key={status.value}
                label={t(status.label)}
                count={counts[status.value]}
                tone={status.tone}
                selected={activeStatus === status.value}
                onPress={() => onStatusChange(status.value)}
              />
            )
          )}
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
    padding: 2,
    borderWidth: 1,
    borderColor: tokenColor('control-border'),
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('surface')
  },
  pairInner: {
    flexDirection: 'row',
    gap: 2,
    position: 'relative'
  },
  scopePlate: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderWidth: 1,
    borderRadius: tokenLength('radius-chip')
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
