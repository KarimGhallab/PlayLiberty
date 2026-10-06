# 11: The detail header loses the playlist name on a phone

**State:** `resolved`
**Category:** `bug`

## Agent Brief

**Category:** bug
**Summary:** At 390px, when the playlist is the current queue, the detail header's name collapses to about one character because the transport's action column starves the identity body.

**Current behavior:**
The header's row arrangement lays the cover, the identity body and the action column in one flex row, with the body flexing to whatever the other two leave. When the queue is on this playlist and the caller offers both steps, the action column holds the transport (a step, the 48px play, a step) and, under it, the shuffle and the menu: about 136px. At 390 the body is left with roughly 52px and the name element with about 24px, so a name of four characters renders as "T" plus an ellipsis. The name is the header's primary content, and on the detail route there is nowhere else the name appears.

**Desired behavior:**
At the narrow width the name keeps a readable column in every header state, the current-queue state included, so a normal playlist name is legible (or truncates at a sensible length, not at one character). The fix is a narrow-width layout change, not a smaller font: the name must not be starved by the action column. The desktop layout at and above the breakpoint is unchanged, and there is no horizontal overflow at 390.

**Key interfaces:**

- `PlaylistHeader`'s row arrangement markup and its identity body / action column; the card arrangement already solves the same problem with its over-artwork action band, so a consistent answer is welcome.
- `useMediaQuery` / `MOBILE_QUERY` already pick the arrangement at the 767px line; the layout fix must hold at that same line.

**Acceptance criteria:**

- [ ] At 390, with the playlist as the current queue, the name renders its text up to a reasonable truncation (not one character); a name of about ten characters is readable.
- [ ] The same holds while the playlist is not the current queue.
- [ ] There is no horizontal overflow at 390.
- [ ] The desktop layout at and above 768 is unchanged.
- [ ] A test covers the narrow arrangement with the transport shown and asserts the name is not starved.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The card arrangement, which already fits.
- The transport's behavior, its steps or its availability rules.
- Localization.

## Outcome

Done. The detail's header keeps a real name column at 390 in every state, the current-queue state included.

- The narrow row wraps its action column onto a line of its own, so the identity body takes the whole width beside the cover instead of the ~52px the fixed action column left it. The actions hold the wrapped line as a row, and they keep their 44px targets.
- The wrap is scoped to the detail's header, which is the header drawn as the page heading: a new `data-heading` attribute on the component root picks it out, so the library's item, which already fits its line, is unchanged.
- The transport and its availability rules are untouched, and the desktop row at and above 768 is untouched.

Measured at 390 with the playlist playing: the name element is 47px of content and renders in full (was 24px of a 47px content box, "T" plus an ellipsis), the body 208px, the row 188px tall. The library's row stays 120px on one line. No horizontal overflow.

Verification: `pnpm run build`, `pnpm run lint`, and the unit suites (server 272, web 349). Not committed.

## Observed

At 390, on the detail route with the playlist playing, the header's name is clipped to a single character. Measured in the browser at 390:

- name element: 24px wide, 47px of content
- identity body: 52px
- action column: 136px

The screenshot shows "T" and the share lock where "Test" should read.

## Expected

The name keeps a readable column at 390, in the current-queue state as in every other. The card arrangement already places its controls in an overlay band so the identity block is full width; the row arrangement needs an equivalent answer at the narrow width.

## Evidence

- Live measurement at 390: name 24px / content 47px, body 52px, actions 136px.
- Screenshot `audit-detail-390.jpeg`.
- Impeccable audit, P1 "Detail header name truncates to one character at 390".
- The card arrangement's action band (`__macts`) is the in-repo precedent for keeping the identity full width.
