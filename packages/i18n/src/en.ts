/*
 * The source of truth for the `Messages` shape. Keys name the surface and the
 * fact, never the English sentence, so a copy edit does not churn a key.
 */
export const en = {
  app: {
    name: 'PlayLiberté',
    title: {
      playlist: '{app} - {name}',
      track: '{app} - {playlist} ({track})',
      bareTrack: '{app} - {track}'
    }
  },
  language: {
    label: 'Language',
    english: 'English',
    french: 'Français'
  },
  account: {
    title: 'Account',
    admin: 'Admin',
    loading: 'Loading the account.',
    egress: 'VPN settings',
    signOut: 'Sign out',
    signOutAsk: 'Are you sure you want to sign out?',
    version: 'Version {version}'
  },
  signedOut: {
    title: 'Sign in to enter the app',
    browser: 'Your browser opens to sign in, then brings you back here.',
    action: 'Sign in',
    retry: 'Sign in again',
    busy: 'Signing in…',
    failed: 'Sign-in could not finish.'
  },
  common: {
    back: 'Back',
    close: 'Close',
    cancel: 'Cancel',
    undo: 'Undo',
    moreTime: 'More time',
    discardPrompt: 'Discard this link? The link you pasted will be lost.',
    keepEditing: 'Keep editing',
    discard: 'Discard'
  },
  library: {
    add: 'Add a playlist',
    actions: 'Library actions',
    loading: 'Loading playlists.',
    readFailed: 'Playlists could not be loaded.',
    pinned: 'Pinned',
    syncing: 'Syncing',
    scopeAll: 'All',
    scopeShared: 'Shared',
    scopeLabel: 'Filter by owner',
    allTracks: 'All tracks',
    pinFailed: 'The pin could not be changed.',
    syncFailed: 'The sync could not be started.',
    deleteFailed: 'The playlist could not be deleted.',
    notDownloaded: {
      one: '{count} track is not stored',
      other: '{count} tracks are not stored'
    },
    neverStored: {
      one: '1 track never stored',
      other: '{count} tracks never stored'
    },
    syncAll: {
      one: 'Sync 1 playlist',
      other: 'Sync all {count} playlists'
    },
    syncAllReadOnly: {
      one: '1 read-only playlist is not included',
      other: '{count} read-only playlists are not included'
    },
    syncAllShort: 'Synchronize all',
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
        'Paste a YouTube playlist link, then sync it to listen to its tracks.'
    }
  },
  egress: {
    title: 'VPN settings',
    back: 'Back to home',
    loading: 'Loading the configurations.',
    readFailed: 'The configurations could not be loaded.',
    empty: 'No configuration is installed.',
    agentUp: 'Egress agent reachable.',
    agentDown:
      'Egress agent unreachable. The configurations below are the last known states.',
    name: 'Name',
    endpoint: 'Exit endpoint',
    status: 'Check result',
    lastAttempt: 'Last switch attempt',
    lastCheck: 'Last check',
    switch: 'Switch',
    switching: 'Switching...',
    check: 'Check',
    checking: 'Checking...',
    checkUnreachable: 'The egress agent could not be reached.',
    checkFailed: 'The check could not be completed.',
    toast: {
      switched: 'Switched to {name}.',
      checked: '{name} is active.',
      answered: 'The exit answered YouTube.',
      switchFailed: 'The exit could not be switched.'
    },
    actions: 'Actions',
    seen: 'Provider saw {ip}',
    noEndpoint: 'Not set',
    reason: {
      blocked: 'YouTube refused the exit.',
      unavailable: 'The check video is unavailable.',
      network: 'The exit could not be reached.',
      unknown: 'The check failed.'
    },
    active: 'Active',
    neverAttempted: 'No attempt yet',
    neverChecked: 'Not checked yet',
    statusOk: 'OK',
    statusFailed: 'Failed',
    statusUnknown: 'Unknown'
  },
  detail: {
    back: 'Back to home',
    backShort: 'Back',
    addTrack: 'Add a track',
    fabActions: 'Playlist actions',
    syncPlaylist: 'Sync the playlist',
    syncPlaylistShort: 'Synchronize',
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
    deleteFailed: 'The playlist could not be deleted.',
    removeFailed: 'The track could not be removed.',
    trackFallback: 'Track',
    settingFailed: 'The setting could not be changed.',
    settingNotice: 'The skip setting was not changed.',
    sortFailed: 'The sort could not be changed.',
    sortNotice: 'The sort was not changed.',
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
      unavailable: 'No track was left without a copy',
      remoteRemoved: 'No track was retained after a {provider} removal'
    }
  },
  trackRow: {
    play: 'Play {title}',
    pause: 'Pause {title}',
    actions: 'Actions for {title}',
    copyLink: 'Copy link',
    linkCopied: 'Link copied',
    linkCopyFailed: 'The link could not be copied.',
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
  trackLink: {
    cannotPlay: '{title} cannot play.',
    loading: 'Opening the track.',
    notStored: 'It is not stored yet.',
    downloadFailed: 'Its download failed.',
    unavailableDetail: 'Its video is gone and no file was stored.',
    unknown: 'This track is not available.',
    unknownDetail:
      'The link may be broken, or the track may have been deleted.',
    leftPlaylist: '{title} is no longer in that playlist.',
    leftPlaylistDetail: 'It is playing on its own.'
  },
  skipSetting: {
    label: 'Skip non-music parts'
  },
  renameDialog: {
    title: 'Rename playlist',
    description: 'It does not change the playlist on YouTube.',
    nameLabel: 'Playlist name',
    invalid: 'A name is required, up to 200 characters.',
    failed: 'The playlist could not be renamed.',
    save: 'Save',
    saving: 'Saving'
  },
  coverDialog: {
    title: 'Playlist cover',
    description: 'JPEG, PNG or WebP, up to 5 MB.',
    choose: 'Choose image',
    pickFailed: 'The photo library could not be opened.',
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
    pickerTitle: 'Choose an account',
    add: 'Add',
    noAccounts: 'There is no other account to share with.',
    description:
      'Everyone you share with can find the playlist and hear its tracks. Editing also lets them change what is in it.',
    done: 'Done',
    loading: 'Loading accounts.',
    readFailed: 'Accounts could not be loaded.',
    empty: 'There is no one else here to share with yet.',
    private: 'Nobody else can see this playlist. It is private.',
    revoke: 'Revoke',
    revokeAsk: 'Remove access to this playlist?',
    remove: 'Remove access',
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
    playlistsLabel: 'Playlists',
    firstPage: 'Only the first {count} playlists in the library are listed.',
    outcomeAdded: 'Added',
    outcomePresent: 'Already there',
    outcomeRefused: 'Refused',
    failed: 'The track could not be added.',
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
    playNamed: 'Play {title}',
    pauseNamed: 'Pause {title}',
    previousNamed: 'Previous track, {title}',
    nextNamed: 'Next track, {title}',
    openPlaylist: 'Open {name}, {position}',
    seekForward: 'Forward ten seconds',
    seekBackward: 'Back ten seconds',
    failed: 'Playback failed: {title}',
    failedDetail: 'Play it again to retry, or choose another track.',
    notificationRefused: 'Allow notifications to control the tracks.',
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
  notFoundPage: {
    code: '404',
    heading: 'Page not found',
    prose: 'The page you are looking for does not exist.',
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
    sync: 'Sync',
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
    validationFailed: 'The request contained an invalid value.',
    invalidGrant: 'The sign-in link is no longer valid. Start again.',
    provisioningUnavailable: 'Sign-in is not configured on this instance.',
    provisioningFailed: 'The instance could not issue a token. Try again.',
    rateLimited: 'Too many attempts. Wait a minute and try again.'
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
    failed: 'Sync failed',
    blocked: 'Source unreachable'
  },
  trackState: {
    retained: 'Retained',
    retainedChip: {
      one: 'Retained',
      other: 'Retained'
    },
    removedFrom: 'Removed from {provider}',
    stored: 'Stored',
    pending: 'Pending',
    downloading: 'Downloading',
    failed: 'Failed',
    unavailable: 'Never stored',
    unavailableChip: {
      one: 'Never stored',
      other: 'Never stored'
    }
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
    retained: {
      one: '1 track removed from {provider} is still stored',
      other: '{count} tracks removed from {provider} are still stored'
    },
    syncing: 'Syncing',
    cancel: 'Cancel sync',
    cancelling: 'Cancelling...',
    cancelled: 'Sync cancelled',
    cancelFailed: 'Could not cancel the sync'
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
