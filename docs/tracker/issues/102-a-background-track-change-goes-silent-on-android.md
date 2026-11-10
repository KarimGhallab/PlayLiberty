# 102: A background track change goes silent on Android

**State:** `wontfix`
**Category:** `bug`

## Observed

On Android, with Brave in the background or the screen off, the next track is queued and starts, the element's clock advances and the player state stays `playing`, but the media notification disappears and the audio output stops a few seconds later. Unlocking the phone and returning to the page resumes the audio at the position the clock had reached, not at the point it went quiet. The queue, the advance and the media session state are correct throughout.

## Expected

The queue plays through a track boundary with the screen off, as it does in the foreground, on a desktop, or on the first track started while the app was foregrounded.

## Evidence

Measured 2026-10-28 on Android with Brave (`targetSdkVersion: 37`, `sdk=37`), using `adb logcat`.

`adb logcat` at the boundary:

```
Background started FGS: Disallowed [callingPackage: com.brave.browser; ...]
service com.brave.browser/org.chromium.chrome.browser.media.ui.ChromeMediaNotificationControllerServices$PlaybackListenerService
code:DENIED
ForegroundServiceStartNotAllowedException: startForegroundService() not allowed
MediaFocusControl: requestAudioFocus() ... callingPack=com.brave.browser
MediaFocusControl: removeFocusStackEntry ...
AudioFlinger: setParameters: ... screen_state=off
```

The player trace over the same seconds:

```
27.71 pause ... ended=true ... at=139.2 duration=139.2
27.71 source set track=f4b5...
27.72 play asked
27.82 loadedmetadata / canplay / playing / play started ... duration=224.9
56.78 visibilitychange vis=visible ... paused=false ... at=29 duration=224.9
```

The element played continuously; the output was taken away.

## Why the web client cannot fix it

Android denies Brave the playback foreground service when the notification is recreated at the track boundary from the background. The page has no API to start or keep a foreground service; the browser owns it. An `<audio>` element also cannot avoid pausing at `ended`, which is what makes Chrome tear the notification and its service down before the next source starts. A continuous Media Source stream could keep the element from pausing, but the stored AAC is served verbatim by decision, and that still would not guarantee the service survives. The fix belongs upstream in Brave or Chromium, or in a client that owns a native playback service.

## Workarounds

These reduce the impact; none is a fix.

- Brave, Settings, Media, Enable Background Audio.
- Android, Apps, Brave, Battery, Unrestricted, and on Samsung builds remove Brave from sleeping apps.
- Android, Apps, Brave, Display over other apps allowed, which is one of the OS exemptions for a background foreground-service start. It is a broad permission.
- Update Brave and follow [brave-browser#52188](https://github.com/brave/brave-browser/issues/52188), "Background playing stopped working after latest Android updates".

## Decision

Not fixable in the web client on Android. The mobile client (`apps/mobile`, `expo-audio` with its own media service) can keep the boundary, and this issue is the acceptance test for it. Revisit if Brave or Chromium ships a fix; the trace line and the FGS denial above are the test.
