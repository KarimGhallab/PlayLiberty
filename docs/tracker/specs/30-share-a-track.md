# Share a track on mobile

Status: ready
Labels: `enhancement`, `ready-for-agent`

## Problem Statement

A track can be played by every account on the instance, but it cannot be handed to one. The web client solved this
with an address: `/playlists/P?track=T` names the track inside its playlist, `/tracks/T` names it alone, and the row's
menu copies the link. A phone has no address bar, so the app must both produce the link and be the thing that opens
it. The recipient's four outcomes, with access, without access, after the track left the playlist, and with the track
unplayable, all have to survive the translation.

## Solution

Every track keeps an address. The row's sheet offers Copy link, which writes the same absolute URL to the clipboard.
The app registers the two link forms and resolves them on open: with access to the playlist, the playlist opens
unshuffled at the shared track and the queue runs to its end; without access, the bare track plays alone on the
gallery; a track that left the playlist plays alone with a notice; a track that cannot play leaves the playlist in
place with a notice. The link grants nothing.

## User Stories

1. As an account, I want Copy link in a row's sheet, so that I can send exactly one track.
2. As an account, I want the copied link to be absolute, so that pasting it into a chat works.
3. As an account, I want the copied link to carry the playlist and the track, so that a recipient with access hears it in context.
4. As an account, I want the copy confirmed, so that I know it worked.
5. As an account, I want a refused copy explained, so that I do not send nothing.
6. As a recipient, I want the link to open the app, so that one press is enough.
7. As a recipient with access, I want the playlist to open at the shared track, so that I hear it where it belongs.
8. As a recipient with access, I want shuffle off for that queue, so that the order is the one the link promised.
9. As a recipient with access, I want Previous and Next to follow the playlist, so that I can move around the track.
10. As a recipient with access, I want playback to stop at the playlist's end, so that the link does not loop.
11. As a recipient without access, I want the track to play alone, so that the link is useful without a share.
12. As a recipient without access, I want to land on my gallery, so that I am not shown a playlist I cannot read.
13. As a recipient without access, I want the bar to name the track only, so that the playlist's existence is not revealed.
14. As a recipient without access, I want no way into the playlist, so that the link cannot lead me to a page I cannot read.
15. As a recipient, I want a track that left the playlist to play alone with a notice, so that I understand why the playlist did not open.
16. As a recipient, I want a track that cannot play to leave the playlist in place with a notice, so that I can see the playlist and retry.
17. As a recipient of a broken link, I want a notice that says the track is not available, so that I stop waiting.
18. As a recipient of a link to a pruned track, I want a notice, so that I do not face a blank screen.
19. As a recipient, I want a refused autoplay to leave the track paused at its start, so that I can press play.
20. As a recipient, I want the address of the detail to follow the playing track, so that a link I copy later shares what I hear.
21. As a recipient, I want starting another playlist to leave the bare track's address, so that the address describes what plays.
22. As a recipient, I want the bare track's artwork, so that the track remains identifiable.
23. As an account, I want the link to work only inside the instance, so that the private boundary is not weakened.
24. As an account, I want copying a track to grant nothing, so that sending a track does not share the playlist.
25. As an account, I want Copy link on every row, including read-only playlists, so that sharing needs no curation rights.
26. As an account, I want Copy link while a track downloads, so that I do not wait for its audio.
27. As a screen-reader user, I want the copy item named, so that I can share without sight.
28. As a French-speaking account, I want the copy and the notices in French, so that the app stays in my language.

## Implementation Decisions

- **The two link forms are the web's, resolved by the app's router.** `/playlists/{id}?track={id}` opens the detail
  at the track, and `/tracks/{id}` opens the bare-track route. Both are registered as a verified HTTPS App Link on
  the instance's origin and as the `dev.playliberty.app` scheme, so a self-hosted origin that cannot be verified still
  resolves. `Decided here:` the same addresses as the web, so a link sent from one client opens in the other.
- **The playing track is a route parameter on the detail, not a separate screen state.** It follows the current track
  with the router's replace, and it is absent while the detail is open but is not the queue.
- **Entry is idempotent.** If the queue is already that playlist at that track, nothing restarts or seeks; if it is
  the same playlist at another track, it jumps; if it is another queue, it starts that one at that track.
- **The four outcomes are the web's, with the notices as the app's notice surface.** The playlist unreachable starts
  nothing and replaces to the bare track; the track not associated replaces to the bare track after the queue read;
  the track unplayable stays on the playlist with one notice.
- **The bare track's queue holds one track and no playlist context**, so the bar draws the title only, offers no
  playlist name and no artwork link, and the notification's subtitle is empty.
- **The copy is `expo-clipboard`'s string write, and the URL is built from the configured public origin.** Success is
  a result toast, a refusal is an error toast. `Decided here:` the app has a clipboard API that cannot be missing,
  unlike a browser's, so there is no insecure-origin fallback to design.
- **The platform share sheet is not used.** `Decided here:` the verb is Copy link, the web's spec excludes the share
  sheet, and a share sheet would add a target list the product has no story for.
- **The notices are transient and never interrupt.** They are drawn over whatever is on screen and do not stop what
  is playing.
- **No share is created and nothing is persisted beyond the queue's memory.** The link grants nothing, and there is no
  record of links sent or opened.
- **Inherited decisions are referenced, not restated:** the URL shapes, the entry semantics, the four redirects, the
  bare-track model, the notices' sentences and the no-grant rule are
  [`18-share-a-track`](18-share-a-track.md)'s; the bar's bare-track shape is
  [`23-play-stored-audio`](23-play-stored-audio.md)'s.

## Testing Decisions

- A test earns its place only if it fails when a recipient would notice. The tests assert the route a link resolves
  to, the queue that starts, that a no-access link lands on the bare track, and that an unplayable track leaves the
  playlist with a notice. They do not assert the clipboard's contents beyond the URL's shape, or the toast's timing.
- **The link resolution is tested at the router's seam** with the reads mocked: the two forms, the four outcomes, the
  replace to the bare track, and the replace away when another queue starts. Prior art is the web's share-a-track
  e2e and router tests.
- **The copy is tested at the row sheet's seam**, with the clipboard stubbed: the absolute URL and the two toasts.
- **The critical journey is a Maestro flow on a device**: open a `dev.playliberty.app` link to a track, see the
  detail at the track, and copy the playing track's link.
- **Cut tests:** no test of the App Link verification, the clipboard's platform behaviour, or the notice's duration.

## Out of Scope

- Public, anonymous or tokenised links, link expiry, and QR codes.
- The platform share sheet.
- A start offset or timestamp in the link.
- Retrying a download from a link entry.
- A dedicated track page with its own artwork and transport; the bare track is the gallery with the bar.
- Notifications, a sent-link history and read receipts.
- A share control in the bar, and sharing from the gallery without a row.

## Further Notes

- A link copied after a no-access redirect carries no playlist, so forwarding it plays the track alone even to
  someone who could read the playlist. That is the web's accepted consequence and it is unchanged here.
- The App Link's verification depends on the instance's origin serving the association file. A self-hosted instance
  behind the edge can, and the scheme is the fallback when it cannot.
