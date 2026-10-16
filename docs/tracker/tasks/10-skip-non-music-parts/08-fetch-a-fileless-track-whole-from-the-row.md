# 08: Fetch a fileless track whole from the row

**Status:** resolved

## Outcome

The row's lane is one control, the actions menu, and what its menu holds is the row's rule: a failed fileless track the caller can write gets **Retry**, **Fetch whole** and **Remove from playlist**, every other curatable row gets **Remove from playlist** alone, and a row the caller cannot curate keeps its reserved, inert lane. The lane stays **28px**, so the title column keeps its 516px, and the owner chose variant C, the single menu, over four drawn variants, so the retry is no longer one press and the title column pays nothing for the bypass; the retry sits in the menu rather than beside it in the lane. The bypass is failed-only, not "no stored file": the route also accepts `pending`, but a pending track keeps its plain actions menu. A track whose recorded `skipNonMusic` is false carries **`Full length`** on its state line, muted and never a tone, because it is a fact about the track and not a fault.

See [`10-skip-non-music-parts`](../../specs/10-skip-non-music-parts.md).
