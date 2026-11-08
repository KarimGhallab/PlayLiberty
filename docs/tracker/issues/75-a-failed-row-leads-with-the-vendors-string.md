# 75: A failed row leads with the vendor's string

**State:** `resolved`
**Category:** `bug`

## Outcome

A failed row now leads with a catalog sentence chosen by the raw reason's class: unavailable, private, blocked, network, or a generic failure. The classification lives beside `problemSentence` in `shared/api/problem/problem.ts`; the row never prints the vendor's diagnostic as its lead. The state word and its failed tone are unchanged, and the sentence may wrap to two lines.

The raw reason sits behind a per-track disclosure, "Show details for {title}" / "Hide details for {title}". The disclosure and the raw block stack above the row's play layer, so a pointer, thumb or keyboard reaches them without playing the row; the raw block is capped at 120px and scrolls its own text.
