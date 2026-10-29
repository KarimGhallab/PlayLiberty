# 04: The screens stay current while the app is open

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`03`](03-one-owner-for-the-invalidation-map.md)

## What to build

One live connection, open only while the app is foregrounded. It is read with a fetch-based reader, because React
Native has no `EventSource` and the request must carry the two access-token headers. The reader parses the same
event framing the server already sends and reconnects from a backoff, so a session the edge keeps refusing stops
retrying rather than backing off forever.

Backgrounding closes the connection. Returning refetches every query the app holds and reconnects, so a phone in a
pocket catches up without a background socket and without a polling interval anywhere. An event invalidates the
reads the shared map names; an event the schema does not know is dropped rather than thrown.

## Acceptance criteria

- [ ] A live event invalidates the reads the shared map names, and an unknown event kind is ignored.
- [ ] Backgrounding the app closes the connection.
- [ ] Returning to the foreground opens one connection and refetches every held query.
- [ ] A drop backs off, and a refusal stops the retry loop.
- [ ] The stream carries both access-token headers.
- [ ] No polling interval is introduced anywhere.

## Verification

`pnpm --filter @playliberty/mobile run test` covers the seam: open, close on background, refetch and reconnect on
return, backoff, and a refusal stopping the loop. On `emulator-5554` against a running instance: change a playlist on
the web and watch the open app reflect it, then background the app, change it again, and return.

See [`19-the-mobile-shell`](../../specs/19-the-mobile-shell.md).
