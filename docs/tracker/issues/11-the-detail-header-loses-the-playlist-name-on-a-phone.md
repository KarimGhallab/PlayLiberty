# 11: The detail header loses the playlist name on a phone

**State:** `resolved`
**Category:** `bug`

## Outcome

Done. The detail's header keeps a real name column at 390 in every state, the current-queue state included.

- The narrow row wraps its action column onto a line of its own, so the identity body takes the whole width beside the cover instead of the ~52px the fixed action column left it. The actions hold the wrapped line as a row, and they keep their 44px targets.
- The wrap is scoped to the detail's header, which is the header drawn as the page heading: a new `data-heading` attribute on the component root picks it out, so the library's item, which already fits its line, is unchanged.
- The transport and its availability rules are untouched, and the desktop row at and above 768 is untouched.

Measured at 390 with the playlist playing: the name element is 47px of content and renders in full (was 24px of a 47px content box, "T" plus an ellipsis), the body 208px, the row 188px tall. The library's row stays 120px on one line. No horizontal overflow.

Verification: `pnpm run build`, `pnpm run lint`, and the unit suites (server 272, web 349). Not committed.
