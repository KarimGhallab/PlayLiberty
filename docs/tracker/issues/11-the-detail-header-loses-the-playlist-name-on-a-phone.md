# 11: The detail header loses the playlist name on a phone

**State:** `resolved`
**Category:** `bug`

## Outcome

The detail's header keeps a real name column at 390 in every state, the current-queue state included. The narrow row wraps its action column onto a line of its own, so the identity body takes the whole width beside the cover instead of the ~52px the fixed action column left it, and the wrap is scoped to the detail's header by a new `data-heading` attribute on the component root, leaving the library's item unchanged. Measured at 390 with the playlist playing: the name element is 47px of content and renders in full (was 24px of a 47px content box), the body 208px, the row 188px tall, while the library's row stays 120px on one line with no horizontal overflow. The transport and its availability rules and the desktop row at and above 768 are untouched.
