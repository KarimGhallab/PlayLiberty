import { Image, type ImageProps } from 'react-native';

export interface AppImageProps extends ImageProps {
  /** Keeps the source's own pixels, for a crop or a full view. */
  readonly natural?: boolean;
}

/* Every image decodes near the size it is drawn: Android resizes to the view's
 * bounds before the decode, unless the caller needs the natural pixels. */
export default function AppImage({ natural = false, ...rest }: AppImageProps) {
  return <Image {...rest} resizeMethod={natural ? undefined : 'resize'} />;
}
