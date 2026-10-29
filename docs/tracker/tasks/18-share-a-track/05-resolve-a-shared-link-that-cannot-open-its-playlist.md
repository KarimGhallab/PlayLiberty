# 05: Resolve a shared link that cannot open its playlist

**Status:** open
**Labels:** `enhancement`, `ready-for-agent`

## What to build

A shared link always resolves. An unreachable `P` replaces silently to `/tracks/T`, where the track plays alone. An accessible `P` that no longer associates `T` replaces to `/tracks/T` and explains that the track left the playlist. An accessible `P` whose `T` cannot play stays on `P`, starts nothing and explains why. Only a playlist 404 falls back; any other failure keeps the normal error and retry.

## Acceptance criteria

- [ ] A 404 on the playlist read replaces to `/tracks/T` without starting the playlist and without saying anything about `P`.
- [ ] `T` absent from an accessible `P` replaces to `/tracks/T`; a playable `T` then shows the left-playlist notice, and an unplayable `T` shows the cannot-play notice instead.
- [ ] `T` present but unplayable on an accessible `P` stays on `P`, starts nothing, leaves any current queue playing, and shows the cannot-play notice with the matching detail.
- [ ] A network or 5xx playlist or queue failure shows the normal error and retry and never downgrades to the bare track.
- [ ] The e2e journeys cover no access, an absent track and a failed track in the recipient's context; the page tests cover the branches and the notice copy.
- [ ] The link-entry notices use the app's refusal surface and never interrupt playback.

## Verification

- `pnpm run build` and `pnpm run lint:check` pass.
- The playlist detail page tests and the e2e journeys for no access, an absent track and a failed track pass.

See [`18-share-a-track`](../../specs/18-share-a-track.md).
