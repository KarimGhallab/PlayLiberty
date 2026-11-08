# 07: Share the track-state vocabulary

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-scaffold-the-shared-client-packages.md).

## Observed

The five-state chip table exists per client. Mobile materializes value, label, tone and empty key. Web enumerates value and label, then derives the total with a five-term sum. The failure sentence table is byte-identical on both clients, and so is the track-link notice module. The tone map is a six-entry table in mobile TypeScript and again in web CSS.

The two stream classifiers disagree. Web treats `403`, `404` and `409` as gone. Mobile treats only `404` as gone, so a fileless track on mobile is never skipped.

## Expected

`@playliberty/ui-foundation` owns the status table, the total and the stream verdict. `@playliberty/i18n` owns the failure sentences and the track-link notices, beside the state label and the problem detail.

One gone set serves both clients: `403`, `404` and `409`. A `409` means no stored media, so the entry cannot play. A `403` is a definitive refusal. Mobile drops both, as web does.

The colour mapping stays per app. Mobile keeps its token colour lookup, and web keeps its CSS.

## Evidence

- `statusChips.ts` (49 lines) on mobile, `PlaylistFilterChips.tsx` (104 lines) with its five-term total on web.
- `failureSentence.ts` is 23 lines on both sides, with the same five-case switch.
- `trackLinkNotice.ts` is 44 lines on both sides, byte-identical.
- Web gone set: `403`, `404`, `409`. Mobile gone set: `404`.
- Web already exports the state label and the problem detail from `i18n`, so the sentence belongs there.

## Acceptance criteria

- [x] One five-state table carries the value, the label key, the tone and the empty key.
- [x] One total function sums the five states.
- [x] The failure sentences and the track-link notices live in `i18n`, with no copy in either app.
- [x] One gone set serves both stream classifiers.
- [x] Mobile drops a `403` and a `409` as web does.
- [x] The colour mapping stays in each app.
- [x] The web and mobile chip rails still draw the same words in the same order.

## Outcome

`@playliberty/ui-foundation` owns the vocabulary: `TRACK_STATUS_CHIPS` for the five file states, `RETAINED_CHIP` and `STATUS_CHIPS` for the rails, `statusCount`, `totalStatusCount`, `visibleStatusChips`, and the stream verdict (`StreamFailureKind`, `isGoneStreamStatus`, `streamFailureKind`) whose gone set is `403`, `404` and `409`.

`@playliberty/i18n` owns `failureSentence` and the track-link notices (`cannotPlayNotice`, `unknownTrackNotice`, `leftPlaylistNotice`). The app copies and their tests are deleted.

Web builds its rail from the shared table and maps `TrackTone` to its own `ChipTone` classes. Mobile rails import the shared table and helpers. Mobile's stream classifier now drops a `403` and a `409` as web does; web keeps its probe and both call the shared verdict.

Verification: `pnpm run build` and `pnpm run lint:check` pass; ui-foundation runs 34 tests and i18n 51; `pnpm run test:unit` passes across the workspace.

## Verification

The package suite covers the five states and the total. A mobile test proves an entry is dropped on a `409`, and a web test proves the same on a `403`. `pnpm --filter @playliberty/web test` and `pnpm --filter @playliberty/mobile test` pass. `pnpm run build` and `pnpm run lint:check` pass.
