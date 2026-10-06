# 06: The row hides its door and the lock hides its meaning

**State:** `needs-triage`
**Category:** `enhancement`

## Observed

Two accessibility gaps on the library row:

1. **The row is not a link.** The row is a `div` with a click handler
   ([`PlaylistHeader.tsx:635-639`](../../../apps/web/src/shared/components/PlaylistHeader/PlaylistHeader.tsx)),
   the cover is a `Link` with `aria-hidden="true"` and `tabIndex={-1}` (`641-656`), so the only keyboard
   path into a playlist is the name link. Middle-click or Cmd-click on the row cannot open it in a new
   tab.
2. **The share indicator's tooltip is hover-only.** The lock/share mark carries its words in a
   `role="presentation"` span
   ([`PlaylistHeader.tsx:550-570`](../../../apps/web/src/shared/components/PlaylistHeader/PlaylistHeader.tsx))
   revealed on hover. The design record admits it cannot answer Escape, which WCAG 1.4.13 requires
   ([`playlist-header.md:197`](../../design-system/components/playlist-header.md)), so a sighted keyboard
   or touch user cannot decode the glyph.

## Expected

The row's door is reachable and openable the way a link is (keyboard, new tab), and the share indicator's
meaning is available without a pointer (focus, a dismissible tooltip, or a visible label), or the record
states the accepted alternative.

## Evidence

- `PlaylistHeader.tsx:635-656` (row div plus hidden cover link) and `550-570` (share mark and tooltip).
- [`playlist-header.md:197-206`](../../design-system/components/playlist-header.md) records the hover-only
  tooltip and the Escape gap.
- Critique run `views-library-librarypage-librarypage-tsx-a51b86be`, Persona red flags (Sam, Alex, Casey)
  and Minor Observations.
