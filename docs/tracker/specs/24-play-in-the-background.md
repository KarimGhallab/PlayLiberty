# Play in the background on mobile

Status: resolved
Labels: `enhancement`, `ready-for-agent`

## Problem Statement

The reason a phone client exists is that the music keeps playing with the screen off and the phone in a pocket. The
web client cannot do that: issue `102` records that a background track change on Android goes silent, because a
browser tab loses the audio element's foreground privilege between tracks. Without a foreground service the app
inherits the same failure, and the lock screen and the notification shade have nothing to show.

The second problem is what a service is allowed to be. Android 14 requires a declared foreground service type, a
background start is refused, and the notification permission is separate from the service permission. A service
that is started at the wrong moment, or that outlives the queue, is a process the operating system will kill or a
user will report.

## Solution

An Android foreground service of the media playback type, started from a user action in the app, holding the audio
for as long as the queue is non-empty. It draws one media-style notification with the track, the playlist, the
artwork, previous, play-pause, next and a seek position, and it exposes the same controls to the lock screen through
the platform's media session. The notification and the lock screen read the player's state; there is no second copy.
The service stops when the queue is emptied, when the account signs out, when the app task is swiped away, or when
the system stops the foreground service. Android 14 keeps a media-style foreground notification pinned, so swiping the
notification itself is not an end control.

## User Stories

1. As a listener, I want the music to keep playing with the screen off, so that I can put the phone in my pocket.
2. As a listener, I want the next track to start while the screen is off, so that a playlist plays through.
3. As a listener, I want a notification while music plays, so that I can control it from anywhere.
4. As a listener, I want the notification to name the track and the playlist, so that I know what is playing.
5. As a listener, I want the artwork in the notification, so that I recognise the track at a glance.
6. As a listener, I want previous, play-pause and next in the notification, so that I do not have to unlock the phone.
7. As a listener, I want the lock screen to show the same controls, so that I can use it without opening the app.
8. As a listener, I want the seek position in the notification, so that I can scrub from the shade.
9. As a listener, I want a track change to update the notification, so that it never names the previous track.
10. As a listener, I want a track change to keep the audio, so that the queue does not go silent in the background.
11. As a listener, I want the notification to be silent on a track change, so that it does not buzz in my pocket.
12. As a listener, I want tapping the notification to open the app where I left it, so that I am not reset to the gallery.
13. As a listener, I want pausing to keep the notification, so that I can resume from the shade.
14. As a listener, I want the session to end when the queue ends, when I sign out, or when the system stops the
    service, so that nothing runs after I am done.
15. As a listener, I want the service to stop when the queue ends, so that nothing runs after the music.
16. As a listener, I want no music to start on its own after a restart, so that the app never surprises me.
17. As a listener, I want the music to stop when I sign out, so that a handed-over phone is silent.
18. As a listener, I want my headset's buttons to work, so that I do not have to touch the phone.
19. As a listener, I want a call to pause and resume as the platform expects, so that the app behaves like other players.
20. As a user on Android 13 and later, I want the notification permission asked when it matters, so that I am not asked at first launch for a feature I have not used.
21. As a user, I want no notification at all when nothing has played, so that the app is not a permanent presence in my shade.
22. As a user, I want one notification and never two, so that a track change does not stack them.
23. As a user, I want the service to survive Doze, so that the music does not stop when the phone idles.
24. As a user, I want the app not to drain my battery, so that the service costs only the playback it performs.
25. As a user, I want a bare shared track to show no playlist name, so that the playlist's existence is not revealed.
26. As a screen-reader user, I want the notification's controls named, so that they are usable from the shade.
27. As a French-speaking listener, I want the notification's labels in French, so that the shade stays in my language.
28. As a developer, I want the background boundary tested, so that issue `102` stays fixed rather than regressing.

## Implementation Decisions

- **The service is a foreground service of type `mediaPlayback`.** It is declared with its permissions and started
  from a user action in the app, never from the background. `Decided here:` Android 14 refuses a background start,
  so every playback begins with a press, and a service started any other way is a crash waiting for a device.
- **The service lives while the queue is non-empty, including while paused.** It stops when the queue is emptied,
  when the account signs out, when the app task is swiped away, or when the OS stops the foreground service.
  `Decided here:` a paused queue that lost its notification could not be resumed from the shade, which is the whole
  point of the feature.
- **The media-style notification is pinned by Android 14 and is not swiped away.** A delete intent is wired where the
  OS offers a dismissal, and it stops playback and clears the queue. On Android 14 the end controls are the queue
  ending, sign-out and the foreground-service task manager stop. `Decided here:` the alternative is a custom
  notification without the system media card, which loses the standard transport and seek surface.
- **The notification is one media-style notification on its own channel, created once.** It carries the track title,
  the playlist name as the subtitle (empty for a bare track), the artwork, previous, play-pause, next and the seek
  position, and it is updated in place on every state change. `Decided here:` a second notification per track is the
  one bug every media app ships once.
- **The channel is low importance, with no sound and no heads-up.** A track change must not buzz.
- **The lock screen's controls come from the platform's media session, not from a custom view.** The session's
  metadata is the same state the bar draws: title, the playlist as the album (empty for a bare track), and the
  artwork, which is the playing track's thumbnail. The playlist name is the line under the track title.
- **The notification's tap opens the app on the screen it was on.** It does not reset the stack to the library.
  `Decided here:` a tap is a return, not a new session.
- **Playback never starts by itself after a kill.** The service does not restart, and a relaunch has no queue. This
  is spec `19`'s persistence decision, applied here.
- **The notification permission is requested on the first playback, not at launch.** A refusal does not stop
  playback; it means the notification is absent and the app says so once. `Decided here:` asking at launch for a
  permission the person has not needed yet is how an app gets denied.
- **Headset buttons and the audio focus contract are the platform's**, and they drive the same player state.
- **The service adds no wake lock of its own.** The player holds what it needs while audio is playing; the service
  adds no timer, no poll and no scheduled work.
- **Issue `102` is this spec's acceptance test.** A track change with the screen off must produce the next track's
  audio, not silence.
- **iOS background audio is not claimed.** The code stays cross-platform and iOS is not built or verified.
- **Inherited decisions are referenced, not restated:** the queue's build and merge rules, the playable rule, the
  no-prefetch rule and the one-track rule are [`07-play-stored-audio`](07-play-stored-audio.md)'s; the bar and the
  queue sheet are [`23-play-stored-audio`](23-play-stored-audio.md)'s; the bare-track context is
  [`30-share-a-track`](30-share-a-track.md)'s.

## Testing Decisions

- A test earns its place only if it fails when a listener would notice. The tests assert that the notification names
  the current track after a change, that a change keeps playback, that the service stops when the queue empties, and
  that a sign-out clears the queue. A dismissal command is tested where the OS allows one. They do not assert the
  notification's layout, the channel's identifier, or the service's start mechanism.
- **The notification's state is tested at the mapping's seam**: a track change produces one notification with the new
  title, the playlist as the subtitle, and the empty subtitle for a bare track. Prior art is the web's Media Session
  mapping tests.
- **The service's lifetime is tested at the player's seam**: start on the first track, survive a pause, stop on an
  emptied queue and on sign-out.
- **The critical journey is a Maestro flow on a physical device**: start a playlist, turn the screen off, let a
  track end, and confirm the next one plays and the notification names it. It is the only test that proves issue
  `102`'s fix, and it must be run on the device that will use the app.
- **Cut tests:** no test of the channel's importance, the artwork's downscale, or the notification's tap intent
  beyond the screen it opens.

## Out of Scope

- iOS background audio, and any iOS build.
- A playback queue that survives a process kill.
- Android Auto, Wear OS, a widget, and a persistent mini player in the shade beyond the one notification.
- Sleep timers, playback speed, equalisation and any audio processing.
- Multiple simultaneous sessions and a second playback device.
- A user-visible setting for the notification channel.
- Push notifications of any other kind.

## Further Notes

- The web client's failure in issue `102` is the acceptance test this spec exists to pass. When the web is fixed by
  a browser, nothing here changes.
- The service is the only part of the app that runs with the screen off. Its cost is the playback it performs, and
  nothing else is scheduled behind it.
