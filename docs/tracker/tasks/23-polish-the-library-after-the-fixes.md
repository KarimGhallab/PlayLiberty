# 23: Polish the library after the fixes

**Status:** resolved

## Outcome

Both pages that dock the bar now end at `calc(97px + var(--space-5))`, the bar's own 97px plus the gap the header uses above the list, since the old 88px left the last row 9px behind the bar. `LibrarySkeleton.tsx` draws five rows of the item's own 136px, a 96px cover and two bars where the name and the sync line go, with the shapes `aria-hidden` and the status sentence "Loading playlists." the only thing read, and reduced motion drops the pulse. The list keeps the header's between-rows rule and gains one closing hairline under the last row while the top stays open, and `.field__message` is now `--weight-medium`, with the shipped 76-character sentence wrapping to two lines and the invalid dialog at 296px. The dot stays the sync line's own mark in every state rather than a third statement of the fault, so the fault is the word and the hairline.

See [`08-see-the-library`](../specs/08-see-the-library.md).
