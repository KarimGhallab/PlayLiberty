# Pin a playlist

Status: resolved
Labels: `enhancement`

## Problem Statement

The gallery is one list in the route's own order, and the screen cannot change it: the library keeps no sort,
no filter and no pagination. So the playlist an account keeps returning to sits wherever it landed, and the
more playlists it holds the further down that one drifts. Nothing on the screen can say "this one is where I
want it".

The placement also has to be the account's own. The two values the playlist row already carries, the track
order and the skip setting, are per playlist and gated on write access, and both of those choices are wrong
here. A pin says where a playlist sits for me and not what the playlist is, so a read collaborator must be
able to pin the playlist shared with them, and one account's pin must not move the gallery of anyone else who
can see that playlist. The pin is therefore a per-account preference, and the schema holds none.

The third problem is the documents. "Favorites" is a permanent non-goal in the product doc, the glossary and
the specs tracker, and this feature is the one that reverses it. A reversal left unrecorded keeps three
documents contradicting the product and leaves the next reader to reinvent the word this spec has to remove.

## Solution

The gallery gains a pinned section above its list, and every item's actions menu gains Pin and Unpin. A pin is
per account and per playlist, so it follows the account rather than the browser, is granted by visibility
alone, and never moves anyone else's gallery. The section is in name order like the list below, it exists only
while something is pinned, and a pinned playlist is lifted out of the list below rather than drawn twice.

## Implementation Decisions

- **The pin is per account and per playlist, and it is the schema's first per-account row.** A new
  `playlist_pin` table keyed on `(accountId, playlistId)`, both foreign keys cascading, holding the instant
  it was pinned; the row's existence is the pin. _Decided here:_ not a value on the playlist row, which is
  where the track order and the skip setting live. Those are properties of the playlist that everyone who
  reads it shares, and a pin is the opposite, the account's own placement, granted by visibility rather than
  by write access.
- **The pin is a placement and not an order.** The section is in name order like the list below, and the
  instant a pin was made is recorded and no longer read for the order: unpinning deletes the row and re-pinning
  refreshes it. _Decided here:_ the gallery is one order, so a pin never has to explain a second one and the
  section is looked up the same way the list below is. No position column and no drag, so no second stored
  sequence; an explicit order is the feature that would add one.
- **The table carries no update timestamp beyond the instant the pin was made.** It follows the share and the
  suppression, which are created and deleted rather than edited, and not the account, the playlist and the
  track.
- **There is no cap on how many playlists an account pins.** _Decided here,_ and the cost is recorded rather
  than paid: an account that pins its whole gallery turns the section into the gallery, which is a choice and
  not a defect. A cap would make the action refuse, and a refusal is a worse answer than a large section.
- **The pinned state rides on the playlist the list read already returns.** One boolean on the playlist
  schema, so the gallery's single read carries the flag. _Decided here,_ a field on the existing read rather
  than a second read of the pins, which would be a second thing to keep current for one bit.
- **The list read returns pinned items first, then the rest, and each group in name order.** The comparison is
  a collator rather than the database's own, because SQLite here is built without ICU: `order by name` folds at
  most the ASCII range and would put `Été` after `Zebra`. Case and accents are one for the order, so the rowid
  decides between two names that differ only in either. The client groups on the flag and never sorts.
  _Decided here:_ the order is the server's rather than a client partition, so the two groups cannot disagree
  with the read, and so nothing has to re-derive the order when the gallery pages. The whole visible list is
  sorted rather than one page of it, because a comparison the database cannot make cannot be a LIMIT either;
  the total is the count of visible playlists, so a pin moves a row within the page rather than adding one.
- **The pin is written by a mutation that mirrors the skip setting's route.** A `PATCH` on the playlist with a
  required boolean body, validated, answering the updated playlist. _Decided here:_ one route with a body
  rather than a put and a delete, so a retry is idempotent and the two directions cannot drift apart.
- **Any playlist the account can see may be pinned, and the guard is the read need through the entry seam.**
  The route resolves the playlist through the same entry point every other playlist route uses, at the read
  requirement, so a route cannot skip the check; a stranger, a missing playlist and one the account cannot
  see are one not-found. The requirement names the read because visibility is what the write actually needs:
  the handler writes per-account state and never the playlist.
- **A pin publishes no event.** A pin is not a change to the playlist, and the playlist-changed event reaches
  every account that can see it, which would refetch the gallery of collaborators whose own gallery did not
  move. The acting client invalidates the list read itself. _Decided here,_ with the cost recorded below: a
  second tab of the same account stays stale until its next read.
- **A pin outlives the share it was made through, and visibility decides whether it is returned.** The row
  references the account and the playlist and not the share, so revoking a share hides the placement rather
  than deleting it and granting the share again restores it. Nothing sweeps the table: the read's own filter
  is the rule, and the only deletions are an unpin and the cascade from a deleted playlist or account.

- **The gallery draws two lists, and the pinned one is a labelled section above the other.** The section
  heading is the section's own name, the items are the same component at the same arrangement, and there is
  no count in the heading, because a count of pins is a standing total of the kind the header's own rule
  already refuses.
- **The loading state does not change.** The skeleton is the gallery's shape and the read has not landed, so
  a pinned stub would either flash and withdraw or promise a pin the account may not have.
- **The pin is an item of the actions menu, which stays the one owner.** The module that already owns a
  playlist's actions, their dialogs and their write rule exposes Pin and Unpin, and the menu every arrangement
  already draws is the one affordance, so nothing is drawn on the cover. _Decided here:_ the menu is already
  where the item's actions live, so the pin needs no second surface and no reveal over the artwork.
- **The menu is gated by what the account may do, not by a level.** An owner's and a writer's menu already
  exists, so the pin sits with their other actions; a reader's menu now holds Pin and Unpin alone, because
  visibility is the whole of what pinning needs and a share at the read level otherwise offers nothing.
  _Decided here:_ a reader cannot be left without the one action their access allows.
- **The item is a command with a stable word.** It reads `Pin` while the playlist is unpinned and `Unpin`
  while it is pinned, so the label is the action and the item needs no pressed state. _Decided here,_ on the
  shuffle toggle's precedent for the wording.
- **There is no tooltip.** A menu item carries no tip: the word is the whole of it, and the menu's own button
  already names the playlist it opens onto.
- **The two glyphs join the pinned set and the icons record.** Neither is in the pin today, so drawing the
  two menu-item glyphs and adding the pair's entry to the icons record are part of this work rather than a
  follow-up, because the record's figures come from the drawn glyphs and an absent glyph fails validation.
- **The copy is the screen's own vocabulary.** The section heading is "Pinned"; the menu reads "Pin" and
  "Unpin"; the failure notice is "The pin could not be changed." The new keys live under the library and header
  namespaces, and the French catalogues take the same keys with the section heading inflected for playlists.
- **The stale statements are amended as part of the work.** "Favorites" leaves the permanent non-goals in the
  product doc, the glossary and the specs tracker; the capability joins the product's v1 list; the glossary
  gains the one word for the idea and the mix-up pair it must not be confused with; and the library spec's
  one-list decision gains the forward pointer to this spec.
- **Inherited constraints are owned by the architecture and not restated here:** identity from the forwarded
  edge headers and fail-closed
  ([Identity comes from Pangolin's forwarded headers](../../ARCHITECTURE.md#identity-comes-from-pangolins-forwarded-headers)),
  and the client header with the origin check on every mutation
  ([Mutating requests carry a client header and pass origin checks](../../ARCHITECTURE.md#mutating-requests-carry-a-client-header-and-pass-origin-checks)).

## Out of Scope

- A pin control on the playlist detail; pinning is the library's own action.
- A cap on how many playlists an account pins.
- An explicit pin order, a drag, or a stored position.
- Favoriting a track, favoriting anything else, and any view that gathers favorites.
- A live event for the pin.
- The mobile client's own arrangement. This corpus is web only.
