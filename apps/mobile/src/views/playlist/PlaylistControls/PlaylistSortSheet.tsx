import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PlaylistSort } from '@playliberty/contracts';
import { useI18n } from '@playliberty/i18n';

import Sheet from '../../../shared/components/Sheet/Sheet';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  touchTarget
} from '../../../shared/styles/tokens';

import { SORT_OPTIONS } from './sortOptions';

export interface PlaylistSortSheetProps {
  readonly visible: boolean;
  readonly sort: PlaylistSort;
  readonly onSelect: (sort: PlaylistSort) => void;
  readonly onClose: () => void;
}

/* The saved order as three radios; choosing one closes the sheet. */
export default function PlaylistSortSheet({
  visible,
  sort,
  onSelect,
  onClose
}: PlaylistSortSheetProps) {
  const { t } = useI18n();

  return (
    <Sheet
      visible={visible}
      title={t('detail.sortBy')}
      onRequestClose={onClose}
      testID="playlist-sort-sheet"
      backdropTestID="playlist-sort-backdrop">
      {SORT_OPTIONS.map((option, index) => {
        const checked = sort === option.value;

        return (
          <Pressable
            key={option.value}
            testID={option.testID}
            accessibilityRole="radio"
            accessibilityState={{ checked }}
            style={({ pressed }) => [
              styles.row,
              index < SORT_OPTIONS.length - 1 && styles.rule,
              pressed && styles.pressed
            ]}
            onPress={() => onSelect(option.value)}>
            <View style={[styles.radio, checked && styles.radioOn]}>
              {checked ? <View style={styles.dot} /> : null}
            </View>
            <Text style={styles.label}>{t(option.label)}</Text>
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
  radio: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokenColor('control-border'),
    borderRadius: tokenLength('radius-chip')
  },
  radioOn: {
    borderColor: tokenColor('accent')
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('accent')
  },
  label: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-md')
  }
});
