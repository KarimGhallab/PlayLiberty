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
    deleteDeferred: 'Deleting playlist',
    replaced: 'The earlier action was replaced.',
    willNotDelete: '“{name}” will not be deleted.',
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
  },
  addPlaylistDialog: {
    title: 'Add a playlist',
    description:
      'Paste a YouTube playlist link. Nothing is downloaded until you sync it.',
    linkLabel: 'Playlist link',
    invalid:
      'Paste a YouTube playlist link, such as https://youtube.com/playlist?list=...',
    add: 'Add',
    adding: 'Adding',
    skip: 'Skip non-music parts',
    skipHint: 'Cut the intros, sponsor reads and outros out of the audio.'
  },
  playerBar: {
    label: 'Player',
    previous: 'Previous track',
    next: 'Next track',
    play: 'Play',
    pause: 'Pause',
    position: 'Position in track',
    positionValue: '{elapsed} of {duration}'
  },
  volume: {
    label: 'Volume',
    mute: 'Mute',
    unmute: 'Unmute',
    notice: 'Volume {percent}%',
    noticeMuted: 'Volume muted, {percent}%'
  },
  emptyState: {
    heading: 'Nothing here yet',
    prose:
      'This playlist has never been synced. Syncing goes to YouTube and downloads the audio of every track in it.',
    promise:
      'A sync takes a few minutes, but once a track is downloaded, a video removed from YouTube will not dropped it from this playlist.',
    sync: 'Sync now',
    syncing: 'Syncing'
  },
  toast: {
    dismiss: 'Dismiss'
  },
  readFailure: {
    retry: 'Try again',
    retrying: 'Trying again'
  },
  notFound: {
    heading: 'This playlist is not here',
    prose:
      'It may have been deleted, or it may belong to someone else and no longer be shared with you.',
    back: 'Back to home'
  },
  header: {
    collab: 'You are a collaborator',
    shared: 'Shared playlist',
    private: 'Private playlist',
    share: 'Share',
    rename: 'Rename',
    syncNow: 'Sync now',
    delete: 'Delete playlist',
    play: 'Play this playlist',
    pause: 'Pause this playlist',
    skipBack: 'Skip back',
    trackNext: 'Track next',
    shuffle: 'Shuffle {name}',
    actions: 'More actions for {name}',
    sharedBy: 'Shared by {name}'
  },
  trackBars: {
    playing: 'Playing',
    paused: 'Paused'
  },
  shuffle: {
    empty: 'Nothing to play in “{name}”.',
    emptyDetail: 'No track in it has finished downloading.',
    unreachable: '“{name}” could not be read.',
    unreachableDetail: 'Its tracks could not be loaded.'
  }
};

export type Messages = typeof en;
