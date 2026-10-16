# Pin a playlist

Status: ready
Labels: `enhancement`, `ready-for-agent`

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

## User Stories

1. As a listener, I want to pin a playlist to the top of my gallery, so that the one I return to is where I
   look first.
2. As a listener, I want a pinned playlist lifted out of the list below, so that it appears once and in one
   place.
3. As a listener, I want the section in name order like the list below, so that I look a playlist up the same
   way wherever it sits.
4. As a listener, I want no limit on how many playlists I pin, so that the feature never refuses me.
5. As a listener, I want the section to disappear when I have pinned nothing, so that the gallery is exactly
   what it was before I pinned anything.
6. As a listener, I want the pin to be mine alone, so that pinning a playlist shared with me does not move
   anyone else's gallery.
7. As a read collaborator, I want to pin a playlist I can only read, so that my gallery is organised around
   what I listen to and not around what I own.
8. As a listener, I want to pin from the item itself, so that the action is where the playlist is.
9. As a listener, I want the pin in the item's own menu, so that it is one action among the item's own and
   nothing is drawn over the artwork.
10. As a listener, I want one item that pins and unpins, so that the thing that pinned is the thing that
    unpins.
11. As a read collaborator, I want the pin in my menu even though it otherwise holds nothing, so that I can
    organise a playlist I can only listen to.
12. As a listener, I want the item's menu to read `Pin` while the playlist is unpinned and `Unpin` while it is
    pinned, so that the action and the state are never guessed.
13. As a keyboard user, I want the pin reached by the menu keys as every other action is, so that it needs no
    pointer.
14. As a listener, I want no toast when a pin succeeds, so that the item moving is the whole answer.
15. As a listener, I want to be told when the pin did not change, so that a failure is not silent.
16. As a listener, I want a pinned playlist I can no longer read to leave my gallery, so that nothing is
    offered that I cannot open.
17. As a listener, I want the playlists below to keep the order they had, so that pinning does not reshuffle
    the rest.
18. As an account, I want a playlist I cannot see to answer as one that does not exist, so that the route
    does not confirm what I cannot reach.
19. As an account, I want my pins on the server rather than in my browser, so that they are the same on every
    client I use.
20. As a developer, I want the pinned state on the playlist the list read already returns, so that one read
    carries both the order and the flag and the client needs no second source of truth.
21. As a developer, I want the pin written through the access seam, so that a route cannot pin a playlist the
    account cannot read.
22. As a developer, I want the corpus's stale statements amended, so that the documentation does not
    contradict the product.

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
  the handler writes per-account state and never the playlist. _Decided here._
- **A pin publishes no event.** A pin is not a change to the playlist, and the playlist-changed event reaches
  every account that can see it, which would refetch the gallery of collaborators whose own gallery did not
  move. The acting client invalidates the list read itself. _Decided here,_ with the cost recorded below: a
  second tab of the same account stays stale until its next read.
- **A pin outlives the share it was made through, and visibility decides whether it is returned.** The row
  references the account and the playlist and not the share, so revoking a share hides the placement rather
  than deleting it and granting the share again restores it. Nothing sweeps the table: the read's own filter
  is the rule, and the only deletions are an unpin and the cascade from a deleted playlist or account.
  _Decided here._
- **The gallery draws two lists, and the pinned one is a labelled section above the other.** The section
  heading is the section's own name, the items are the same component at the same arrangement, and there is
  no count in the heading, because a count of pins is a standing total of the kind the header's own rule
  already refuses. _Decided here._
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
  one-list decision gains the forward pointer to this spec. _Decided here._
- **Inherited constraints are owned by the architecture and not restated here:** identity from the forwarded
  edge headers and fail-closed
  ([Identity comes from Pangolin's forwarded headers](../../ARCHITECTURE.md#identity-comes-from-pangolins-forwarded-headers)),
  and the client header with the origin check on every mutation
  ([Mutating requests carry a client header and pass origin checks](../../ARCHITECTURE.md#mutating-requests-carry-a-client-header-and-pass-origin-checks)).

## Testing Decisions

- **No new seam on either side, and the assembled product keeps its browser journey.** The server keeps its
  route seam: the real app over a temporary database, exercised through HTTP injection, with accounts,
  playlists, shares and pins seeded directly and the response validated against the contract schemas. The web
  keeps its library seam: the page rendered through the query provider against a mocked network. The new
  table is reached through the route, so it needs no unit seam of its own. The e2e suite gains one journey
  file.
- **The end-to-end journey must exist, because three of these facts are only true once assembled:** the pin is
  written by the server and read again after a reload, the pinned playlist is lifted out of the list below
  rather than drawn twice, and an account that can only read a playlist can still pin it. It seeds one owned
  playlist and one shared with the account at the read level, pins from the item's menu, and asserts: the
  section appears above the list and names itself; the item leaves the list below; the pin survives a reload;
  the section withdraws when the last pin is removed; and the item the account cannot write still pins. The
  browser is the owner of the assembled shape, so the two-account case stays in the route tests, where a
  second account can be seeded without a second browser.
- **What makes a good test here** is which playlists a reader sees and where each of them sits, never the
  table, the query or the component's internals. A test that asserts the pin row was written is a test of the
  implementation; one that asserts the pinned playlist is above the others after a reload is the feature. The
  section is asserted by its name and by the order of the items, never by a tag or a class, which is the rule
  the presentation-assertion issue already settled.
- **The cases that must exist:**
  - the list read returns the pins first and the rest below, each group in name order, and the flag on each
    item;
  - a pin written by one account leaves another account's list order unchanged, and both can pin the same
    shared playlist;
  - the mutation writes the pin and answers the playlist; a second pin of the same playlist refreshes the
    instant rather than failing; unpinning removes it;
  - a playlist the account cannot see, a missing playlist and a stranger are one not-found, on both
    directions of the mutation;
  - a changed body is a validation failure;
  - deleting a playlist takes its pins with it, and revoking a share hides a pin and re-granting it returns
    the placement;
  - the page draws the section above the list with the pinned item lifted out of it, and draws no section
    with nothing pinned;
  - the menu item pins and unpins, and the item moves between the two groups;
  - a read collaborator's menu holds Pin and Unpin alone and pins from it;
  - a failed pin leaves the item where it was and draws the notice.
- **Prior art:** the library page tests, which render the page against the mocked network and already cover
  the list, the empty gallery and the failed read; the library journey, which is the assembled gallery; the
  skip setting's route and its client hook, which are the per-playlist mutation precedent for a value
  validated, answered and refetched; and the playlist header tests, which already cover the menu's access
  gating and the share indicator's reveal.

## Out of Scope

- A pin control on the playlist detail; pinning is the library's own action.
- A cap on how many playlists an account pins.
- An explicit pin order, a drag, or a stored position.
- Favoriting a track, favoriting anything else, and any view that gathers favorites.
- A live event for the pin.
- The mobile client's own arrangement. This corpus is web only.

## Further Notes

- **The no-cap risk.** An account can pin every playlist it can see, and at that point the section holds the
  gallery and distinguishes nothing. That is accepted rather than capped, because the section's own size is
  the feedback and a refusal would be a worse answer than a full section.
- **The pin rides the menu, so it needs no narrow-arrangement figure.** The design record carries one record
  for both clients, and this corpus is web only. The item's overflow is where a playlist's actions already
  live, so the pin adds a menu item and nothing is placed on a cover; the card has no pin of its own to draw.
- **One decision of the library spec is narrowed and not replaced.** That spec decided the gallery is one list
  with no sections, on the grounds that a shared item reachable only from a section is a second meaning for
  the same thing and that a second section splits an empty gallery into two empty shelves. A pinned section
  is the account's own placement rather than a second meaning, and it is withdrawn when empty, so neither
  ground holds. The library spec keeps its status and gains a forward pointer, because it is not replaced,
  only narrowed.
- **The reversal is recorded once, and the word is not reused.** "Favorites" leaves the non-goals because the
  product decided this placement is wanted, and the feature is called a pin rather than a favorite: a
  favorite is a judgement about a thing, and this is a placement of it in one account's gallery. The
  glossary's mix-up list carries the pair so the two words do not become one.
- **The section is in name order, so unpinning and re-pinning moves nothing.** A pin is a placement and not a
  promotion: it lifts a playlist out of the list and into the section, and where it sits in either group is the
  name. An explicit order is the feature that would replace that, and it is out of scope.
