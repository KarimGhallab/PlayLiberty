import { StyleSheet, Text } from 'react-native';

import type { MessageKey, Messages } from '@playliberty/i18n';
import { useI18n } from '@playliberty/i18n';

import Sheet from '../../../shared/components/Sheet/Sheet';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenNumber
} from '../../../shared/styles/tokens';

export type PlaceholderAction = 'share' | 'rename' | 'cover';

const TITLES: Record<PlaceholderAction, MessageKey<Messages>> = {
  share: 'header.share',
  rename: 'header.rename',
  cover: 'header.cover'
};

export interface PlaylistPlaceholderSheetProps {
  readonly action: PlaceholderAction | null;
  readonly playlistName: string;
  readonly onClose: () => void;
}

/* A named action whose surface a later spec replaces: the sheet says so rather
 * than drawing an empty body. */
export default function PlaylistPlaceholderSheet({
  action,
  playlistName,
  onClose
}: PlaylistPlaceholderSheetProps) {
  const { t } = useI18n();

  return (
    <Sheet
      visible={action !== null}
      title={action === null ? '' : t(TITLES[action])}
      onRequestClose={onClose}
      testID="playlist-placeholder-sheet"
      backdropTestID="playlist-placeholder-backdrop">
      <Text style={styles.body}>{t('playlistActions.arriving')}</Text>
      <Text style={styles.name}>{playlistName}</Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-md'),
    lineHeight: tokenLength('text-md') * tokenNumber('leading-normal'),
    marginTop: tokenLength('space-3')
  },
  name: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    marginTop: tokenLength('space-1')
  }
});
