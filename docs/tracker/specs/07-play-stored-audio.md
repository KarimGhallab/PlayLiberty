# Play stored audio

Status: resolved
Labels: `enhancement`

## Problem Statement

The server can already serve a stored track over HTTP with range support, and the web client cannot play it. A
player store and a single audio element exist in the scaffold and nothing fills the queue, so the design
system's most persistent component, the player bar, has nothing behind it. The queue exists as a word in the
glossary and as client state, with no state transitions and no surface.

The decisions that matter here are not the transport, which is built, but the ones a player forces that the
rest of the product has not had to answer. Playback state is per client, so somebody has to decide what
persists across a reload and what is thrown away when the tab closes. A refetch of a playlist arrives on a
timer and on focus, and it must not rearrange what somebody is listening to. A track can lose its file, or its
share can be revoked, between the moment it is queued and the moment it is reached. And a player is the one
feature whose failures are heard rather than seen, which means the behaviours nobody will test by hand are the
ones that matter.

## Solution

The web client runs one player over one queue, both held on the client and never sent to the server. The queue
is built from one playlist at the time a track is played, holds track ids rather than stream addresses, and
survives a reload. The order the queue was built with is re-applied over every refetch, so the list the
listener is playing along does not move under them. A track with no stored file cannot be played, is not
offered where a control would be, and is skipped rather than allowed to stall the queue. What is playing is
reflected in the browser's own media controls, from the same state.

## Implementation Decisions

- **The client is the web client.** This corpus is web and server only, so every clause below is the browser's
  arrangement: one HTML audio element, `sessionStorage`, and the Media Session API. Mobile playback is not part
  of this set and nothing here is written to leave room for it beyond the shape the state already has.
- **Playback state lives on the client and is never sent to the server.** The glossary settles this: the queue
  is per-client state, and the product settles the rest by promising that playback state is per client. No
  route accepts a position, a play, or a skip, and the client sends none.
- **The queue holds track ids, not stream addresses, and the playlist it was built from.** An address is
  derived from the track id at the moment the track is reached, so a revoked share, a re-granted share and a
  changed edge configuration all take effect on the next track rather than on the next launch.
- **The order the queue was built with is re-applied over every refetch.** A playlist reloads on a timer, on
  focus and after a sync, and a refetch that reordered the queue would move the music under somebody. The queue
  merges by track id: a known track keeps its place, a track new to the queue is appended, and a track the
  refetch no longer returns is dropped. The playlist's own order is what the queue is built from, because no
  control reorders a queue in v1.
- **The persisted state is the queue, its order, the index of the current track and the offset within it,** and
  a reload resumes at that offset. _Decided here:_ the alternative, persisting only the queue and starting at
  the beginning of the current track, resumes the list and loses the place, which is the part people notice.
- **Web persists in session storage, with throttled writes and a flush before the tab goes away.** The queue is
  per tab: a reload resumes it, and closing the tab discards it, so one tab's player never leaks into another.
  Writes are throttled and flushed on `pagehide` and on a hidden tab, so a reload does not lose the last few
  seconds. The scaffold already has this store; this spec is what it is for.
- **The queue is one playlist at a time.** Playing any track builds the queue from that track's playlist,
  starting at that track, and replaces whatever was queued. Playing something in another playlist replaces it
  again. _Decided here:_ a queue that accumulated across playlists would have to be explained in the interface,
  and the track list has room for one list and its heading.
- **A track entry records the playlist it came from,** so the player can name where the music is coming from and
  so a listener who opens a playlist can recognise the queue they started there.
- **A track is playable when its stored file exists, and that is a fact the server sends.** The client does not
  probe, does not guess from a duration, and does not keep its own copy of whether a file arrived. The track
  list carries the file status, and the play control is present exactly when the status says there is something
  to play. A control that is visible and cannot be pressed is a fault in its own right.
- **A queue entry whose file has gone is dropped when it is reached,** and playback continues to the next one. A
  track that fails to load mid-queue behaves the same way, so one broken track ends nothing. _Decided here:_ a
  queue that stops on an error is a session over, and the listener has no way to say which track did it.
- **A refusal to play a track is handled by kind.** A track that is not found is dropped and the queue advances,
  which is what a revoked share or a pruned track looks like. A request the edge refuses because the session
  has expired is not a playback error: it takes the client to the edge's own sign-in, by the web client's
  re-authentication path, which is [`09-keep-the-screens-current`](09-keep-the-screens-current.md)'s. The
  player never presents an expired session as a broken track.
- **Seeking is a range request against the stream route, and the stored audio is faststart so that a seek does
  not need the end of the file.** The server side of this is already built and needs nothing from this spec
  beyond being used.
- **Nothing is prefetched.** The next track is requested when the current one ends, not before, so a listener
  who skips a track has not already paid to download it, and the instance is not holding open connections for
  audio nobody will hear. _Decided here:_ prefetching is a bandwidth decision with no customer, on an instance
  that is rate limited by its source.
- **One track plays at a time.** No overlap, no crossfade, no gapless join. _Decided here:_ the product is a
  dependable gallery, and every one of those is a feature rather than a default.
- **The browser's own controls are driven from the same player state,** being the Media Session API on web,
  behind feature detection and never allowed to throw past the player. What the browser shows is what the
  player state says, never a second copy of it. A browser that lacks the API loses the controls and nothing
  else.
- **The player bar is the only persistent surface, and the track list is the queue.** The playlist detail's
  track list is where the queue is seen and where a track is chosen; there is no separate queue panel and no
  route for one. The player bar appears when something is playing and is absent at rest.
- **A track held by two playlists is one file and one stream address,** and the queue plays the same audio
  either way. The deduplication that makes this true is a property of the media store, and the player simply
  never knows there was a second playlist.
- **Inherited constraints are owned by the architecture and not restated here:** no transcoding and the stored media as what plays ([Audio is stored as-is, never transcoded](../../ARCHITECTURE.md#audio-is-stored-as-is-never-transcoded)), identity from the forwarded edge headers and fail-closed ([Identity comes from Pangolin's forwarded headers](../../ARCHITECTURE.md#identity-comes-from-pangolins-forwarded-headers)), and the client header with the origin check ([Mutating requests carry a client header and pass origin checks](../../ARCHITECTURE.md#mutating-requests-carry-a-client-header-and-pass-origin-checks)).

## Out of Scope

- Offline playback, and any client-side copy of a track. Offline is out of scope in v1 by the glossary.
- Casting, and any second playback device.
- Scrobbling, play counts, listening history, a last-played field, and any analytics. Playing a track writes
  nothing, which forecloses all of them by construction rather than by policy.
- Gapless playback, crossfading, equalisation, replay gain, and any audio processing.
- Two tracks playing at once.
- The queue as a route, as a screen, or as anything the server knows about.
- Download, export, and any endpoint that hands over a file rather than a stream.
- The server's stream route and its authorisation, which already exist; the authorisation is settled by
  [`05-share-a-playlist`](05-share-a-playlist.md).
- Editing tags, titles, or artwork, which belong to the source.
- Synchronising playback position between clients. It is per client, so two devices are two sessions.
- Reordering the queue. No control is designed for it, and the order is the playlist's.
