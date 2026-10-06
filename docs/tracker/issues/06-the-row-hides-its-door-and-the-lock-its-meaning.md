# 06: The row hides its door and the lock hides its meaning

**State:** `resolved`
**Category:** `enhancement`

## Agent Brief

**Category:** enhancement
**Summary:** The share indicator's tooltip is hover-only, so a sighted keyboard or touch user cannot decode
the glyph. Make it satisfy WCAG 1.4.13: focus reveals it, Escape dismisses it, and it persists while hovered
or focused. The row-door half is confirmed as the record's accepted alternative and needs no change.

**Current behavior:**
The share mark is a `span` with `role="img"` and an `aria-label` carrying the state, and a nested
`role="presentation"` span carrying the same words as a visual tooltip. The tooltip is `display: none` and is
shown by a `:hover` rule only. The mark is not focusable, so a sighted keyboard user cannot reveal it and a
touch user has no hover at all. Escape does nothing.

**Desired behavior:**
The mark joins the tab order as a focusable indicator, not a control, and keeps its accessible name. The
tooltip reveals on focus as well as hover and persists while either holds. Escape dismisses it while focus
stays on the mark, and it returns on the next focus or hover. The tooltip stays a child of the mark, so the
pointer can move onto it without dismissing it, which the structure already satisfies.

**Key interfaces:**

- The share mark becomes focusable and keeps `role="img"` and its `aria-label`; it stays an indicator, not a
  button.
- The tooltip reveals on `:focus-visible` as well as `:hover`, and a dismissed flag resets on blur and on the
  next focus or hover.
- Escape is handled on the mark's own keydown, so it dismisses only while the mark holds focus.
- The tooltip stays `role="presentation"`, so the state is not announced twice.

**Acceptance criteria:**

- [x] The share mark is in the tab order and reveals its tooltip on focus, not only on hover.
- [x] Escape dismisses the tooltip while the mark keeps focus, and the next focus or hover reveals it again.
- [x] The tooltip persists while the mark is hovered or focused, and the pointer can move onto it without
      dismissing it.
- [x] The mark keeps its accessible name, and the tooltip remains decorative so the state is not read twice.
- [x] Tests cover: focus reveals the tooltip, Escape hides it, a later focus reveals it again, and the mark is
      reachable by keyboard.
- [x] The playlist header's design record is updated: it currently records that the block cannot answer
      Escape; it now can, and the mark is focusable.
- [x] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The row door. Confirmed as the record's accepted alternative: the name is the row's one link and tab stop,
  the row press is the pointer's extra door, and nothing changes.
- A visible label in place of the tooltip.
- Localization. The new copy stays plain English like the surrounding code; wiring it into the catalog
  belongs to spec 11.

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
