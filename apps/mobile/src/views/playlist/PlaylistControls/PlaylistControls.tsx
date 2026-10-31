import { IconArrowsSort, IconChevronDown } from '@tabler/icons-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TrackFileStatus } from '@playliberty/contracts';
import type {
  PlaylistSort,
  TrackFileStatusCounts
} from '@playliberty/contracts';
import { useI18n } from '@playliberty/i18n';

import Chip from '../../../shared/components/Chip/Chip';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenNumber,
  touchTarget
} from '../../../shared/styles/tokens';
import {
  STATUS_CHIPS,
  totalStatusCount
} from '../../../shared/trackState/statusChips';

import PlaylistSortSheet from './PlaylistSortSheet';
import { sortLabelKey } from './sortOptions';

export interface PlaylistControlsProps {
  readonly sort: PlaylistSort;
  readonly canEdit: boolean;
  readonly shuffled: boolean;
  readonly saving: boolean;
  readonly counts: TrackFileStatusCounts;
  readonly active: TrackFileStatus | null;
  readonly onSortChange: (sort: PlaylistSort) => void;
  readonly onFilterChange: (status: TrackFileStatus | null) => void;
}

/* The detail's one rail below the identity: the saved order then the
 * whole-playlist chips, scrolling sideways like the gallery's rail. Both step
 * aside while the queue's shuffled order is on screen. */
export default function PlaylistControls({
  sort,
  canEdit,
  shuffled,
  saving,
  counts,
  active,
  onSortChange,
  onFilterChange
}: PlaylistControlsProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const total = totalStatusCount(counts);
  const sortDisabled = !canEdit || saving || shuffled;

  return (
    <View testID="playlist-controls">
      <ScrollView
        testID="playlist-filter-rail"
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.rail}
        contentContainerStyle={styles.railContent}>
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
          style={styles.chips}>
          <Chip
            testID="filter-all"
            label={t('detail.filterAll')}
            count={total}
            selected={active === null}
            disabled={shuffled}
            onPress={() => onFilterChange(null)}
          />
          {STATUS_CHIPS.map(chip => (
            <Chip
              key={chip.value}
              testID={`filter-${chip.value}`}
              label={t(chip.label)}
              count={counts[chip.value]}
              tone={chip.tone}
              selected={active === chip.value}
              disabled={shuffled}
              onPress={() => onFilterChange(chip.value)}
            />
          ))}
        </View>
      </ScrollView>

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
    paddingHorizontal: tokenLength('space-3'),
    borderRadius: tokenLength('radius-control')
  },
  divider: {
    width: 1,
    height: 20,
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
    fontWeight: '600'
  },
  chips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-2')
  }
});
