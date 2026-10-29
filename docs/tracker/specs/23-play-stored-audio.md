# Play stored audio on mobile

Status: ready
Labels: `enhancement`, `ready-for-agent`

## Problem Statement

The server serves stored audio with range support, and the app has no player. The web client's player is one HTML
audio element, a bar over the page, a `sessionStorage` record and the Media Session API; on a phone the bar is a
thumb-reachable overlay, the queue needs a surface of its own, the volume rail is meaningless because the device has
volume buttons, and the browser's media controls are replaced by the operating system's.

The second problem is what a phone does to a queue. Android kills backgrounded apps, a call takes the audio, a
headset is unplugged, and a track can lose its file between the moment it is queued and the moment it is reached.
A player is the one feature whose failures are heard rather than seen, so the behaviours nobody tests by hand are
the ones that matter.

## Solution

One player over one queue, both in the app and never sent to the server. The queue is built from one playlist when a
track is played, holds track ids rather than stream addresses, and is re-applied over every refetch so the list does
not move under the listener. The bar appears with the first track and is absent at rest; it carries the artwork, the
title, the playlist name, previous, play-pause, next, a seek bar and the queue. The queue is a sheet above the bar.
A track with no stored file cannot be played and is skipped rather than allowed to stall the queue. Background
playback, the notification and the lock screen are spec `24`'s.

## User Stories

1. As an account, I want a bar when music starts, so that I can control it from any screen.
2. As an account, I want the bar absent when nothing plays, so that the screen is not paying for an empty control.
3. As an account, I want the bar to name the track and its playlist, so that I know what I started.
4. As an account, I want previous and next, so that I can move within the queue.
5. As an account, I want next disabled at the end, so that I know the queue is over.
6. As an account, I want one play-pause control that morphs, so that its state is obvious.
7. As an account, I want to seek within a track, so that I can skip a long intro.
8. As an account, I want the elapsed time and the duration, so that I know where I am.
9. As an account, I want the seek bar to work with a screen reader, so that I can seek without sight.
10. As an account, I want the device's volume buttons to be the volume, so that the app has no rail I cannot reach.
11. As an account, I want the queue as a sheet, so that I can see what is coming without leaving the screen.
12. As an account, I want the current row marked in the queue, so that I know where I am.
13. As an account, I want to jump to a queued track, so that I can move without pressing next repeatedly.
14. As an account, I want a track that cannot play to be skipped, so that one broken track does not end the session.
15. As an account, I want a track whose file disappeared to be dropped, so that a pruned track does not stall me.
16. As an account, I want a refusal to be explained rather than heard as silence, so that I know what happened.
17. As an account, I want my queue to stay in the playlist's order, so that a refetch does not reshuffle it.
18. As an account, I want a track new to the playlist to be appended, so that a sync does not move what I am hearing.
19. As an account, I want a track removed from the playlist to be dropped, so that the queue follows the list.
20. As an account, I want to start a playlist from any row, so that the queue begins where I pressed.
21. As an account, I want shuffle to start with the track I pressed, so that my press still means something.
22. As an account, I want shuffle to be the queue's order, so that the list and the queue agree.
23. As an account, I want a call to pause the music, so that I am not talking over it.
24. As an account, I want the music to resume after the call, so that I do not have to press play.
25. As an account, I want unplugging my headphones to pause, so that I do not broadcast to the room.
26. As an account, I want a track that fails mid-stream to be skipped, so that the queue keeps going.
27. As an account, I want an expired session to take me to sign-in, so that it is not presented as a broken track.
28. As an account, I want no prefetching, so that my instance is not downloading audio I may skip.
29. As an account, I want one track at a time, so that the queue is predictable.
30. As an account, I want the bar above the list, so that it never covers the last row.
31. As an account with a bare shared track, I want no playlist name and no link, so that the playlist's existence is not revealed.
32. As a screen-reader user, I want the bar's controls named with their track, so that I know what I am pressing.
33. As a French-speaking account, I want the player in French, so that the app stays in my language.

## Implementation Decisions

- **One player over one queue, in the app, never on the server.** No route accepts a position, a play or a skip, and
  the app sends none. `expo-audio` is the player and Zustand holds the queue.
- **The queue holds track ids, not stream addresses.** An address is derived at the moment the track is reached, so a
  revoked share, a re-granted share and a changed edge all take effect on the next track.
- **The queue is one playlist at a time, built from the track that was pressed.** Playing another playlist replaces
  it. A bare track's queue holds one track and no playlist context. `Decided here:` a queue that accumulated across
  playlists would need an interface to explain it, and the product has none.
- **The order the queue was built with is re-applied over every refetch.** A known track keeps its place, a new one
  is appended, and one the read no longer returns is dropped.
- **The bar is an overlay above the bottom inset, and it is absent at rest.** It carries the artwork, the title, the
  playlist name (absent for a bare track), previous, play-pause, next, the seek bar, the elapsed and duration, and
  the queue control. Every screen that scrolls pays its height as bottom padding. `Decided here:` the web's bar rule,
  kept because a bar that covers the last row hides the row the person was reaching for.
- **The transport is the bar's, and the detail's header does not repeat it.** Previous, play-pause and next exist in
  one place. `Decided here:` on a phone the header and the bar would otherwise be the same three controls twice.
- **The queue is a sheet above the bar, not a route.** It lists the queue in its order, marks the current row, and a
  press jumps to that track. `Decided here:` the web has no queue panel because its list is the queue; on a phone the
  list is often off screen, and a sheet is the smallest surface that shows what is coming.
- **The seek bar is a slider with accessibility actions.** It reports the elapsed and total time, and its screen
  reader actions move by ten seconds. `Decided here:` a slider that only works by drag is a control a screen-reader
  user cannot use, and the app has no keyboard to fall back on.
- **There is no volume rail and no mute.** The player runs at full volume, unmuted, and the device's buttons own the
  level. `Decided here:` the web's rail is pointer-only by the design record and is absent under a coarse pointer;
  the app has no pointer, so the rail would be a control that never appears.
- **There are no keyboard chords.** Space, Shift+N, Shift+P, the arrows and M are the web's; the app's transport is
  the bar and, in the background, the system's controls. `Decided here:` the disposition is recorded so nobody ports
  a chord to a device without a keyboard.
- **The OS media controls are spec `24`'s, and they read the same state as the bar.** There is no second copy of the
  current track, the position or the play state.
- **A track is playable when its stored file exists, and the server says so.** The app does not probe and does not
  guess from a duration; the play layer is present exactly when the status says there is something to play.
- **A queue entry whose file has gone is dropped when it is reached, and playback continues.** A track that fails to
  load mid-stream behaves the same way. `Decided here:` a queue that stops on an error is a session over, and the
  listener cannot say which track did it.
- **A refusal is handled by kind.** A `404` drops the track and advances; a `401` is the shell's signed-out state and
  is never drawn as a broken track.
- **Nothing is prefetched, and one track plays at a time.** No overlap, no crossfade, no gapless join.
- **Audio focus is the app's.** A call, another app's audio or an unplugged headset pauses; playback resumes only if
  the app was playing when focus was lost. `Decided here:` the platform's focus contract, kept rather than fought,
  because the alternative is talking over a call.
- **The queue is memory-only.** A relaunch starts with no player. This is spec `19`'s divergence from the web's
  `sessionStorage` record and is not re-decided here.
- **Inherited decisions are referenced, not restated:** the queue's build and merge rules, the playable rule, the
  seek's range request, the no-prefetch rule and the one-track rule are
  [`07-play-stored-audio`](07-play-stored-audio.md)'s; the shuffle's order is
  [`24-shuffle-starts-playback`](../tasks/24-shuffle-starts-playback-and-the-list-mirrors-the-queue.md)'s; the saved
  sort's order is [`12-sort-and-filter-the-track-list`](12-sort-and-filter-the-track-list.md)'s; the bare-track
  context is [`30-share-a-track`](30-share-a-track.md)'s.

## Testing Decisions

- A test earns its place only if it fails when behaviour a listener relies on changes. The tests assert which track
  is current after an advance, that an unplayable track is skipped rather than stopping the queue, that a refetch
  does not reorder the queue, that the bar is absent with an empty queue, and that a `401` is not a playback error.
  They do not assert the bar's height, the morph's timing, or the player library's internals.
- **The queue and the player are tested at the store's seam**, as the web's store is: build from a playlist, replace,
  merge over a refetch, advance at the end, drop a gone track, and the shuffle's order. Prior art is the web's
  `player` and `queueOrder` tests.
- **The bar and the queue sheet are tested at their components' seam**: the absent state, the bare-track shape, the
  controls' availability at the ends, and the sheet's current row. Prior art is the web's `PlayerBar` tests.
- **The critical journey is a Maestro flow**: play a playlist, advance, open the queue, jump to a track, and see the
  bar persist across a navigation.
- **Cut tests:** no test of the seek's pixel mapping, the artwork's fade, or the audio element's buffer.

## Out of Scope

- Background playback, the notification and the lock screen, which spec `24` owns.
- Offline playback and any client-side copy of a track.
- Casting, a second playback device, and synchronising position between clients.
- Gapless playback, crossfading, equalisation, replay gain and any audio processing.
- Scrobbling, play counts, listening history and analytics.
- Reordering the queue, and a queue that accumulates across playlists.
- A volume rail, a mute toggle, and keyboard transport chords.
- Two tracks playing at once, and any prefetch.

## Further Notes

- The queue sheet is the app's one addition to the web's playback surface. It exists because a phone shows one
  screen at a time; it is not a new capability.
- The bar's absence at rest is the web's rule and the reason the app's screens can assume the bottom padding is
  optional.
