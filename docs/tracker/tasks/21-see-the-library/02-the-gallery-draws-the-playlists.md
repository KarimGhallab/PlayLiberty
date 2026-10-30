# 02: The gallery draws the playlists

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## What to build

The library route becomes the gallery: the app's name, the account door and, for an admin, the egress door in one header row, then a two-column grid of playlist cards. The read is the paged playlist route with the account directory for the owner line. Each card draws its cover, its name, the owner line only when the playlist is shared with the account, the count, the sync state word, the share mark, the incomplete count and a play control that is named for its playlist and disabled until the player arrives. The whole card opens the playlist route.

The cover falls back from the custom cover, to the first track's thumbnail, to the playlist's sleeve hue, and every image request carries the session's token headers. The grid groups pinned playlists under a Pinned heading, a playlist whose first sync is running under a Syncing heading, and the rest with no heading; an empty group draws no heading. A card is announced once, with its name.

The route keeps the account sheet it already has. The bulk sync slot is `06`'s, and the disabled play control is enabled by spec `23`.

## Acceptance criteria

- [ ] The gallery draws one card per visible playlist, in two columns.
- [ ] Pinned items come first under a Pinned heading, first-sync items under a Syncing heading, the rest with no heading, and an empty group draws no heading.
- [ ] A shared card names its owner; an owned card draws no owner line.
- [ ] The incomplete mark carries the count of pending, downloading, failed and unavailable tracks, and no breakdown.
- [ ] The cover falls back from the custom cover to the first track's thumbnail to the sleeve, and each image request carries the token headers.
- [ ] A press anywhere on a card opens the playlist route.
- [ ] The play control is present, named for its playlist and disabled.
- [ ] Each card is announced once with its name.
- [ ] The header keeps the account door and, for an admin, the egress door.

## Verification

`pnpm --filter @playliberty/mobile run test` and `pnpm --filter @playliberty/mobile run typecheck`. The gallery test mocks the read and the directory and covers the three groups, the owner line, the incomplete count, the cover fallback and the navigation.
