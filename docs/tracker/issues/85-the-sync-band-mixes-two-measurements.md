# 85: The sync band mixes two measurements

**State:** `resolved`
**Category:** `bug`

**Blocked by:** None. Can start immediately.

## Outcome

The stamp now sits above the band and frames it: `Last sync 55 minutes ago` in English, `Dernière synchronisation : il y a 55 minutes` in French. The run's zero cells are not drawn, so a run that added 26 and left 3 failed reads only `26 added` and `3 still failed`; a run that changed nothing says `Nothing changed` / `Aucun changement` instead of four zeroes. The four cells keep their order and tones for every count that is drawn.

The live failed cell says `still failed` / `toujours en échec`, restoring the qualifier issue 68 settled so it cannot be read as a run outcome; its source remains the live playlist count. The French relative-time fragments are lowercase now, so they compose inside the frame and after the header separator rather than starting a second sentence.

Verification: `pnpm run build` and `pnpm run lint` pass; the unit suites pass (tokens 2, i18n 39, youtube 31, ui-foundation 6, server 386, web 526). The new tests cover the frame above the band, the hidden zeroes and the nothing-changed sentence, the live `still failed` word beside the run counts, and the one-sentence French stamp.
