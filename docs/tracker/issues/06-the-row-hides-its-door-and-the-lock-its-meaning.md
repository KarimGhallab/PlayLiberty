# 06: The row hides its door and the lock hides its meaning

**State:** `resolved`
**Category:** `enhancement`

## Outcome

Done. The share indicator's meaning is available without a pointer, and the tooltip answers Escape.

- The mark joins the tab order with `tabIndex={0}` and keeps `role="img"` and its `aria-label`: it is an
  indicator and not a control, so it is focusable without becoming a button. It takes the same `--accent`
  focus ring every control takes.
- The tooltip reveals on `:focus-visible` as well as `:hover`, and stays a child of the mark, so the pointer
  can move onto it without dismissing it. `:focus-visible` rather than `:focus` keeps a mouse press from
  pinning a tip the pointer never asked for.
- Escape on the mark's own keydown sets `shareTipDismissed`, rendered as `data-tip-dismissed`, which outranks
  both reveal rules in the stylesheet. The flag lifts on blur, focus and mouse-enter, so the tip returns on the
  next focus or hover. Handling Escape on the mark means it dismisses only while the mark holds focus.
- The tooltip stays `role="presentation"` and keeps its words, so the state is not announced twice.
- Tests: the mark is a tab stop and takes focus; Escape sets the flag and blur plus a later focus clears it; a
  mouse-enter clears it; the tooltip is decorative. The axe run on the default header stays clean.
- Record: [`playlist-header.md`](../../design-system/components/playlist-header.md) now states the mark is
  focusable, the tip reveals on focus, and Escape dismisses it.

Verification: `pnpm run test:unit` (PlaylistHeader 31 tests, axe included) and `pnpm run lint` pass. Not
committed.
