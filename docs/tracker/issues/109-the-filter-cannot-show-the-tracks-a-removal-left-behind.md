# 109: The filter cannot show the tracks a removal left behind

**State:** `resolved`
**Category:** `enhancement`

## Outcome

Resolved by the three tickets in [`removed-source-view`](../tasks/removed-source-view/TICKETS.md). The shared layer adds
`TrackFilterState`, the `remoteRemoved` figure on `PlaylistWithCounts`, the `tone-retained` token and the retained
copy. The phone and the web each draw the retained chip last, hide it at zero, filter their lists with it, and name the
provider in the empty sentence.

## Observed

A playlist's health is filtered by the five file statuses only: stored, pending, downloading, failed, unavailable. The
figure that reports the product's promise (`remoteRemoved`, the stored tracks whose source removed them) has no view,
so a user reading "1 track removed from YouTube is still stored" cannot ask the list to show it. `remoteRemoved` exists
on `PlaylistTracksPage` but nowhere else, and the query refuses any state outside `TrackFileStatus`.

## Settled decisions

This issue is the record of a design interview held on 2026-11-03. Every branch was decided; the alternatives are kept
so a later reader knows what was rejected and why.

| Question                | Decision                                                                                | Rejected                                                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| What the filter selects | `fileStatus: stored` and `sourceStatus: removed`, the retained tracks                   | Any source-removed track (mixes the kept with the lost), stored tracks whose source is still there (nothing to prove) |
| Surfaces                | The playlist detail's rail and the gallery's rail, on both clients                      | Detail only; one client only                                                                                          |
| Entry                   | A chip in each status rail, last, after Unavailable                                     | A second rail; the retention sentence as a pressable filter                                                           |
| Word                    | "Removed from {provider}", reusing the row's words                                      | "Kept", "Still stored", "Source removed"                                                                              |
| Tone                    | A new token, `tone-retained` `#d886b6` (plum), a filter tone and not a track-state tone | The removed grey (equals `muted`, so a selected chip reads unselected); stored, cyan, chartreuse                      |
| Order                   | Last, on both clients                                                                   | Second, after Stored; a different order per client                                                                    |
| Gallery count           | Tracks, like its five siblings, though the press filters playlists                      | Counting playlists; counting both                                                                                     |
| Zero                    | Hidden at zero, on both rails                                                           | Following each rail's current zero rule                                                                               |
| Empty copy              | The negation of the retention line: "No track removed from {provider} is still stored"  | "No kept tracks"; a new explanatory sentence                                                                          |
| Request                 | A synthetic filter value, `state=remoteRemoved`, on the existing parameter              | A composable `source` parameter; a member on `TrackFileStatus`                                                        |
| Tracker shape           | One issue, three tickets: the shared layer, then the phone and the web                  | One ticket for everything; a spec first                                                                               |

Accepted ambiguity, recorded rather than overlooked: the chip reads "Removed from {provider}", which is also the line
under an Unavailable row, though this view excludes those tracks. The counts differ, the chip's word describes the
source fact, and re-wording the row would reopen the one-word-per-state rule settled by
[ticket 84](84-one-word-per-track-state.md).

**Superseded on 2026-11-05.** That ambiguity is now a defect, and the user chose to change the rule rather than keep it:
a row states two facts, one word each, so a kept track reads **retained** and a lost one **never stored**, and the chip
is **retained** too. The work is [ticket 01 of mobile-ui-critique-2](../tasks/mobile-ui-critique-2/01-the-row-cannot-tell-a-kept-track-from-a-lost-one.md).

Consequences worth stating: the rail stops being a partition of the playlist, since the chip's count is a subset of
Stored and All stays the playlist size; the chip's tone is not a track-state tone, so `ui-foundation`'s `TrackTone`
mapping stays as it is; the French label needs a plural form because it names many tracks, unlike the row's singular.

## Work

The tickets are in [`removed-source-view/TICKETS.md`](../tasks/removed-source-view/TICKETS.md). `01` carries the token,
the copy, the design record, the contract and the server; `02` and `03` build on it in parallel. This issue stays open
until every ticket resolves.
