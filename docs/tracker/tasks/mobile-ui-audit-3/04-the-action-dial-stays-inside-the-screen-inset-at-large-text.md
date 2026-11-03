# 04: The action dial stays inside the screen inset at large text

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [Five gaps remain in the mobile UI](../../issues/107-five-gaps-remain-in-the-mobile-ui.md)
**Blocked by:** None. Can start immediately.

## Observed

At font scale 2.0 the gallery dial's "Synchroniser les 7 playlists" starts about 4dp from the screen edge, outside the
16dp content inset. A longer locale string would clip.

## Expected

The label starts at the content inset and wraps to two lines if needed, whatever the locale.

## Evidence

- The emulator at 2.0 with the dial open: the long label touches the left edge.
- `apps/mobile/src/shared/components/ActionDial/ActionDial.tsx`: the label has no maximum width, and the row is
  right-aligned.

## Acceptance criteria

- [x] At 2.0 the longest current label starts at the content inset and does not clip.
- [x] A label longer than the current one wraps instead of leaving the screen.
- [x] 1.0 is unchanged.
- [x] The emulator at 2.0 is the evidence, since the fix is presentation only.

## Outcome

The label takes a maximum width from the content column, the action and the gap, and wraps to two lines. The label
box grows with the text and the dial's rows, anchored at the bottom, grow upward. At 2.0 "Synchroniser les 7
playlists" wraps inside the inset; at 1.0 the label is one line and the dial is unchanged.

## Verification

`pnpm --filter @playliberty/mobile run test` and `pnpm --filter @playliberty/mobile run typecheck` pass, and the
emulator at 2.0 shows the label inside the inset.
