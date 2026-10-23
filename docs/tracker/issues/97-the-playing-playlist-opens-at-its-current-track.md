# 97: The playing playlist opens at its current track

**State:** `resolved`
**Category:** `enhancement`

## Outcome

Opening the playlist that owns the queue now lands the list on its current row instead of the top of the page. The jump is instant, with no smooth scroll, and the row is centred.

The router resets a client-side navigation to the top after a cached route renders, so the landing runs on the next task; that makes the first open and a cached re-open both finish on the row instead of being pulled back to the top. The Chrome check used a 638-track playlist whose current row was the 201st and a second, cached navigation to it.

The decision is made once per open. A playlist that is not the queue stays at the top, and a track change after the page has landed, or a later start on the same page, does not move it. If the current row sits beyond the loaded page, the page loads further pages until the row exists, so a long playlist lands on the track rather than on the first hundred.

The list effect waits for the track read to settle and for the playlist filter to be clear; it moves the scroll position only, never focus.

Verification: `pnpm run build`, `pnpm run lint:check` and the unit suites pass (web 566, server 381, tokens 2). The page tests cover the landing, the instant scroll options, a playlist that is not the queue, and a current track that arrives on a later page. The e2e suite was not run here because it needs the full instance.
