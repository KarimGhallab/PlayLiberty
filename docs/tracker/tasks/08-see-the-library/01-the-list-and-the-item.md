# 01: The list and the item

**What to build:** A listener lands on a list of the playlists they can see, their own and the ones shared with
them, in one list and the route's order, with no sections. Each item is the playlist header: the cover, the
name, the association count, the sync state and time, and a share indicator. The cover and the name both link
to the playlist, and the cover's link is hidden from the accessible name so a reader announces one link per
item. A syncing item says so, a failed one says so in the failed tone, and a playlist that has never synced
reads as never synced rather than as a fault. The count is the playlist's stored track count and is not a
promise of playability. This ticket builds the playlist header as the shared component the playlist detail and
the player bar will reuse, so no screen draws a second item that resembles it.

**Blocked by:** None. Can start immediately.

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] A populated library renders one item per playlist with its cover, name, count and sync line, in the order the route returned.
- [x] An owned playlist and a shared one are the same item in the same list, with no sections.
- [x] A playlist in `syncing` renders as syncing, a failed one renders the failed state, and a never-synced one reads as never synced rather than as a fault.
- [x] The cover and the name both navigate to the playlist, and the cover link is not separately announced.
- [x] The count shown is the stored track count, including tracks that are not playable.
- [x] The page has no search, sort, filter or pagination control, and the list is read once per page.
- [x] The library writes nothing on arrival, and the component has no axe violations.

## Outcome

Implemented and verified. `PlaylistHeader` is the new shared component, one identity block under `src/shared/components/`, and the library maps each playlist into it inside a `<li>`. It draws the cover, the name, the share indicator, the sync line and the count; the actions column (play, shuffle, overflow) is deliberately absent, because it belongs to the player ticket and this one owns the item the list needs.

Three decisions worth naming.

The cover and the name are both `Link`s to `/playlists/$playlistId`. The cover carries `aria-hidden` and `tabindex="-1"`, so exactly one link is announced per item and the name carries the label, which the tests assert by counting the links.

The share indicator is one glyph from three states, `own-private` (lock), `own-shared` (lock-share) and `collab` (user-share), chosen from `access` and `hasShares`. It is `role="img"` with its label, and its tooltip is a `role="presentation"` child, so the sentence is not announced twice.

The sync state word moved into `ui-foundation` as `syncStateLabel`, beside `formatLastSynced` and `formatTrackCount`, because the header's sync line is one wording both clients render. The count is drawn as a separate number and unit rather than through `formatTrackCount`, because the design steps the unit down a size; `trackCountUnit` is the shared piece it uses. A never-synced playlist reads `Up to date` for its state and `Never synced` for its time, which is the library specimen's own shape rather than the playlist detail's, where the state word itself is `Never synced`.

Tests: nine in `PlaylistHeader.test.tsx` (name and count, one announced link, the three share states, the three sync states, never-synced, axe) and four in `LibraryPage.test.tsx` (render and axe, owned and shared in one list, route order, no search/sort/filter/pagination control), plus one for `syncStateLabel`. The library test and the MSW handler now carry two playlists, one owned and one shared, so the ordering and the two access levels are exercised.

Verification: `pnpm run test` (215 server, 12 youtube, 14 ui-foundation, 3 tokens, 22 web), `pnpm run build`, `pnpm run lint`, `npx depcruise .` (125 modules, 0 violations), `npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` and `pnpm run design:check` all pass. `pnpm run script:unused-code` still fails on its pre-existing unused exports; nothing new was added to that list. No em dashes. Not committed.
