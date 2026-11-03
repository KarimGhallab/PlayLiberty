# 06: The card and the row survive font scale 2.0

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile UI still misses its contract](../../issues/106-the-mobile-ui-still-misses-its-contract.md)
**Blocked by:** None. Can start immediately.

## Observed

At font scale 2.0 the card's count wraps to two lines and the incomplete mark overlaps "À jour". The owner line
truncates to "Partagée par ...", and track titles truncate to about ten characters. Font scale 1.3 is clean.

## Expected

The card metadata does not overlap, and the owner and title keep their information. The identity's 1.3 cap is the
model for a fixed layout.

## Evidence

- The emulator at font scale 2.0: the card metadata overlap and the truncated title.
- `apps/mobile/src/views/library/PlaylistCard/PlaylistCard.tsx`: the count, incomplete mark and state share one row.
- `apps/mobile/src/views/playlist/TrackRow/TrackRow.tsx`: the title is one line with no cap.
- `apps/mobile/src/views/playlist/PlaylistIdentity/PlaylistIdentity.tsx`: `MAX_IDENTITY_SCALE` is 1.3.

## Acceptance criteria

- [x] At 2.0 the card metadata has no overlap and the state and incomplete mark are readable.
- [x] The owner line and the track title keep the name, by capping at 1.3 or by reflowing.
- [x] 1.0 and 1.3 are unchanged.
- [x] A test sets the font scale and asserts the layout.

## Outcome

The card's cell is fixed, so its count, incomplete mark, state and owner cap at 1.3, the same cap the identity uses;
the meta wraps and the owner takes two lines if the capped text still overflows. The track row is not fixed, so above
1.3 the title takes a second line instead of losing its name; 1.0 and 1.3 keep one line.

Tests pin the card's cap and the title's line count at 2.0 and 1.3. The emulator at 2.0 draws "71 pistes 4 À jour" on
one line with the owner complete and track titles over two lines; 1.0 and 1.3 are unchanged.

## Verification

`pnpm --filter @playliberty/mobile run test` and `pnpm --filter @playliberty/mobile run typecheck` pass. The emulator
at 1.0, 1.3 and 2.0 shows no overlap.
