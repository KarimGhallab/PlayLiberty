/*
 * The English catalog and the source of truth for the `Messages` shape. `fr` is
 * typed as `Messages`, so a key missing from French is a compile error rather
 * than a runtime fallback, and the catalog needs no parity test.
 *
 * Keys are symbolic and hierarchical: a key names the surface and the fact, not
 * the English sentence, so a copy edit does not churn a key.
 */
export const en = {
  app: {
    name: 'PlayLiberty'
  },
  language: {
    label: 'Language',
    english: 'English',
    french: 'Français'
  },
  library: {
    add: 'Add a playlist',
    loading: 'Loading playlists.',
    readFailed: 'Playlists could not be loaded.',
    empty: {
      heading: 'No playlists yet',
      promise:
        'Paste a YouTube playlist link, then sync it. Every track you download is yours from then on, even if the video is taken down later.'
    },
    trackCount: {
      one: '{count} track',
      other: '{count} tracks'
    }
  }
};

export type Messages = typeof en;
