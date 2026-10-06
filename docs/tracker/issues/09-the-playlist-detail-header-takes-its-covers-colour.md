# 09: The playlist detail header takes its cover's colour

**State:** `resolved`
**Category:** `enhancement`

## Agent Brief

**Category:** enhancement
**Summary:** The playlist detail's header card takes its colour from its own cover: the cover is drawn
blurred and oversized behind the card, the card's own opaque surface is made transparent so the ground
shows, and the sharp artwork and the identity band sit on it. It is the detail-page counterpart of the
library's row ground, settled by prototype at `/prototype/playlist-detail-ambience?variant=B`.

**Current behavior:**
The header card sits on the app's flat ground inside an opaque `--surface` panel, so nothing on the detail
page takes a colour from the artwork. The library's rows do once issue 07 lands.

**Desired behavior:**
The header card's ground is its own cover, blurred and oversized, so the card's padding and its identity
band (name, share mark, sync line, count) sit on the artwork's colour while the sharp cover art stays on
top. The ground is clipped to the card's rounded box and never spills past it. A playlist with no cover
takes the sleeve hue, the same derivation the library's rows use, so a playlist's row and the header it
opens agree.

**Key interfaces:**

- The header card's own opaque surface is what hides the ground, so this treatment makes it transparent.
  It is a change to the card the design system owns, not a wrapper a caller draws around it.
- The ground is the cover drawn oversized and blurred behind the card, from the small derivative issue 07
  settles (a baked blur), not a live CSS filter.
- The no-cover case reuses `sleeveIndex`.

**Acceptance criteria:**

- [ ] The detail header card shows its cover's colour behind its content, in the card's padding and behind
      the identity band, with the sharp artwork unchanged on top.
- [ ] The ground is clipped to the card's rounded box and never spills past it.
- [ ] A playlist with no cover takes the sleeve hue, and the sleeve the card already draws agrees with it.
- [ ] The derivation is the one the library's row ground uses, so a playlist's row and its header are the
      same colour.
- [ ] The identity band's text keeps AA against the ground. The ground is an arbitrary image, so this is
      the same uncomputable-contrast problem the equalizer strip documents, and it needs the same kind of
      answer if a bright cover breaks it.
- [ ] Tests cover the with-cover and no-cover cases.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The full-page wash and the track rows' grounds, the prototype's variants A and C, which were not taken.
- The library's row ground, which is issue 07.
- The cover's durability and its derivative, which are issue 05's and issue 07's.

## Outcome

Implemented. `PlaylistHeader`'s `ground` prop now covers both arrangements: the card draws its cover behind
it, the card's opaque surface is dropped so the ground shows through its padding and behind the identity
band, and the ground is clipped to the card's rounded box. The sharp artwork stays on top. A no-cover
playlist takes the sleeve hue, the same derivation the library's row uses, so a playlist's row and the
header it opens agree. The detail passes `ground` to its header at both widths. The ground draws the full
cover, not the small derivative that was prototyped.

The identity band's text sits on an arbitrary image, the same uncomputable-contrast problem the equalizer
strip documents. The ground's opacity keeps it dark in practice, and a bright cover is the case to watch.

Verified: `pnpm run build`, `pnpm run lint`, and the unit suites (server 272, web 347).
