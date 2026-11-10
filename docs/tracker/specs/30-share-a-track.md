# Share a track on mobile

Status: resolved
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

## Out of Scope

- Public, anonymous or tokenised links, link expiry, and QR codes.
- The platform share sheet.
- A start offset or timestamp in the link.
- Retrying a download from a link entry.
- A dedicated track page with its own artwork and transport; the bare track is the gallery with the bar.
- Notifications, a sent-link history and read receipts.
- A share control in the bar, and sharing from the gallery without a row.
