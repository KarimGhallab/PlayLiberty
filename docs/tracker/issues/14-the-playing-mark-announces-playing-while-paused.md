# 14: The playing mark announces "Playing" while paused

**State:** `resolved`
**Category:** `bug`

## Agent Brief

**Category:** bug
**Summary:** The equalizer mark carries a hard-coded `aria-label="Playing"`, but the track row draws it whenever the row is the queue's current track, paused included, so a screen reader is told "Playing" on a stopped queue.

**Current behavior:**
The strip is `role="img"` with a fixed `aria-label="Playing"`. The track row renders it whenever the row is the queue's current track, regardless of whether the queue is playing: the animation is frozen via `animation-play-state: paused`, but the label does not change. So on a paused queue the current row announces "Playing" while its own play control announces "Play <title>", and the two disagree. The header's mark is drawn only while the queue is playing, so the header does not have the problem; the row does.

**Desired behavior:**
The mark's announced state matches the queue. Either the strip takes the state and announces "Playing" while playing and "Paused" while paused, or the strip is `aria-hidden` and the row's own control label (which already carries the state) owns it. Whichever is chosen holds for the header's mark too, so the two surfaces agree.

**Key interfaces:**

- `TrackBars`' `aria-label`; the row already receives `playing`, so the state is available at the call site.
- The header's use of the same component.

**Acceptance criteria:**

- [x] The current row's mark announces "Playing" only while the queue is playing, and "Paused" (or nothing, if the strip becomes decorative) while it is paused.
- [x] The header's mark follows the same rule.
- [x] A test covers the paused and the playing labels.
- [x] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The strip's animation and its freeze-across-pause behavior.
- The visual design of the strip.

## Outcome

Done. The equalizer strip takes the queue state and announces it, so a held queue no longer says "Playing".

- `TrackBars` gained a `playing` prop, and its `role="img"` label is now "Playing" while the queue runs and "Paused" while it is held. The label is the state and not the row's presence, because the row is the current track in both states.
- The row passes its `playing` and the header passes its own, so the two surfaces take one rule from one component. The header draws its mark only while the queue plays, so it always reads "Playing"; the row draws its mark for the current track in both states and now reads the state. The strip's animation and its freeze across pause are untouched.

Verification: `pnpm run build`, `pnpm run lint`, and the unit suites (server 275, web 358). The paused and the playing labels are unit-tested in `TrackRow.test.tsx`; the header's existing mark test still holds. Not committed.

## Observed

`TrackBars` renders `role="img" aria-label="Playing"` with no state input. The track row renders it when `current` is true, independent of `playing`, so a paused current row still announces "Playing" while its control says "Play <title>".

## Expected

The mark's announcement tracks the queue: "Playing" while playing, "Paused" (or nothing) while paused, consistent with the row's own control label.

## Evidence

- `TrackBars.tsx`: `role="img" aria-label="Playing"`, no state prop.
- `TrackRow.tsx`: the strip renders under `current`, not `current && playing`.
- Impeccable audit, P3 "TrackBars always announces Playing".
