# 04: The screens stay current while the app is open

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

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

**Constraints:** The stream is the app's only timer; the backoff runs only while disconnected, and the server's heartbeat comment is parsed and discarded.

See [`19-the-mobile-shell`](../../specs/19-the-mobile-shell.md).
