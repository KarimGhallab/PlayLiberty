import { IconCheck } from '@tabler/icons-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PlaylistSort } from '@playliberty/contracts';
import { useI18n } from '@playliberty/i18n';

import Sheet from '../../../shared/components/Sheet/Sheet';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenWeight,
  touchTarget
} from '../../../shared/styles/tokens/tokens';

import { SORT_OPTIONS } from './sortOptions';

export interface PlaylistSortSheetProps {
  readonly visible: boolean;
  readonly sort: PlaylistSort;
  readonly onSelect: (sort: PlaylistSort) => void;
  readonly onClose: () => void;
}

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
      closeLabel={t('common.close')}
      testID="playlist-sort-sheet"
      backdropTestID="playlist-sort-backdrop">
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t('detail.sortBy')}>
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
              <View style={styles.mark}>
                {checked ? (
                  <IconCheck
                    size={tokenLength('icon-sm')}
                    color={tokenColor('accent')}
                  />
                ) : null}
              </View>
              <Text style={[styles.label, checked && styles.labelOn]}>
                {t(option.label)}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
  mark: {
    width: tokenLength('icon-md'),
    height: tokenLength('icon-md'),
    alignItems: 'center',
    justifyContent: 'center'
  },
  label: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-md')
  },
  labelOn: {
    fontWeight: tokenWeight('weight-medium')
  }
});
