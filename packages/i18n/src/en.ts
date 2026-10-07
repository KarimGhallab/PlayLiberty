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
  common: {
    cancel: 'Cancel'
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
  },
  detail: {
    back: 'Back to home',
    addTrack: 'Add a track',
    loadingTracks: 'Loading tracks.',
    readFailed: 'Tracks could not be loaded.',
    noTracks: 'No tracks yet.',
    deleteDeferred: 'Deleting playlist',
    removeDeferred: 'Removing track',
    trackFallback: 'Track',
    settingFailed: 'The setting could not be changed.',
    settingNotice: 'The skip setting was not changed.'
  },
  trackRow: {
    play: 'Play {title}',
    pause: 'Pause {title}',
    actions: 'Actions for {title}',
    retry: 'Retry',
    fetchWhole: 'Fetch whole',
    remove: 'Remove from playlist',
    fullLength: 'Full length'
  },
  skipSetting: {
    label: 'Skip non-music parts'
  },
  renameDialog: {
    title: 'Rename playlist',
    description: 'It does not change the playlist on YouTube.',
    nameLabel: 'Playlist name',
    invalid: 'A name is required, up to 200 characters.',
    save: 'Save',
    saving: 'Saving'
  },
  shareDialog: {
    title: 'Share playlist',
    description:
      'Everyone you share with can find the playlist and hear its tracks. Editing also lets them change what is in it.',
    done: 'Done',
    loading: 'Loading accounts.',
    readFailed: 'Accounts could not be loaded.',
    empty: 'There is no one else here to share with yet.',
    listen: 'Can listen',
    edit: 'Can edit'
  },
  addTrackDialog: {
    title: 'Add a track',
    description:
      'Paste a YouTube video link, then choose the playlists to add it to.',
    videoLabel: 'Video link',
    invalid:
      'Paste a YouTube video link, such as https://youtube.com/watch?v=...',
    add: 'Add',
    adding: 'Adding',
    refusedSome: 'Added to the rest. Not added to:',
    refusedAll: 'Nothing was added. Not added to:'
  }
};

export type Messages = typeof en;
