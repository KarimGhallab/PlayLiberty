# 74: The filter chips and the sort are 36px targets

**State:** `resolved`
**Category:** `bug`

## Outcome

Each chip now carries a transparent 44x44 box on `::after`, centred on its 36px drawn box; the selection dot stays on `::before`. The sort carries the same box on `::before`, leaving the open menu's 2px rule on `::after`. The drawn chips, sort, and row rhythm are unchanged.

On a phone the chip rail is a horizontal scroll container, which would clip the box's four-pixel reach above and below. The rail gains four pixels of block padding with an equal negative block margin, so the target stays inside the scroll box while the chip's painted position holds.
