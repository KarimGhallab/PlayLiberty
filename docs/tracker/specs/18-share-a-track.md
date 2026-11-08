# Share a track

Status: resolved
Labels: `enhancement`

## Problem Statement

A track can be played by every account on the instance, but it cannot be handed to one. The only sharing primitive is a playlist share, which grants access to the whole playlist. The thing a person often wants to send is one track: "listen to this". Today the address bar names the playlist, `/playlists/P`, so copying it loses the track and the recipient starts at the playlist's own beginning. If the recipient holds no share on `P`, the same URL draws the playlist not-found page, so the track is unreachable even though its audio is already stored and its row exists on the instance. To send one track, the sender has to grant the whole playlist, which is more access than the intent, and the recipient still has to find the track in it.

## Solution

Every track gets an address. On a playlist, the address bar names the playing track, `/playlists/P?track=T`, and the track's row menu offers Copy link, which copies the same URL. Opening the link does the right thing for the recipient's access:

- With access to `P`, the playlist opens unshuffled with `T` at its own place in the order, playback starts at `T`, and the queue continues to the playlist's end.
- Without access to `P`, the recipient lands on the gallery with `T` playing alone, and the player bar names only the track.
- A link to a track that is no longer in `P`, or to a track that cannot play, still resolves; the missing part is explained by a transient notice.

The link is inside the instance. The edge still authenticates, no public link exists, and copying a track gives no playlist access and creates no share.

## Implementation Decisions

- **A track link is the playlist URL carrying the track.** The canonical form is `/playlists/P?track=T`: the existing playlist route gains a validated, non-empty `track` search param. The row's Copy link builds the absolute form for that row's track, whether or not the row is playing. _Decided here:_ the playlist path with one query param keeps the page mounted and carries both the queue context and the track, without a second URL shape that would lose one of them.
- **The address bar mirrors the page's queue.** While `P` is open and is the queue's playlist, the param follows the current track on every change with `replace`, so copying the address bar later shares the track now playing. When `P` is open but is not the queue, the param is absent. The gallery stays `/` while music plays. Entry is idempotent: if the queue is already `P` at `T`, nothing restarts or seeks; if it is `P` at another track, it jumps to `T`; if it is another queue, it starts `P` at `T`. A reload restores the persisted queue paused at its position and does not restart audio. _Decided here:_ the URL describes the page, and `?track` is that page's state.
- **The track route is a gallery with a bare queue.** A new `/tracks/T` route renders the gallery body and the player bar, not a new page. It resolves `T`, starts a one-track queue with no playlist context, and tries to autoplay; a refused `play` leaves the queue paused, as every start does. If the queue already holds `T` as its bare current track, entry does nothing. When the user starts a different queue from the gallery, the URL replaces to `/`. A failed entry keeps `/tracks/T`. _Decided here:_ a state page would be a second body and a second set of controls for one sentence; the gallery is already the page the recipient owns.
- **Every hop out of the playlist page replaces the URL.** `P` unreachable: the playlist page sees the 404, starts nothing, and replaces to `/tracks/T`; it says nothing about `P`, because the access model never confirms an unreachable playlist exists. `P` reachable but `T` not associated: after the queue read, replace to `/tracks/T`. `P` reachable and `T` associated but unplayable: stay on `P`, start nothing, show one notice; the URL settles as the mirror decides. The history entry of a forbidden playlist is not kept. _Decided here:_ the recipient's address should describe where they are, and the forbidden path should not survive a Back press.
- **The queue with access is the playlist's own order.** The entry reads the whole queue, keeps the source order, drops unplayable tracks as the existing queue builder does, and starts with `currentId = T`; `T` keeps its relative place, earlier tracks stay before it, playback stops at the last track, and nothing wraps. Shuffle is set false for the shared entry; the replaced queue is gone anyway. The entry does not rebuild a queue that is already `P`. _Decided here:_ "starting with the shared track" means the playhead starts there, not that the playlist is rotated.
- **A bare track has no playlist context.** `PlayerTrack`'s playlist id and name become nullable; a store action starts a one-track queue with null context; the persistence guard accepts the null and restores the queue paused. The play queue's playlist id is null. The bar draws the title only, offers no source line and no playlist link, and makes its artwork link inert. The Media Session album is empty. _Decided here:_ the nullable context is the honest model, and hiding a sentinel name would still leave a name in the persisted queue.
- **A track id is a read capability inside the instance.** A new authenticated read returns a track's existing `Track` fields by id. The stream and the thumbnail drop their playlist-association check; the read branch of the track entry and the read access helper are removed, so no route claims a check it no longer applies. Retry and fetch-whole stay write-gated behind an associating playlist share, because they spend download capacity and change instance-wide state. The read returns no association and no playlist. There is no token, no anonymous route, and no change to the private media cache. _Decided here:_ a per-link token would add a concept the product does not have, and the instance is a household that already trusts every signed-in account.
- **Only a playlist 404 falls back.** A network or 5xx failure of the playlist read shows the normal error and retry and never silently downgrades to the bare track. A failed queue read on an accessible playlist is the same normal refusal, not "track absent".
- **The Copy link item is universal.** It sits first in the row's lane, uses the copy icon, and is shown for every row, every access level and every track state. Because the lane now always has an item, the dots trigger is enabled whenever the row is drawn. Copy link is the item that is always present; the mutating items keep their current availability, so a downloading, busy, pending or starting row opens a menu holding only Copy link. The player bar gains no share control. _Decided here:_ Copy link is valid in every state, so the old "do not open a menu onto a no-op" rule no longer applies to the trigger, while no mutating action gains a state it did not have.
- **The copy is the Clipboard API with result toasts.** The absolute URL is written with `navigator.clipboard.writeText`. Success is a result toast saying "Link copied"; a rejected write is an error toast saying "The link could not be copied." There is no insecure-origin fallback, so the phone dev server over a plain LAN address fails honestly while production and the e2e origin are secure.
- **The notices are transient and never interrupt.** One notice per link entry, on the app's existing refusal surface. It does not stop whatever the recipient is already playing. These sentences are the copy contract and land in both catalogues.
  - A known track that cannot play: "{title} cannot play." with "It is not stored yet." for pending or downloading, "Its download failed." for failed, or "Its video is gone and no file was stored." for unavailable.
  - An unknown id: "This track is not available." with "The link may be broken, or the track may have been deleted."
  - A track that left the playlist and then plays alone: "{title} is no longer in that playlist." with "It is playing on its own." This notice is carried across the replace as transient history state, never as a URL parameter; an unplayable track shows the cannot-play notice instead, because that is the actionable fact.
- **The document title names a bare track.** The existing playlist and track-in-playlist patterns stay. A bare track uses "{app} - {track}"; an unknown id uses the app name.
- **No share is created and nothing is persisted beyond the queue.** The link grants nothing; the recipient's access is whatever the share table already says. The queue persistence already exists and now carries a null playlist context. There is no record of links sent or opened, no notification, and no history of shared tracks.
- **No schema, migration or media change.** The track table, the association table and the share table are unchanged. The stored AAC is streamed as it is, as the no-transcoding rule requires.
- **Accepted consequence.** A `/tracks/T` URL copied after the no-access redirect carries no playlist. Forwarding it plays the track alone even to someone who could read `P`; only the original `/playlists/P?track=T` carries the playlist context.
- **Inherited constraints are not restated:** the private deployment ([Deployment behind the Pangolin edge](../../ARCHITECTURE.md#deployment-behind-the-pangolin-edge)), identity from the forwarded edge headers ([Identity comes from Pangolin's forwarded headers](../../ARCHITECTURE.md#identity-comes-from-pangolins-forwarded-headers)), the stream boundary ([Stream, end to end](../../ARCHITECTURE.md#stream-end-to-end)), and the audio format ([Audio is stored as-is, never transcoded](../../ARCHITECTURE.md#audio-is-stored-as-is-never-transcoded)).

The modules touched are the contracts' endpoint declaration and path builder; the server's track route, track service and track access; the web router; a shared-link entry module; the player store and its persistence; the player bar; the track row; the copy and its toasts; the document title; and both catalogues.

- **The e2e identity override is test-only.** It is the dev proxy's local, unauthenticated behaviour and must never exist in production.
- **The clipboard needs a secure context.** A plain-LAN dev server has none, so the copy shows its failure toast; the copy is confirmed on the production HTTPS origin.

## Out of Scope

- Public, anonymous or tokenised links, link expiry, QR codes, and the platform share sheet.
- Sharing outside the instance, inviting an account that does not exist, and any new share level or per-track grant.
- A start offset or timestamp in the link; a shared track starts at zero.
- Retrying a download from the track route, and a "Try again" action on a notice.
- A dedicated track page with its own artwork, title and transport; the gallery is the body.
- A share control in the player bar, and sharing from the gallery without a track row.
- Notifications, a sent-link history, read receipts and play counts.
- The native mobile client.
- Search, ratings, reordering a playlist, and offline playback.
- A database migration, a media pipeline change, and any change to the stream's private cache.
- Naming the playlist in the bar or the Media Session for a bare track, which would leak the playlist's existence.
