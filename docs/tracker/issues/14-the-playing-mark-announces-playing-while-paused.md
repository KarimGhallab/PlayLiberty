# 14: The playing mark announces "Playing" while paused

**State:** `resolved`
**Category:** `bug`

## Outcome

The equalizer strip takes the queue state and announces it, so a held queue no longer says "Playing". `TrackBars` gained a `playing` prop, and its `role="img"` label is now "Playing" while the queue runs and "Paused" while it is held, because the row is the current track in both states. The row passes its `playing` and the header passes its own, so the two surfaces take one rule from one component, and the strip's animation and its freeze across pause are untouched.
