import type { FlatListProps } from 'react-native';

/* One rule for every vertical list: the platform scrollbar stays hidden, and
 * each row's own rule and the content edge carry the position. */
export const verticalListChrome = {
  showsVerticalScrollIndicator: false
} satisfies Pick<FlatListProps<unknown>, 'showsVerticalScrollIndicator'>;
