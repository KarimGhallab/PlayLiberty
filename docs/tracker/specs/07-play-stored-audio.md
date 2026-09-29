# Play stored audio

Status: agreed
Labels: `enhancement`, `ready-for-agent`

## Problem Statement

The server can already serve a stored track over HTTP with range support, and nothing plays it. There is no
client, so there is no player, and the design system's most persistent component, the player bar that is
present on every screen of both clients, has nothing behind it. The queue exists as a word in the glossary
and as a panel in a design record, with no state and no surface.

The decisions that matter here are not the transport, which is built, but the ones a player forces that the
rest of the product has not had to answer. Playback state is per client, so somebody has to decide what
persists and what is thrown away on a relaunch. A refetch of a playlist arrives on a timer and on focus,
and it must not rearrange what somebody is listening to. A track can lose its file, or its share can be
revoked, between the moment it is queued and the moment it is reached. And a player is the one feature whose
failures are heard rather than seen, which means the behaviours nobody will test by hand are the ones that
matter.

## Solution

Each client runs one player over one queue, both held on the client and never sent to the server. The queue
is built from one playlist at the time a track is played, holds track ids rather than stream addresses, and
survives a relaunch. The order the listener sets is re-applied over every refetch, so the list they are
listening along never moves under them. A track with no stored file cannot be played, is not offered where a
control would be, and is skipped rather than allowed to stall the queue. What is playing is reflected in the
platform's own controls, from the same state, on both clients.

## User Stories

1. As a listener, I want to press play on a track and hear it, so that the shelf is a player and not a list.
2. As a listener, I want the whole playlist to become the queue, so that the music continues without me
   choosing each track.
3. As a listener, I want to start from the track I pressed rather than from the top, so that a long list is
   usable.
4. As a listener, I want to skip forward and back within the queue, so that I control what I hear next.
5. As a listener, I want to see what is playing and what is next, so that I know where I am in the list.
6. As a listener, I want to see progress through the current track, so that I can judge how long is left.
7. As a listener, I want to seek within a track, so that a long track is navigable.
8. As a listener, I want seeking to be immediate, so that I do not wait for the file to arrive.
9. As a listener, I want to pause and resume without losing my place, so that I can stop and come back.
10. As a listener, I want to change the volume, so that the player obeys the room I am in.
11. As a listener, I want the player to keep playing while I browse to another playlist, so that the music
    does not stop when I look at something else.
12. As a listener, I want the music to keep playing when the screen is locked or I switch apps, so that it is
    a player and not a browser tab.
13. As a listener, I want the lock screen to show the track and let me control it, so that I do not have to
    open the app.
14. As a listener, I want the browser's media controls to show the track, so that the tab behaves like a
    player.
15. As a listener, I want the queue to survive closing and reopening the app, so that a session is not
    forgotten.
16. As a listener, I want to come back to the same spot in a track, so that resuming is resuming.
17. As a listener, I want a list refreshing while I listen not to change the order, so that the queue is mine.
18. As a listener, I want a track with no audio yet to show no play control rather than a dead one, so that
    nothing on screen lies about what I can hear.
19. As a listener, I want a track that has left the source to still play, so that the product's promise holds
    at the moment it is tested.
20. As a listener, I want the queue to move past a track that turns out to be unplayable, so that one broken
    track does not end the session.
21. As a listener, I want to be sent to sign in again if my access has expired, so that an expired session is
    not a silent failure.
22. As a listener, I want exactly one track playing at a time, so that two songs do not talk over each other.
23. As a member of a household, I want a track my partner added to hear the same file as mine, so that
    playback is not a second copy.
24. As a member of a household, I want a shared playlist to play for me, so that a read share is worth having.
25. As a listener, I want the queue to show which playlist it came from, so that I know what I am hearing.
26. As a listener, I want to replace the queue by playing something else, so that the old list does not follow
    me around.
27. As a listener, I want the player to be there on every screen, so that I never have to go back to play.
28. As an operator, I want playing a track to write nothing to the server, so that the instance records no
    listening history.
29. As an operator, I want the media store to be the only thing ever played, so that the instance never
    depends on a source being reachable at play time.

## Implementation Decisions

- **Playback state lives on the client and is never sent to the server.** The glossary settles this: the
  queue is per-client state, and the product settles the rest by promising that playback state is per client.
  No route accepts a position, a play, or a skip, and no client sends one.
- **The queue holds track ids, not stream addresses, and the playlist it was built from.** An address is
  derived from the track id at the moment the track is reached, so a revoked share, a re-granted share and a
  changed edge configuration all take effect on the next track rather than on the next launch. It also
  matters on the phone, where a stream request carries the access token as a header and a stored address
  would have to carry a credential with it.
- **The order the listener sets is re-applied over every refetch.** A playlist reloads on a timer, on focus
  and after a sync, and a refetch that reordered the queue would move the music under somebody. A refetch
  updates what is known about the tracks and never where they sit in the queue.
- **The persisted state is the queue, its order, the index of the current track and the offset within it,**
  and a relaunch resumes at that offset. _Decided here:_ the alternative, persisting only the queue and
  starting at the beginning of the current track, resumes the list and loses the place, which is the part
  people notice.
- **Web persists in local storage and mobile in the platform's own asynchronous store.** Writes are throttled
  and flushed on the events that precede a close, so a relaunch does not lose the last few seconds.
  _Decided here, with a gap:_ the web side is already in the web scaffold's scope, and the mobile scaffold
  covers a player store but not its persistence. Whoever cuts the mobile player ticket must either add the
  store or record the omission, and the omission is visible: without it the queue does not survive a relaunch
  on the phone.
- **The queue is one playlist at a time.** Playing any track builds the queue from that track's playlist,
  starting at that track, and replaces whatever was queued. Playing something in another playlist replaces it
  again. _Decided here:_ a queue that accumulated across playlists would have to be explained in the
  interface, and the panel has room for one list and its heading.
- **A track entry records the playlist it came from,** so the player can name where the music is coming from
  and so a listener who opens a playlist can recognise the queue they started there.
- **A track is playable when its stored file exists, and that is a fact the server sends.** The client does
  not probe, does not guess from a duration, and does not keep its own copy of whether a file arrived. The
  track list carries the file status, and the play control is present exactly when the status says there is
  something to play. A control that is visible and cannot be pressed is a fault the design system's own
  checks already treat as one.
- **A queue entry whose file has gone is dropped when it is reached,** and playback continues to the next
  one. A track that fails to load mid-queue behaves the same way, so one broken track ends nothing.
  _Decided here:_ a queue that stops on an error is a session over, and the listener has no way to say
  which track did it.
- **A refusal to play a track is handled by kind.** A track that is not found is dropped and the queue
  advances, which is what a revoked share or a pruned track looks like. A request the edge refuses because
  the session has expired takes the client to the edge's own sign-in, on web by navigating away and letting
  the edge re-authenticate, and on the phone by treating it as the signal to run the provisioning flow again.
  Neither is presented as a playback error, because neither is one.
- **Seeking is a range request against the stream route, and the stored audio is faststart so that a seek
  does not need the end of the file.** The server side of this is already built and needs nothing from this
  spec beyond being used.
- **Nothing is prefetched.** The next track is requested when the current one ends, not before, so a
  listener who skips a track has not already paid to download it, and the instance is not holding open
  connections for audio nobody will hear. _Decided here:_ prefetching is a bandwidth decision with no
  customer, on an instance that is rate limited by its source.
- **One track plays at a time.** No overlap, no crossfade, no gapless join. _Decided here:_ the product is a
  dependable shelf, and every one of those is a feature rather than a default.
- **The platform's own controls are driven from the same player state,** being the media session on web and
  the lock screen and background playback on the phone, each behind feature detection and never allowed to
  throw past the player. What the platform shows is what the player state says, never a second copy of it.
- **The player is the only persistent surface in either client,** and the queue is an overlay above it rather
  than a route, because a route for the queue means leaving what you are listening to in order to ask about
  it.
- **A track held by two playlists is one file and one stream address,** and the queue plays the same audio
  either way. The deduplication that makes this true is a property of the media store, and the player simply
  never knows there was a second playlist.
- **Binding constraints, not negotiable inside this spec:** the stored media is what plays, never the source;
  there is no transcoding and no download endpoint; a stream requires the same authorisation as any other
  read, so the browser's session and the phone's token are both attached to the audio request; and the client
  never writes to the media root, the database, or any state the server owns.

## Testing Decisions

- **The seam is the player itself, with the audio element replaced.** The player is exercised as a store and
  a component against a fake audio element that reports its events, plus a mocked network so that stream
  requests are assertions rather than bytes. Neither client needs a real file to prove the queue, the order,
  the persistence, the skipping and the refusal handling.
- **What makes a good test here** is what the player does in response to an event, never the internals of
  the audio element. A test that counts setters is a test of a wrapper; one that says a track failed to load
  and the next one started is a test of the feature.
- **The cases that must exist:**
  - pressing play on a track builds the queue from its playlist, starting at that track;
  - playing in another playlist replaces the queue rather than extending it;
  - a refetch arriving mid-playback does not change the order, the index, or the offset;
  - the order the listener sets survives a refetch and survives a relaunch;
  - the offset within the current track is persisted and restored;
  - a track whose file status is not stored has no play control, and is not in a queue built from that
    playlist;
  - a queue entry that fails to load is dropped and playback advances;
  - a track that is not found is dropped and playback advances;
  - an expired session is not presented as a playback error and triggers the client's own re-authentication
    path;
  - skipping forward and back within the queue, and finishing the last track, stop at the end rather than
    wrapping;
  - the media session, or the lock screen controls, reflect the player state and drive it in both directions;
  - a feature the platform lacks is absent rather than throwing, on both clients;
  - nothing is written to the server when a track plays, and the client's network log contains no request
    other than the reads and the stream.
- **Prior art and its limits:** the web scaffold already sets up the player store, a single global audio
  element and the media session wiring, and the mobile scaffold sets up its player, its queue and its
  background configuration, so the shape of the state is decided. Neither is proven. Two things cannot be
  proven with a fake and need a check of their own: that a real seek is immediate against a real stored file
  in a real browser, and that playback survives the screen locking on a real device. Those are the
  verification steps for the end-to-end ticket rather than for these tests.

## Out of Scope

- Offline playback, and any client-side copy of a track. Offline is out of scope in v1 by the glossary.
- Casting, and any second playback device.
- Scrobbling, play counts, listening history, a last-played field, and any analytics. Playing a track writes
  nothing, which forecloses all of them by construction rather than by policy.
- Gapless playback, crossfading, equalisation, replay gain, and any audio processing.
- Two tracks playing at once.
- The queue as a route, as a screen, or as anything the server knows about.
- Download, export, and any endpoint that hands over a file rather than a stream.
- The server's stream route, which is already built, and its authorisation, which
  [`05-share-a-playlist`](05-share-a-playlist.md) settles.
- Editing tags, titles, or artwork, which belong to the source.
- Synchronising playback position between clients. It is per client, so two devices are two sessions.

## Further Notes

- Playing a track writing nothing to the server is the most consequential decision in this spec and the
  easiest to reverse by accident. Any future request to know what somebody listened to is a product change
  with a privacy dimension, not a field to add.
- The queue's persistence on the phone is a known gap rather than a settled detail. The mobile scaffold
  covers the player state but not its storage, and the web scaffold covers both, so the asymmetry is in the
  tickets and not in this spec's intent.
- The two checks this spec cannot fake, a real seek and a real screen lock, are the ones that decide whether
  the feature works. They belong to the end-to-end ticket, and a queue that passes every unit test while
  seeking takes four seconds is still broken.
- Because the queue is one playlist at a time and a track records its origin, the panel and the player bar
  have everything they need to say where the music is coming from without a new route or a new server field.
