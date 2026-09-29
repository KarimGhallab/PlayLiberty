# The empty shelf

> Part of the design system. Index and cross-cutting rules: [`DESIGN.md`](../../DESIGN.md).

The library with no playlists at all. A different component from the
[playlist empty state](empty-state.md), and the difference is one word.

**The action is `Add a playlist`, and it is not `Sync now`.** That is the whole of the distinction and
it is worth being blunt about why it is not a variant. The playlist empty state is a playlist that
exists, is named, and has no tracks, which is a playlist that has never been synced, so its action is
to sync it. The shelf is a person who has no playlists, so there is nothing to sync. Drawing the other
surface here would tell somebody with an empty shelf to sync something, and the button would work:
`syncStatus` is `idle` on every playlist, a sync would run, and it would find nothing to download. The
empty-state record already names this in its own closing line, and this is that sentence turned into a
component.

**The shelf carries one fact and one action, and the fact is the promise.** The sentence is
`.prose`, which already carries the system's reading width at 66ch, so the number lives in one place:
paste a YouTube playlist link, then sync it, and every track downloaded from then on is yours even if
the video is taken down later. That is the product's whole reason for existing and an empty shelf is
the one surface where saying it once is not nagging, because there is nothing yet to lose. The
playlist empty state makes the same promise on its third line, and the two are worded differently on
purpose: that one explains what a sync does, this one explains what a person gets.

**The stack is centred, top-aligned in the list it replaces, not vertically centred in the page.** A
list starts at the top, so an empty list's content starts at the top too. The shelf measures **220px
tall at 1056 and 244px at 390**, the difference being the sentence running to more lines on the
narrower column, and it is drawn in the reading width in both.

**The shelf repeats the header's control and that is deliberate.** On an empty screen the word "Add a
playlist" appears twice, once in the header and once here. The header's is chrome and is there in
every state; this one is the invitation, and on an empty screen it is the only thing there is to press.
The two never coexist with a list, so at no width does a person choose between two controls that do
the same thing. The cost is a reader seeing the same words twice on one screen, and it is paid for the
empty shelf being a screen state rather than a variant of the playlist's.

**The control here carries the 44px touch target on mobile**, since it is alone on the screen and is
the thing a thumb is most likely to miss. Its box is the same 36px as the header's, so the control
looks the same on both platforms and only its target differs, which is the form controls record's rule
rather than a decision made here.

## Not this

The playlist empty state, for the reason above. A first-run walkthrough, an import from another
service, and a "browse playlists" affordance: no route returns anything the person did not put there,
and the glossary makes playlists the only entry point to content, so a shelf that offered to fetch
more of them would be offering the one thing this product has not built. A loading state, because
`GET /playlists` returns a page rather than a stream and there is nothing to wait for that is not the
absence of the shelf itself.
