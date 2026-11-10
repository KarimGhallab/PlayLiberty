# 02: Put the cover upload behind one interface

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`@playliberty/ui-foundation` exports `coverUpload`: the accepted types, the byte limit, the zoom and pan steps, the reducer, the selectors and the verdict helper. The state owns the chosen file, the measured size, the framing, the verdict, the discard and remove confirmations, the busy lock and the submission.

The web dialog and the mobile sheet hold the state with `useReducer`. The file picker, the preview element and the stage gesture stay in the views. Both views delete their local constants, validation and confirmation logic. The server still normalises the uploaded bytes.

Verification: `pnpm run build`, `pnpm run lint:check`, `pnpm run test:unit` (ui-foundation 70, web 616, mobile 601, and the other packages), and a real-runtime smoke of the built machine that produced the crop fractions, refused a wrong type and an oversize file, asked before discard and remove, and kept a busy window closed.

See [`mobile-architecture-review`](TICKETS.md).
