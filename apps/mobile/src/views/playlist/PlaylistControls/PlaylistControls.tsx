import { IconArrowsSort, IconChevronDown } from '@tabler/icons-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollViewInstance
} from 'react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type {
  PlaylistSort,
  Provider,
  TrackFileStatusCounts,
  TrackFilterState
} from '@playliberty/contracts';
import { providerLabel, useI18n } from '@playliberty/i18n';
import {
  statusChipCount,
  totalStatusCount,
  visibleStatusChips
} from '@playliberty/ui-foundation';

import { useReduceMotion } from '../../../shared/a11y/useReduceMotion/useReduceMotion';
import Chip from '../../../shared/components/Chip';
import { RailFade, useRailEdges } from '../../../shared/components/RailFade';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenNumber,
  tokenWeight,
  touchTarget
} from '../../../shared/styles/tokens/tokens';

import PlaylistSortSheet from './PlaylistSortSheet';
import { sortLabelKey } from './sortOptions';

type ChipKey = TrackFilterState | 'all';

interface ChipRect {
  readonly x: number;
  readonly width: number;
}

export interface PlaylistControlsProps {
  readonly sort: PlaylistSort;
  readonly canEdit: boolean;
  readonly shuffled: boolean;
  readonly saving: boolean;
  readonly counts: TrackFileStatusCounts;
  readonly remoteRemoved: number;
  readonly provider: Provider;
  readonly active: TrackFilterState | null;
  readonly onSortChange: (sort: PlaylistSort) => void;
  readonly onFilterChange: (status: TrackFilterState | null) => void;
}

/* The rail's shape while the playlist read lands, so the chips and the first
 * row resolve where the skeleton held them. */
export function PlaylistControlsSkeleton() {
  return (
    <View testID="playlist-controls-skeleton" style={styles.skeletonRail}>
      <View style={[styles.skeletonLine, styles.skeletonSort]} />
      <View style={styles.skeletonDivider} />
      <View
        style={[styles.skeletonChip, { width: tokenLength('space-9') * 2 }]}
      />
      <View style={[styles.skeletonChip, { width: tokenLength('space-9') }]} />
    </View>
  );
}

/* The sort control, a rule, then the whole-playlist chips; both step aside while
 * the queue's shuffled order is on screen. */
export default function PlaylistControls({
  sort,
  canEdit,
  shuffled,
  saving,
  counts,
  remoteRemoved,
  provider,
  active,
  onSortChange,
  onFilterChange
}: PlaylistControlsProps) {
  const { t } = useI18n();
  const reduceMotion = useReduceMotion();
  const [open, setOpen] = useState(false);
  const rail = useRef<ScrollViewInstance>(null);
  const railOffset = useRef(0);
  const railViewport = useRef(0);
  const chipsLeft = useRef(0);
  const chipRects = useRef(new Map<ChipKey, ChipRect>());
  const { edges, ...edgeHandlers } = useRailEdges();
  const total = totalStatusCount(counts);
  const sortDisabled = !canEdit || saving || shuffled;

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

      if (x < offset + margin) {
        rail.current?.scrollTo({
          x: Math.max(0, x - margin),
          animated: animate && !reduceMotion
        });
      } else if (x + rect.width > offset + viewport - margin) {
        rail.current?.scrollTo({
          x: x + rect.width - viewport + margin,
          animated: animate && !reduceMotion
        });
      }
    },
    [reduceMotion]
  );

  /* The default chip stays put; only a chosen or restored filter is brought
   * back into view. A restored one is revealed on its first measurement. */
  useEffect(() => {
    if (active !== null) {
      revealChip(active, true);
    }
  }, [active, revealChip]);

  const readViewport = (event: LayoutChangeEvent): void => {
    railViewport.current = event.nativeEvent.layout.width;
    edgeHandlers.onLayout(event);
  };

  const readRail = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    railOffset.current = event.nativeEvent.contentOffset.x;
    edgeHandlers.onScroll(event);
  };

  const rememberChip = (key: ChipKey) => (event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    chipRects.current.set(key, { x, width });

    if (key === active) {
      revealChip(key, false);
    }
  };

  return (
    <View testID="playlist-controls" style={styles.controls}>
      <ScrollView
        ref={rail}
        testID="playlist-filter-rail"
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.rail}
        contentContainerStyle={styles.railContent}
        onLayout={readViewport}
        onContentSizeChange={edgeHandlers.onContentSizeChange}
        onScroll={readRail}
        scrollEventThrottle={16}>
        <Pressable
          testID="detail-sort"
          accessibilityRole="button"
          accessibilityLabel={`${t('detail.sortBy')}: ${t(sortLabelKey(sort))}`}
          accessibilityState={{ disabled: sortDisabled }}
          disabled={sortDisabled}
          style={({ pressed }) => [
            styles.sort,
            sortDisabled && styles.disabled,
            pressed && !sortDisabled && styles.pressed
          ]}
          onPress={() => setOpen(true)}>
          <IconArrowsSort
            size={tokenLength('icon-sm')}
            color={tokenColor('muted')}
          />
          <Text style={styles.prefix}>{t('detail.sortBy')}</Text>
          <Text numberOfLines={1} style={styles.value}>
            {t(sortLabelKey(sort))}
          </Text>
          <IconChevronDown
            size={tokenLength('icon-sm')}
            color={tokenColor('muted')}
          />
        </Pressable>

        <View testID="playlist-filter-divider" style={styles.divider} />

        <View
          testID="playlist-chips"
          accessibilityRole="radiogroup"
          accessibilityLabel={t('detail.filterBy')}
          style={styles.chips}
          onLayout={event => {
            chipsLeft.current = event.nativeEvent.layout.x;
          }}>
          <View onLayout={rememberChip('all')}>
            <Chip
              testID="filter-all"
              label={t('detail.filterAll')}
              count={total}
              selected={active === null}
              disabled={shuffled}
              onPress={() => onFilterChange(null)}
            />
          </View>
          {visibleStatusChips(counts, remoteRemoved, active).map(chip => {
            const count = statusChipCount(chip, counts, remoteRemoved);

            return (
              <View
                key={chip.value}
                testID={`filter-chip-${chip.value}`}
                onLayout={rememberChip(chip.value)}>
                <Chip
                  testID={`filter-${chip.value}`}
                  label={t(chip.label, {
                    count,
                    provider: providerLabel(t, provider)
                  })}
                  count={count}
                  tone={chip.tone}
                  selected={active === chip.value}
                  disabled={shuffled}
                  onPress={() => onFilterChange(chip.value)}
                />
              </View>
            );
          })}
        </View>
      </ScrollView>
      <RailFade side="start" visible={edges.start} />
      <RailFade side="end" visible={edges.end} />
      <PlaylistSortSheet
        visible={open}
        sort={sort}
        onClose={() => setOpen(false)}
        onSelect={chosen => {
          setOpen(false);

          if (chosen !== sort) {
            onSortChange(chosen);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  controls: {
    position: 'relative'
  },
  skeletonRail: {
    height: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-2')
  },
  skeletonLine: {
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('surface-raised')
  },
  skeletonSort: {
    width: tokenLength('space-9') * 1.5,
    height: tokenLength('space-3')
  },
  skeletonDivider: {
    width: 1,
    height: tokenLength('space-5'),
    backgroundColor: tokenColor('line')
  },
  skeletonChip: {
    height: tokenLength('control-height'),
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('surface-raised')
  },
  rail: {
    flexGrow: 0
  },
  railContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-2'),
    paddingRight: tokenLength('space-4')
  },
  sort: {
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-2'),
    borderRadius: tokenLength('radius-control')
  },
  divider: {
    width: 1,
    height: tokenLength('space-5'),
    backgroundColor: tokenColor('control-border')
  },
  pressed: {
    backgroundColor: tokenColor('surface-raised')
  },
  disabled: {
    opacity: tokenNumber('opacity-disabled')
  },
  prefix: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-sm')
  },
  value: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: tokenWeight('weight-semibold')
  },
  chips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-2')
  }
});
