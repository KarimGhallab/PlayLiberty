# 11: Share the egress vocabulary

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## Observed

The web egress page and the mobile egress screen copy the same four mappings. Each turns an egress status into a word, a stored failure reason into a sentence, a timestamp into a relative time or a never word, and a switch or check result into a notice. The two copies of the first three are line for line the same.

## Expected

`@playliberty/i18n` owns the egress words. It exposes the status label, the reason label, the time label and the action outcome. Each screen keeps its own surface: a toast stack on web, a notice on mobile.

## Evidence

- Web defines `statusLabel`, `reasonLabel` and `timeOf` at lines 49 to 85.
- Mobile defines the same three at lines 57 to 105.
- Both map a switch or check result to the same four message keys in the mutation callbacks.

## Acceptance criteria

- [x] `i18n` owns the egress status word, the reason sentence and the time sentence.
- [x] `i18n` owns the switch and check outcome message and detail.
- [x] Both screens delete their local copies and call the shared functions.
- [x] The package suite covers every status, every known reason and an unknown reason.

## Outcome

`@playliberty/i18n` exports `EgressAction`, `EgressNotice`, `egressStatusLabel`, `egressReasonLabel`, `egressTimeLabel`, `egressSuccessNotice`, `egressUnreachableNotice` and `egressFailureNotice`. The status table is exhaustive over `EgressStatus`, and an unknown reason falls back to the generic sentence.

The web egress page and the mobile egress screen delete their local status, reason and time helpers and their local message keys. Web keeps its toast stack, mobile keeps its notice.

Verification: the i18n suite runs 60 tests, the web egress suite 12, the mobile egress suites 22. `pnpm run build`, `pnpm run lint:check` and `pnpm run test:unit` pass.

## Verification

`pnpm --filter @playliberty/i18n test` proves the mappings. `pnpm --filter @playliberty/web test` and `pnpm --filter @playliberty/mobile test` pass. `pnpm run build` and `pnpm run lint:check` pass.
