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

## User Stories

1. As a playlist owner, I want to copy the link of the playing track, so that I can send exactly that track to another account.
2. As a playlist owner, I want the address bar to name the playing track, so that copying the browser URL is enough to share it.
3. As a playlist collaborator, I want a Copy link item in the track's menu, so that I can share a track without holding the owner's powers.
4. As an account, I want the copied link to carry the playlist and the track, so that a recipient with access hears the track in its playlist context.
5. As a recipient with read access, I want the playlist to open unshuffled at the shared track, so that I hear it in the order the owner chose.
6. As a recipient with read access, I want the tracks before the shared track to keep their places, so that the queue and the playlist agree.
7. As a recipient with read access, I want Previous and Next to follow the shared queue, so that I can move within the playlist around the track.
8. As a recipient with read access, I want playback to stop at the playlist's end, so that the link does not loop or invent tracks.
9. As a recipient with read access, I want shuffle off for this queue, so that the order is the one the link promised.
10. As a recipient without access to the playlist, I want the track to play alone, so that the link is useful without a playlist share.
11. As a recipient without access, I want to land on my gallery, so that I am not shown a playlist I cannot read and still keep my library.
12. As a recipient without access, I want the player bar to show the track title only, so that the owner's playlist name and identity are not revealed.
13. As a recipient without access, I want the address to become `/tracks/T`, so that the track has a shareable address of its own.
14. As a recipient, I want the track to start when I open the link, so that one press is enough.
15. As a recipient whose browser refuses autoplay, I want the track queued paused at its start, so that I can press play.
16. As a recipient, I want a reload to keep the queue at the position I left, so that refreshing does not restart or drop it.
17. As a recipient of a bare track, I want starting another playlist from my gallery to make the address `/`, so that the URL describes what is playing.
18. As a recipient of a link to a track that is no longer in the playlist, I want the track to play alone and a notice to say it left the playlist, so that I understand why the playlist did not open.
19. As a recipient of a link to a playlist whose track is not stored, I want the playlist to stay and a notice to say it cannot play yet, so that I can see the playlist and retry where my access allows.
20. As a recipient without access to a track that is not stored, I want the gallery and a notice, so that I know the link is valid but the audio is not ready.
21. As a recipient of a link to a track that was pruned, I want a notice, so that I do not face a blank page.
22. As a recipient of a link to a track whose video is gone and was never stored, I want a notice to say it is unavailable, so that I stop waiting.
23. As a track owner, I want the copy action to confirm that the link was copied, so that I know the action worked.
24. As a track owner on a browser that refuses clipboard access, I want an error to say the link could not be copied, so that I do not send nothing.
25. As a track owner, I want Copy link on every row, including read-only playlists, so that sharing does not need curation rights.
26. As a track owner, I want Copy link on the playing row, so that the current track is shareable from its own row.
27. As a track owner, I want Copy link while a row is downloading, so that a track does not have to wait for its audio before its link can be sent.
28. As a keyboard user, I want the row menu and Copy link reachable and named, so that I can share without a pointer.
29. As a phone user, I want the row menu and the copy action at the touch target, so that sharing works with a thumb.
30. As a recipient on a phone, I want the gallery and the player bar at phone width, so that the fallback is the same experience.
31. As a French-speaking user, I want the new controls and notices in French, so that the interface stays in my language.
32. As a listener, I want the browser tab to name a bare track, so that I can find it among my tabs.
33. As a listener, I want a one-track link to stop at its end, so that it does not repeat.
34. As a playlist owner, I want the copied URL to be absolute, so that pasting it into a chat works.
35. As a recipient, I want the playlist link and the bare-track link to be different addresses, so that I can tell whether a queue or one track will play.
36. As an account, I want the link to work only inside the instance, so that the private boundary is not weakened.
37. As a playlist owner, I want copying a track to grant nothing, so that sending a track does not share the playlist.
38. As a recipient without access, I want the player bar to offer no way into the playlist, so that a link cannot lead me to a page I cannot read.
39. As a recipient, I want the bare track's artwork in the player bar, so that the track remains identifiable.
40. As a recipient, I want a reload of a bare-track link to keep the track, so that the address remains a durable reference to it.

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

## Testing Decisions

- A test earns its place only if it fails when behaviour a user relies on changes. The tests assert the URL a recipient lands on, the queue that starts, the text of a notice where the sentence is the contract, and the server's read and write decisions. They do not assert CSS, the icon, the toast duration, or the internal shape of the link builder.
- **The critical journeys are e2e**, in one new journey spec with two browser contexts on one instance: A is the proxy's dev identity, and B is a partner whose requests carry the `Remote-*` headers. The dev proxy already lets a supplied header override the dev identity, so the second account needs no product code. The journeys are: a read share opens `P` unshuffled at `T`; no share redirects to `/tracks/T` and plays the track alone with the title-only bar; a reload restores the paused queue and the address; starting a gallery playlist replaces the address to `/`; a failed track shows the gallery and the notice with no queue. This is the one new seam, and it exercises the real router, server, access rule, stream and identity.
- **The copy's URL and result toasts are owned by the playlist detail page test**, with the Clipboard API stubbed. The system clipboard is not portable across the three e2e engines, so the e2e starts from the canonical URL rather than re-proving the copy. This is the one deliberate gap at the browser boundary; the production origin is the place to confirm the real clipboard.
- **The server's security contract is tested at the track routes' existing inject seam.** The metadata, stream and thumbnail reads answer for an account with no association; retry and fetch-whole still refuse that account; a track with no stored media answers 409; an unknown id answers 404. Prior art is the same routes' existing identity tests.
- **The web branches are tested at the existing seams**: the player store and persistence for the nullable bare queue and its paused restore; the router shell for `/tracks/T`, the redirects and the replace to `/`; the playlist detail page for the `?track` entry, the mirror on advance, the unplayable notice and the copy; the track row for the universal Copy link item; the document title for the bare pattern. Prior art is the store's shuffle and restore tests, the router's route-change tests, the detail page's landing and toggle tests, the row's menu tests and the title tests.
- **Cut tests:** no test of the icon, the menu order, the toast duration, the exact URL string outside the detail page's copy assertion, or the catalogue parity, which the type system enforces.

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

## Further Notes

- The notice for a track that left the playlist is included because the recipient can see `P`, so a silent redirect would leave them wondering where the playlist went. If it is later unwanted, the redirect can be silent and nothing else depends on it.
- The link does not create a share and does not change the share table. Spec 05's "no link" stands for grants of playlist access; this link grants nothing and is reachable only by an authenticated account. "Sharing individual tracks" leaves 05's out-of-scope list only in this limited, grant-free sense.
- The redirected `/tracks/T` loses the playlist when it is forwarded. This is deliberate: the recipient's own address is honest, and the original link remains the one that carries the playlist.
- The phone dev server over a plain LAN address is not a secure context, so `navigator.clipboard` is unavailable there and the copy shows its failure toast. The copy is confirmed on the production HTTPS origin.
- The e2e's identity override is the dev proxy's existing behaviour, local and unauthenticated. It is a test-only seam and must never exist in production.
