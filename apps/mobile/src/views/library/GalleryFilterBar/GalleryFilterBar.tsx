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
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

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

const FADE_WIDTH = tokenLength('space-6');

interface SegmentRect {
  readonly x: number;
  readonly width: number;
}

interface RailEdges {
  readonly start: boolean;
  readonly end: boolean;
}

interface RailMetrics {
  x: number;
  width: number;
  viewport: number;
}

interface RailFadeProps {
  readonly side: 'start' | 'end';
  readonly visible: boolean;
}

/* The rail's hidden edge: the ground fades over what the scroll cut, so the rail
 * reads as continuing rather than as a clipped chip. */
function RailFade({ side, visible }: RailFadeProps) {
  const reduceMotion = useReduceMotion();
  const reveal = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      reveal.setValue(visible ? 1 : 0);
      return;
    }

    const animation = Animated.timing(reveal, {
      toValue: visible ? 1 : 0,
      duration: tokenDuration('motion-base'),
      easing: Easing.bezier(...standardEasingBezier),
      useNativeDriver: true
    });
    animation.start();

    return () => animation.stop();
  }, [reduceMotion, reveal, visible]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.fade,
        side === 'start' ? styles.fadeStart : styles.fadeEnd,
        { opacity: reveal }
      ]}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={`rail-fade-${side}`} x1="0" y1="0" x2="1" y2="0">
            <Stop
              offset="0"
              stopColor={tokenColor('bg')}
              stopOpacity={side === 'start' ? 1 : 0}
            />
            <Stop
              offset="1"
              stopColor={tokenColor('bg')}
              stopOpacity={side === 'start' ? 0 : 1}
            />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#rail-fade-${side})`} />
      </Svg>
    </Animated.View>
  );
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
  const [edges, setEdges] = useState<RailEdges>({
    start: false,
    end: false
  });
  const metrics = useRef<RailMetrics>({ x: 0, width: 0, viewport: 0 });
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

  /* The fade follows the rail, not the content: a side reports only while
   * something is still hidden there. */
  const railMoved = (next: Partial<RailMetrics>): void => {
    const current = { ...metrics.current, ...next };
    metrics.current = current;
    const start = current.x > 1;
    const end =
      current.viewport > 0 && current.x + current.viewport < current.width - 1;
    setEdges(previous =>
      previous.start === start && previous.end === end
        ? previous
        : { start, end }
    );
  };

  return (
    <View style={styles.rail}>
      <ScrollView
        testID="gallery-filter-bar"
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.bar}
        contentContainerStyle={styles.content}
        scrollEventThrottle={16}
        onLayout={event =>
          railMoved({ viewport: event.nativeEvent.layout.width })
        }
        onContentSizeChange={width => railMoved({ width })}
        onScroll={event => railMoved({ x: event.nativeEvent.contentOffset.x })}>
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
  fade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: FADE_WIDTH
  },
  fadeStart: {
    left: 0
  },
  fadeEnd: {
    right: 0
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
