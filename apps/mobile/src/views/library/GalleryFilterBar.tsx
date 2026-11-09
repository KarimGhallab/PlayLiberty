import { IconUserShare } from '@tabler/icons-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollViewInstance
} from 'react-native';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from 'react-native';

import type {
  Provider,
  TrackFileStatusCounts,
  TrackFilterState
} from '@playliberty/contracts';
import { providerLabel, useI18n } from '@playliberty/i18n';
import type { LibraryScope } from '@playliberty/library';
import {
  standardEasingBezier,
  statusChipCount,
  totalStatusCount,
  visibleStatusChips
} from '@playliberty/ui-foundation';

import { useReduceMotion } from '../../shared/a11y/useReduceMotion/useReduceMotion';
import Chip from '../../shared/components/Chip';
import { RailFade, useRailEdges } from '../../shared/components/RailFade';
import {
  fontFamily,
  tokenColor,
  tokenDuration,
  tokenLength,
  tokenWeight,
  touchTarget
} from '../../shared/styles/tokens/tokens';

/* The pair's 2pt padding and 1pt border on each side leave 6pt; the hit box
 * takes half above and half below. */
const SEGMENT_INSET = 6;
const SEGMENT_HIT = SEGMENT_INSET / 2;

/* Above this scale the scope pair takes a row of its own, so the status rail
 * keeps the viewport and its first chip stays whole. */
export const SCOPE_STACK_SCALE = 1.3;

export function stacksScope(fontScale: number): boolean {
  /* The platform stores 1.3 as a float just under it, so the line has air. */
  return fontScale >= SCOPE_STACK_SCALE - 0.005;
}

interface SegmentRect {
  readonly x: number;
  readonly width: number;
}

type ChipKey = TrackFilterState | 'all';

interface ChipRect {
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
  readonly remoteRemoved: number;
  readonly provider: Provider;
  readonly activeStatus: TrackFilterState | null;
  readonly onStatusChange: (status: TrackFilterState | null) => void;
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
  remoteRemoved,
  provider,
  activeStatus,
  onStatusChange
}: GalleryFilterBarProps) {
  const { t } = useI18n();
  const { fontScale } = useWindowDimensions();
  const stackScope = hasShared && stacksScope(fontScale);
  const reduceMotion = useReduceMotion();
  const [allRect, setAllRect] = useState<SegmentRect | null>(null);
  const [sharedRect, setSharedRect] = useState<SegmentRect | null>(null);
  const { edges, ...rail } = useRailEdges();
  const scroller = useRef<ScrollViewInstance>(null);
  const railOffset = useRef(0);
  const railViewport = useRef(0);
  const chipsLeft = useRef(0);
  const chipRects = useRef(new Map<ChipKey, ChipRect>());
  /* The rail stays at its start for the default selection; a restored non-default
   * chip is revealed on the first measurement, without the tween. */
  const restored = useRef(activeStatus !== null);
  const chosen = useRef(false);
  const selectedChip: ChipKey = activeStatus ?? 'all';
  const selection = useRef(
    new Animated.Value(scope === 'shared' ? 1 : 0)
  ).current;
  const total = totalStatusCount(counts);
  const hasStatus = total > 0;
  const measured = allRect !== null && sharedRect !== null;

  /* A chip selected while half past the rail's edge is scrolled back into
   * view, so the tap that chose it never hides its own count. */
  const revealChip = useCallback(
    (key: ChipKey, animate: boolean): void => {
      const rect = chipRects.current.get(key);
      const viewport = railViewport.current;

      if (rect === undefined || viewport === 0) {
        return;
      }

      const x = chipsLeft.current + rect.x;
      const margin = tokenLength('space-3');
      const offset = railOffset.current;
      const animated = animate && !reduceMotion;

      if (x < offset + margin) {
        scroller.current?.scrollTo({
          x: Math.max(0, x - margin),
          animated
        });
      } else if (x + rect.width > offset + viewport - margin) {
        scroller.current?.scrollTo({
          x: x + rect.width - viewport + margin,
          animated
        });
      }
    },
    [reduceMotion]
  );

  const revealSelection = (animate: boolean): void => {
    if (!chosen.current && !restored.current) {
      return;
    }

    revealChip(selectedChip, animate);
  };

  const chooseStatus = (status: TrackFilterState | null): void => {
    chosen.current = true;
    onStatusChange(status);
    revealChip(status ?? 'all', true);
  };

  const readViewport = (event: LayoutChangeEvent): void => {
    railViewport.current = event.nativeEvent.layout.width;
    rail.onLayout(event);
    revealSelection(false);
  };

  const readRail = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    railOffset.current = event.nativeEvent.contentOffset.x;
    rail.onScroll(event);
  };

  const readContent = (width: number): void => {
    rail.onContentSizeChange(width);
    revealSelection(false);
  };

  const rememberChip = (key: ChipKey) => (event: LayoutChangeEvent) => {
    chipRects.current.set(key, {
      x: event.nativeEvent.layout.x,
      width: event.nativeEvent.layout.width
    });

    if (key === selectedChip) {
      revealSelection(false);
    }
  };

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

  const scopePair = hasShared ? (
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
          accessibilityRole="radio"
          accessibilityState={{ checked: scope === 'all' }}
          accessibilityLabel={`${t('library.scopeAll')} ${totalCount}`}
          hitSlop={{ top: SEGMENT_HIT, bottom: SEGMENT_HIT }}
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
          accessibilityRole="radio"
          accessibilityState={{ checked: scope === 'shared' }}
          accessibilityLabel={`${t('library.scopeShared')} ${sharedCount}`}
          hitSlop={{ top: SEGMENT_HIT, bottom: SEGMENT_HIT }}
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
    </View>
  ) : null;

  if (!hasShared && !hasStatus) {
    return null;
  }

  return (
    <View style={styles.rail}>
      {stackScope ? <View style={styles.scopeRow}>{scopePair}</View> : null}
      <ScrollView
        ref={scroller}
        testID="gallery-filter-bar"
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.bar}
        contentContainerStyle={styles.content}
        scrollEventThrottle={16}
        onLayout={readViewport}
        onContentSizeChange={readContent}
        onScroll={readRail}>
        {stackScope ? null : scopePair}

        {!stackScope && hasShared && hasStatus ? (
          <View style={styles.divider} />
        ) : null}

        {hasStatus ? (
          <View
            testID="gallery-status-chips"
            accessibilityRole="radiogroup"
            accessibilityLabel={t('detail.filterBy')}
            style={styles.chips}
            onLayout={event => {
              chipsLeft.current = event.nativeEvent.layout.x;
              revealSelection(false);
            }}>
            <View testID="gallery-chip-all" onLayout={rememberChip('all')}>
              <Chip
                label={t('detail.filterAll')}
                count={total}
                selected={activeStatus === null}
                onPress={() => chooseStatus(null)}
              />
            </View>
            {visibleStatusChips(counts, remoteRemoved, activeStatus).map(
              status => {
                const count = statusChipCount(status, counts, remoteRemoved);

                return (
                  <View
                    key={status.value}
                    testID={`gallery-chip-${status.value}`}
                    onLayout={rememberChip(status.value)}>
                    <Chip
                      label={t(status.label, {
                        count,
                        provider: providerLabel(t, provider)
                      })}
                      count={count}
                      tone={status.tone}
                      selected={activeStatus === status.value}
                      onPress={() => chooseStatus(status.value)}
                    />
                  </View>
                );
              }
            )}
          </View>
        ) : null}
      </ScrollView>
      <RailFade side="start" visible={edges.start} />
      <RailFade side="end" visible={edges.end} />
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    position: 'relative',
    flexGrow: 0
  },
  bar: {
    flexGrow: 0
  },
  scopeRow: {
    alignItems: 'flex-start',
    paddingBottom: tokenLength('space-2')
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-2')
  },
  pair: {
    padding: tokenLength('space-1') / 2,
    borderWidth: 1,
    borderColor: tokenColor('control-border'),
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('surface')
  },
  pairInner: {
    flexDirection: 'row',
    gap: tokenLength('space-1') / 2,
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
    height: touchTarget - SEGMENT_INSET,
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
    fontWeight: tokenWeight('weight-medium')
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
    height: tokenLength('space-5'),
    backgroundColor: tokenColor('control-border')
  },
  chips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-2')
  }
});
