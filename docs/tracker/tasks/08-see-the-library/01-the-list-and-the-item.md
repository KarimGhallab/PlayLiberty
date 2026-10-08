# 01: The list and the item

**Blocked by:** None. Can start immediately.
**Status:** resolved

## Outcome

Implemented and verified. `PlaylistHeader` is the new shared component, one identity block under `src/shared/components/`, and the library maps each playlist into it inside a `<li>`. It draws the cover, the name, the share indicator, the sync line and the count; the actions column (play, shuffle, overflow) is deliberately absent, because it belongs to the player ticket and this one owns the item the list needs.

Three decisions worth naming.

The cover and the name are both `Link`s to `/playlists/$playlistId`. The cover carries `aria-hidden` and `tabindex="-1"`, so exactly one link is announced per item and the name carries the label, which the tests assert by counting the links.

The share indicator is one glyph from three states, `own-private` (lock), `own-shared` (lock-share) and `collab` (user-share), chosen from `access` and `hasShares`. It is `role="img"` with its label, and its tooltip is a `role="presentation"` child, so the sentence is not announced twice.

The sync state word moved into `ui-foundation` as `syncStateLabel`, beside `formatLastSynced` and `formatTrackCount`, because the header's sync line is one wording both clients render. The count is drawn as a separate number and unit rather than through `formatTrackCount`, because the design steps the unit down a size; `trackCountUnit` is the shared piece it uses. A never-synced playlist reads `Up to date` for its state and `Never synced` for its time, which is the library specimen's own shape rather than the playlist detail's, where the state word itself is `Never synced`.

Tests: nine in `PlaylistHeader.test.tsx` (name and count, one announced link, the three share states, the three sync states, never-synced, axe) and four in `LibraryPage.test.tsx` (render and axe, owned and shared in one list, route order, no search/sort/filter/pagination control), plus one for `syncStateLabel`. The library test and the MSW handler now carry two playlists, one owned and one shared, so the ordering and the two access levels are exercised.

Verification: `pnpm run test` (215 server, 12 youtube, 14 ui-foundation, 3 tokens, 22 web), `pnpm run build`, `pnpm run lint`, `npx depcruise .` (125 modules, 0 violations), `npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` and `pnpm run design:check` all pass. `pnpm run script:unused-code` still fails on its pre-existing unused exports; nothing new was added to that list. No em dashes. Not committed.
