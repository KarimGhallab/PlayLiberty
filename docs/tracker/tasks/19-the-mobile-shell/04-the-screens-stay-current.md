# 04: The screens stay current while the app is open

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`03`](03-one-owner-for-the-invalidation-map.md)

## Outcome

The app has one live connection, and it exists only while the app is foregrounded.

`fetchLiveEvents` reads the stream from the body of `expo/fetch`, because React Native has no `EventSource` and a
browser one cannot set headers. It sends both access-token headers, treats a `401` as a refusal, and parses the
server's framing one chunk at a time: a frame ends on a blank line, a keepalive comment carries nothing, and a frame
with several `data:` lines is joined. A stream that ends without a refusal is a drop.

`useLiveEvents` owns the lifecycle. It opens one connection when the app is active, closes it when the app leaves
the foreground, and on return invalidates every query the app holds before reconnecting, so a phone in a pocket
catches up without a background socket and without a polling interval. A drop backs off from one second to thirty;
a refusal stops the loop and expires the session. Events go through the shared map, and an event the schema does not
know is dropped.

`LiveEvents` is mounted inside the providers and draws nothing. `useApiConfig` now follows the session instead of
reading the token once at launch, so the stream and the player both start after a sign-in and stop on a sign-out
without a relaunch.

## Verification

- Mobile 54 tests across 11 suites. The stream's seam covers the headers and the URL, no connection without a
  token, close on background, one connection when active is reported twice, refetch and reconnect on return, a known
  event invalidating the mapped reads, an unknown event ignored, the backoff after a drop, and a refusal stopping
  the loop and signing out.
- `pnpm run build` and `pnpm run lint:check` pass.
- On `emulator-5554`: `/api/v1/events` answers `200` with `text/event-stream` and the `ready` frame through the dev
  proxy, and the app's socket to the proxy goes from three established connections to two on Home and back to three
  with a new ephemeral port on return, which is the connection closing and reopening.

## Notes

- The ticket's visible check, changing a playlist and watching the open app reflect it, needs a screen that reads
  playlists. The shell's only read is the account, so that pass belongs with spec `21`. The connection lifecycle is
  proven on the device and the invalidation is proven at the seam.
- The stream is the only timer in the app. The backoff fires only while disconnected, and the server's heartbeat
  comment is parsed and discarded, so nothing polls.

See [`19-the-mobile-shell`](../../specs/19-the-mobile-shell.md).
