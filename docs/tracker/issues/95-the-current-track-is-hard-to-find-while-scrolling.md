# 95: The current track is hard to find while scrolling

**State:** `resolved`
**Category:** `enhancement`

## Outcome

The current row in the detail's track list now rests on `current-surface`, the accent at a quiet dose, so a long list can be scanned without the row reading as another filled action. It keeps that ground through hover and focus and drops its bottom rule, so the row reads as a band rather than a card. The subtitle names the state, `Playing` while the queue runs and `Paused` while it is held, with an accent dot, and the title gains medium weight.

The artwork equalizer is now decorative because the visible word carries the state; screen readers hear the word once, and the strip no longer owns an `aria-label`. The state still never rests on colour alone.

`docs/DESIGN.md` records the quiet accent ground as a detail use of the accent. The open wash was chosen from the four band finishes; the real `TrackRow` was checked at 1280 on a fixture list, and the same finish at 390.

Verification: `pnpm run build`, `pnpm run lint` and `pnpm test:unit` pass (web 566, server 381, tokens 2). The e2e suite was not run here because it needs the full instance; its two current-row helpers (`arrange`, `shuffle`) now find the visible word instead of the equalizer's `aria-label`.
