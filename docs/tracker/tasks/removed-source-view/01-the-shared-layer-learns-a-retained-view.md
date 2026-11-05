# 01: The shared layer learns a retained view

**Status:** open
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The filter cannot show the tracks a removal left behind](../../issues/109-the-filter-cannot-show-the-tracks-a-removal-left-behind.md)
**Blocked by:** None. Can start immediately. Blocks [`02`](02-the-phone-shows-the-retained-view.md) and
[`03`](03-the-web-shows-the-retained-view.md).

## Observed

The tracks query accepts only `z.enum(TrackFileStatus)`; the server's predicate and its total are two inline ternaries
keyed on a file status; `PlaylistWithCounts` carries only the five buckets, so the gallery cannot aggregate the figure;
and no token, word or empty sentence exists for a retained view.

## Expected

One shared layer that both clients can build on:

- `state=remoteRemoved` selects the stored tracks whose source was removed, and its total is that figure.
- `PlaylistWithCounts` carries `remoteRemoved` beside `counts`, filled per playlist.
- A `tone-retained` token exists and is emitted to both clients.
- The chip's word and its empty sentence exist in both languages.
- The design record says the rail holds views, not buckets, and that this tone is a filter tone.

## Evidence

- `packages/contracts/src/schemas.ts`: `PlaylistTracksQuerySchema` (`state: z.enum(TrackFileStatus).optional()`),
  `PlaylistTracksPageSchema` (already has `remoteRemoved`), `PlaylistWithCountsSchema` (counts only).
- `apps/server/src/features/playlists/playlistService.ts`: the `where` and `total` ternaries in
  `listPlaylistTracksForAccount`; `remoteRemovedCount`; `listPlaylistsForAccount` attaching `counts` per playlist.
- `packages/tokens/src/values.ts`: the tone block, `tone-removed` equals `muted`.
- `packages/i18n/src/en.ts` and `fr.ts`: `trackState.*`, `detail.filterEmpty.*`, `syncSummary.retained`.
- `docs/DESIGN.md`: "Track states", "Colour", and the rail paragraphs.

## Work

1. **Contract.** Add a filter union beside the enum, e.g. `TrackFilterState = TrackFileStatus | 'remoteRemoved'`,
   exported from `packages/contracts`, and widen `PlaylistTracksQuerySchema.state` to it. Never add the value to
   `TrackFileStatus`. Add `remoteRemoved: nonNegative` to `PlaylistWithCountsSchema`.
2. **Server.** Branch the predicate once: `and(playlistId, fileStatus = stored, sourceStatus = removed)`. Branch the
   total to `remoteRemovedCount`. Fill `PlaylistWithCounts.remoteRemoved` in `listPlaylistsForAccount` from a grouped
   query, not one count per playlist.
3. **Token.** `tone-retained` `#d886b6` in `values.ts`, emitted to `tokens.css` and the RN token module like the other
   tones. Do not add it to `ui-foundation`'s `TrackTone`.
4. **Copy.** The chip's label reuses the row's words with a plural form for French:
   en "Removed from {provider}", fr "Retirées de {provider}", one key beside `trackState.removedFrom`. The empty
   sentence negates the retention line: en "No track removed from {provider} is still stored", fr
   "Aucune piste retirée de {provider} n'est toujours stockée", keyed beside `detail.filterEmpty`.
5. **Record.** One or two sentences in `docs/DESIGN.md`: the status rail holds views and its counts are not a partition,
   and the retained chip's tone marks the view while a removed row keeps the removed grey.

## Acceptance criteria

- [ ] `state=remoteRemoved` returns only stored tracks whose source is removed, and `total` equals the page's
      `remoteRemoved` figure.
- [ ] The five counts are unchanged by the filter and still sum to `trackCount`; an unknown state is still refused.
- [ ] `PlaylistWithCounts.remoteRemoved` is required, filled for every playlist in one query, and `0` when nothing is
      retained.
- [ ] `tone-retained` reaches both clients' styles, and nothing reads it as a track state.
- [ ] The chip's word and empty sentence exist in both catalogs, at parity, with the provider interpolated.
- [ ] `docs/DESIGN.md` states the rail/partition and the filter-tone rule once.
- [ ] Tests: the predicate, the total, the refusals, the per-playlist figure, and the copy in both languages.
