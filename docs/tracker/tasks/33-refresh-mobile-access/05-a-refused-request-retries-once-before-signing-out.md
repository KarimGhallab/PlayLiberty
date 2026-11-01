# 05: A refused request retries once before the app signs out

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`04`](04-the-app-refreshes-before-the-access-token-lapses.md)

## Outcome

The API client treats a `401` as a renewal trigger, not a broken session. It asks the session for a fresh access
pair once, retries the request once, and only a second `401` after a fresh token is a definitive refusal. The existing
rule that any `401` signs out moves behind that attempt.

Only `invalid_grant` clears the session. A rate limit, a server fault, a network failure or an edge redirect on the
bypass path keeps the session and surfaces the retry.

Every request that reaches the edge carries an explicit Android User-Agent, so Badger classifies the app as a
non-browser client and answers JSON rather than an SSO page. This includes the audio source and the live event
stream. The non-JSON response guard remains as the second layer; a response that is not the expected JSON is a
transient failure on the refresh path, not a revocation.

The live event stream refreshes on a `401`, reconnects, and ends the session only on `invalid_grant`. The player does
not rebuild an existing native source when the record rotates: a new source takes the current pair, and a stream
already playing keeps the token it was built with. A queue that plays longer than the 12-hour access life may fail on
a later range request; that is the accepted v1 limit, and shortening the life requires stream recovery first.

## Acceptance criteria

- [ ] A `401` produces one refresh and one retry with the new pair.
- [ ] A second `401` after a fresh token is the refusal, and only `invalid_grant` signs the app out.
- [ ] Every request, including audio and the event stream, sends the explicit Android User-Agent.
- [ ] Non-JSON responses on the refresh path are transient, not a revocation.
- [ ] The live stream refreshes and reconnects on `401` and ends only on `invalid_grant`.
- [ ] A playing source is not rebuilt when the record rotates.

## Verification

- Mobile: the API client suite runs against a fake session and proves one refresh plus one retry, and that a refused
  refresh signs out only for `invalid_grant`. The live stream suite keeps its refusal case and adds the refresh and
  reconnect branch. The stream guard suite covers the non-JSON answer.
- `pnpm run build` and `pnpm run lint:check` pass.

See [`33-refresh-mobile-access`](../../specs/33-refresh-mobile-access.md).
