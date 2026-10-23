/*
 * The source of truth for the `Messages` shape. Keys name the surface and the
 * fact, never the English sentence, so a copy edit does not churn a key.
 */
export const en = {
  app: {
    name: 'PlayLiberty',
    title: {
      playlist: '{app} - {name}',
      track: '{app} - {playlist} ({track})'
    }
  },
  language: {
    label: 'Language',
    english: 'English',
    french: 'Français'
  },
  common: {
    cancel: 'Cancel',
    discardPrompt: 'Discard this link? The link you pasted will be lost.',
    keepEditing: 'Keep editing',
    discard: 'Discard'
  },
  library: {
    add: 'Add a playlist',
    loading: 'Loading playlists.',
    readFailed: 'Playlists could not be loaded.',
    pinned: 'Pinned',
    syncing: 'Syncing',
    scopeAll: 'All',
    scopeShared: 'Shared with me',
    scopeLabel: 'Filter by owner',
    allTracks: 'All tracks',
    pinFailed: 'The pin could not be changed.',
    notDownloaded: {
      one: '{count} track is not stored',
      other: '{count} tracks are not stored'
    },
    syncAll: {
      one: 'Sync 1 playlist',
      other: 'Sync all {count} playlists'
    },
    syncingAll: {
      one: 'Syncing 1 playlist...',
      other: 'Syncing {count} playlists...'
    },
    syncAllStarted: {
      one: 'Started 1 sync',
      other: 'Started {count} syncs'
    },
    syncAllRunning: {
      one: '1 is already running',
      other: '{count} are already running'
    },
    syncAllNone: {
      one: 'The playlist is already syncing',
      other: 'All {count} playlists are already syncing'
    },
    syncAllStopped: 'Sync all stopped',
    deleteDeferred: 'Deleting playlist',
    empty: {
      heading: 'No playlists yet',
      promise:
        'Paste a YouTube playlist link, then sync it. Every stored track is yours from then on, even if the video is taken down later.'
    }
  },
  egress: {
    title: 'VPN settings',
    back: 'Back to home',
    loading: 'Loading the configurations.',
    readFailed: 'The configurations could not be loaded.',
    notAvailable: 'This page is not available.',
    empty: 'No configuration is installed.',
    agentUp: 'Egress agent reachable.',
    agentDown:
      'Egress agent unreachable. The configurations below are the last known states.',
    name: 'Name',
    endpoint: 'Endpoint',
    status: 'Status',
    lastAttempt: 'Last attempt',
    active: 'Active',
    never: 'Never',
    statusOk: 'OK',
    statusFailed: 'Failed',
    statusUnknown: 'Unknown'
  },
  detail: {
    back: 'Back to home',
    addTrack: 'Add a track',
    syncPlaylist: 'Sync the playlist',
    syncingPlaylist: 'Syncing the playlist...',
    loadingTracks: 'Loading tracks.',
    readFailed: 'Tracks could not be loaded.',
    noTracks: 'No tracks yet.',
    loadMore: 'Load more',
    loadMoreLoading: 'Loading...',
    loadMoreRetry: 'Try again',
    playbackFailed: 'Playback could not start: the queue was not loaded.',
    deleteDeferred: 'Deleting playlist',
    removeDeferred: 'Removing track',
    trackFallback: 'Track',
    settingFailed: 'The setting could not be changed.',
    settingNotice: 'The skip setting was not changed.',
    sortBy: 'Sort by',
    sortPlaylist: 'Playlist order',
    sortNewest: 'Newest first',
    sortOldest: 'Oldest first',
    filterBy: 'Filter by',
    filterAll: 'All',
    filterShowAll: 'Show all',
    retryFailed: {
      one: 'Retry 1 failed track',
      other: 'Retry all {count} failed tracks'
    },
    retryingFailed: {
      one: 'Retrying 1 failed track...',
      other: 'Retrying all {count} failed tracks...'
    },
    filterEmpty: {
      stored: 'No stored tracks',
      pending: 'No pending tracks',
      downloading: 'No downloading tracks',
      failed: 'No failed tracks',
      unavailable: 'No unavailable tracks'
    }
  },
  trackRow: {
    play: 'Play {title}',
    pause: 'Pause {title}',
    actions: 'Actions for {title}',
    retry: 'Retry',
    fetchWhole: 'Fetch whole',
    remove: 'Remove from playlist',
    fullLength: 'Full length',
    failure: {
      unavailable: 'This video is no longer available.',
      private: 'This video is private.',
      blocked: 'YouTube blocked this download.',
      network: 'YouTube could not be reached.',
      unknown: 'The download failed.'
    },
    showDetails: 'Show details',
    hideDetails: 'Hide details',
    showDetailsFor: 'Show details for {title}',
    hideDetailsFor: 'Hide details for {title}'
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
  coverDialog: {
    title: 'Playlist cover',
    description: 'JPEG, PNG or WebP, up to 5 MB.',
    choose: 'Choose image',
    wrongType: 'Choose a JPEG, PNG or WebP image.',
    tooLarge: 'Choose an image smaller than 5 MB.',
    uploadFailed: 'The cover could not be saved.',
    remove: 'Remove cover',
    removing: 'Removing',
    removePrompt:
      "Remove the custom cover? The playlist will use its first track's cover.",
    removeFailed: 'The cover could not be removed.',
    save: 'Save',
    saving: 'Saving',
    discardPrompt: 'Discard this image? The image you chose will be lost.',
    cropHint: 'Drag the image or use the arrow keys to move it.',
    zoom: 'Zoom',
    reset: 'Reset'
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
    edit: 'Can edit',
    grantFailed: 'The playlist sharing with {name} has failed.',
    revokeFailed: 'The playlist sharing with {name} could not be removed.'
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
    positionValue: '{elapsed} of {duration}',
    shortcutShift: 'Shift',
    shortcutPrevious: 'P',
    shortcutNext: 'N'
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
      'A sync takes a few minutes, but once a track is stored, a video removed from YouTube will not drop it from this playlist.',
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
    cover: 'Update the cover',
    pin: 'Pin',
    unpin: 'Unpin',
    syncNow: 'Sync now',
    delete: 'Delete',
    play: 'Play this playlist',
    playNamed: 'Play {name}',
    pause: 'Pause this playlist',
    pauseNamed: 'Pause {name}',
    skipBack: 'Skip back',
    trackNext: 'Track next',
    shuffle: 'Shuffle {name}',
    actions: 'More actions for {name}',
    sharedBy: 'Shared by {name}',
    countOf: {
      one: '{shown} of {total} track',
      other: '{shown} of {total} tracks'
    },
    retryPlayback: 'Retry playback',
    retryingPlayback: 'Retrying...'
  },
  trackBars: {
    playing: 'Playing',
    paused: 'Paused'
  },
  start: {
    empty: 'Nothing to play in “{name}”.',
    emptyDetail: 'No track in it has finished downloading.',
    unreachable: '“{name}” could not be read.',
    unreachableDetail: 'Its tracks could not be loaded.'
  },
  problem: {
    playlistNotFound: {
      read: 'The playlist does not exist, or this account cannot see it.',
      write: 'The playlist does not exist, or this account cannot write it.',
      manage: 'The playlist does not exist, or this account cannot manage it.',
      track:
        'The playlist does not exist, this account cannot write it, or the track is not in it.'
    },
    invalidRequest:
      'Paste a YouTube playlist link, such as https://youtube.com/playlist?list=...',
    unprocessableRequest: 'The URL is not a YouTube video URL.',
    validationFailed: 'The request contained an invalid value.'
  },
  relative: {
    justNow: 'just now',
    yesterday: 'yesterday',
    minute: {
      one: '{count} minute ago',
      other: '{count} minutes ago'
    },
    hour: {
      one: '{count} hour ago',
      other: '{count} hours ago'
    },
    day: {
      one: '{count} day ago',
      other: '{count} days ago'
    },
    week: {
      one: '{count} week ago',
      other: '{count} weeks ago'
    },
    month: {
      one: '{count} month ago',
      other: '{count} months ago'
    },
    year: {
      one: '{count} year ago',
      other: '{count} years ago'
    }
  },
  lastSynced: {
    never: 'Never synced',
    synced: 'Synced {time}'
  },
  syncState: {
    upToDate: 'Up to date',
    syncing: 'Syncing',
    failed: 'Sync failed'
  },
  trackState: {
    removedFrom: 'Removed from {provider}',
    stored: 'Stored',
    pending: 'Pending',
    downloading: 'Downloading',
    failed: 'Failed',
    unavailable: 'Unavailable'
  },
  provider: {
    youtube: 'YouTube'
  },
  count: {
    unit: {
      one: 'track',
      other: 'tracks'
    },
    tracks: {
      one: '{count} track',
      other: '{count} tracks'
    }
  },
  syncSummary: {
    kept: {
      one: 'kept',
      other: 'kept'
    },
    added: {
      one: 'added',
      other: 'added'
    },
    removed: {
      one: 'removed',
      other: 'removed'
    },
    failed: {
      one: 'failed',
      other: 'failed'
    },
    lastSync: 'Last sync {time}',
    noChanges: 'Nothing changed',
    downloading: '{count} downloading',
    syncing: 'Syncing'
  },
  syncError: {
    reach: 'Could not reach {provider}, the playlist may not be up to date.',
    safe: {
      one: 'All {count} track is still here and will never be deleted even if the video is removed from {provider}.',
      other:
        'All {count} tracks are still here and will never be deleted even if the videos are removed from {provider}.'
    },
    sync: 'Sync',
    syncing: 'Syncing',
    show: 'Show details',
    hide: 'Hide details'
  }
};

export type Messages = typeof en;
