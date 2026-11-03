# 03: The retention promise has no word and no surface

**Status:** resolved
**Labels:** `bug`, `ready-for-human`
**Source:** [A design critique scores the mobile app 26/40](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** None. Needs the product wording decided, then it is agent work.

## Observed

Three gaps, one decision.

1. The card draws the not-stored count in a state tone with no word beside it (`PlaylistCard.tsx` count row), and
   `cardLabel` leaves it out even though its own comment claims the name carries what the visible parts say. TalkBack
   reads "Chine, You are a collaborator, 71 tracks, Up to date, Shared by Dev User" for a card showing a red 4.
2. "Up to date" is derived from `syncStatus` alone, so a playlist holding four tracks that were never stored reads as
   healthy while a red count sits beside the word.
3. Nothing counts or names remote-removed tracks, which `docs/GLOSSARY.md` calls "the promise of the product"
   (`fileStatus: stored` plus `sourceStatus: removed`, playable and retained). `sourceStatus` reaches the UI only
   through `TrackRow`'s tone. The only aggregate about removals is the Unavailable chip, which counts the tracks that
   were never saved.

So the app raises alarm about the removals it could not save and stays silent about the ones it did save.

## Expected

The red count has a word and is announced. The retention promise has one surface where sync health is shown, so a
user can confirm "these tracks lost their video and all of them still play" without opening the Stored filter and
scanning. One word per state, owned by `statusChips.ts`, in both languages.

## Evidence

- `apps/mobile/src/views/library/PlaylistCard/PlaylistCard.tsx`: `cardLabel` (the array built from name, mark, count,
  sync state, owner) and the count row that renders the incomplete figure.
- `apps/mobile/src/shared/trackState/statusChips.ts`: the five shipped chips, none of them remote-removed.
- `docs/GLOSSARY.md`: "Remote-removed: `fileStatus: stored` plus `sourceStatus: removed`. Playable and retained: the
  promise of the product", and "The user-facing word for `fileStatus: stored` is stored in English and stockée in
  French, wherever the state appears: the filter chip, the incomplete badge, the empty promise and the row."
- The 2026-11-03 screenshots: a library card reading "Up to date" beside a red 4, and an Unavailable filter holding
  four identical `[Deleted video]` rows with no art, `--:--` and no action.

## Acceptance criteria

- [x] The card's not-stored count carries a word, and that word is in `cardLabel` and announced.
- [x] A remote-removed figure or word appears where the playlist's health is read on the detail, sourced from the
      server counts rather than recomputed on the client.
- [x] The word lives in `statusChips.ts` or its owner beside it, not in a second vocabulary.
- [x] Chip and row use one term for the same fact.
- [x] Both languages carry the new key; the catalogs stay at parity.
- [x] A test covers the card name and the new figure.

## Outcome

The card's meta is now two rows: the count and the sync state on the first, and, when anything is missing, the icon
with `library.notDownloaded` as a sentence ("4 tracks are not stored", "4 pistes ne sont pas stockées"). The bare
number is gone, and `cardLabel` carries the same sentence after the count.

The retention figure needed a server fact the five buckets cannot express, so `PlaylistTracksPageSchema` gained
`remoteRemoved`: a count of `fileStatus: stored` plus `sourceStatus: removed`, computed by
`remoteRemovedCount` in `playlistService` and returned beside `counts`, never inside them. The buckets still sum to
the playlist's size, and a source removed before anything was stored stays in the Unavailable bucket.

It is drawn in the actions sheet's summary, under the run stamp and cells, as
`syncSummary.retained` ("1 track removed from YouTube is still stored"). That is the surface the design already gives
the sync evidence ("the run band above the actions and the checkbox below them, so the page itself keeps only the
header's sync line"), and it is the honest home: the identity block has a fixed height at two states and text capped at
1.3, so a fifth line there would overflow the compact header. The figure describes the playlist, not the last run, so
it survives a run that changed nothing. Verified on the emulator: "Aucun changement" and "1 piste retirée de YouTube
est toujours stockée" read together, which is the distinction the ticket asked for.

Tests: two on the band (the figure and its absence at zero), the card's word and name, and the server's count, which
also pins that the five buckets still sum to the playlist's size.

The web client draws the same figure from the same field and the same key: `SyncSummary` takes `remoteRemoved` and the
playlist's provider and prints `syncSummary.retained` under the run's counts, so both clients report retention once.
