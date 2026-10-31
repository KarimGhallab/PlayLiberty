import { IconPlus } from '@tabler/icons-react-native';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tokenColor, tokenLength } from '../../../shared/styles/tokens';

export interface GalleryAddActionProps {
  readonly label: string;
  readonly onPress: () => void;
  /* The padded screens place it themselves; this keeps it off a bare edge. */
  readonly horizontalInset?: number;
  /** Space the action must clear under it, such as the player bar. */
  readonly bottomOffset?: number;
  readonly testID?: string;
}

/** The circle's box, which the gallery clears under the last row. */
export const galleryAddActionSize =
  tokenLength('space-9') + tokenLength('space-2');

/* The phone's add control: one round plus over the grid, bottom-right, where a
 * thumb reaches it. An empty gallery draws its own labelled action instead. */
export default function GalleryAddAction({
  label,
  onPress,
  horizontalInset = 0,
  bottomOffset = 0,
  testID = 'gallery-add'
}: GalleryAddActionProps) {
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.action,
        {
          right: horizontalInset,
          bottom: insets.bottom + tokenLength('space-4') + bottomOffset
        },
        pressed && styles.pressed
      ]}
      onPress={onPress}>
      <IconPlus size={tokenLength('icon-lg')} color={tokenColor('bg')} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    position: 'absolute',
    width: galleryAddActionSize,
    height: galleryAddActionSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokenColor('accent'),
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('accent')
  },
  pressed: {
    backgroundColor: tokenColor('accent-hover'),
    borderColor: tokenColor('accent-hover')
  }
});
