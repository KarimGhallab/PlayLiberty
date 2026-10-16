# 06: The row hides its door and the lock hides its meaning

**State:** `resolved`
**Category:** `enhancement`

## Outcome

The share indicator's meaning is available without a pointer, and the tooltip answers Escape. The mark joins the tab order with `tabIndex={0}` and keeps `role="img"` and its `aria-label`, because it is an indicator and not a control, and it takes the same `--accent` focus ring every control takes. The tooltip reveals on `:focus-visible` as well as `:hover` and stays a child of the mark, and Escape on the mark's own keydown sets `shareTipDismissed`, rendered as `data-tip-dismissed`, which outranks both reveal rules and lifts on blur, focus and mouse-enter. The tooltip stays `role="presentation"` and keeps its words, so the state is not announced twice.
