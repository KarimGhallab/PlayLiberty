# 02: Cancel a running sync from the web detail

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## What to build

A write-capable account can cancel the running sync from the web playlist detail's run band. The run becomes cancelled with a finished time, a null error and zero counts; the playlist becomes idle; lastSyncedAt and counts stay unchanged. The reconcile stops after the source read, at the start of the final transaction and in its catch path, so a late success or failure cannot overwrite the cancel and no associations, tracks or downloads are written or queued. Existing downloads are untouched.

The cancel command is the bodyless DELETE of the playlist's sync resource. It answers 204, is idempotent, and requires the existing write access. A read collaborator, a stranger and an unknown playlist answer 404. A transition publishes PlaylistChanged once; a no-op publishes nothing.

The web run band owns the only Cancel control. It appears only when the latest run is running and the account may write. While the request is pending the button reads "Cancelling..." and is disabled, while the run band stamp still reads "Syncing". A failure returns the button and shows the existing notice toast with "Could not cancel the sync"; a success invalidates the playlist, latest-run and library reads and shows no toast. The band then shows a neutral "Sync cancelled" stamp with no counts and no retry, the playlist is idle, the gallery row leaves the Syncing group and the row rejoins Sync all.

Because the run contract gains cancelled, both the web and mobile run bands must render it as "Sync cancelled" in this ticket. The mobile control itself is ticket 03.

## Acceptance criteria

- [ ] The run contract accepts cancelled and no database migration is required.
- [ ] Cancelling a gated running sync answers 204 and commits cancelled, a finished time, a null error and zero counts, with the playlist idle and lastSyncedAt unchanged.
- [ ] Releasing the gated listing after a cancel adds no association or track and issues no download kick.
- [ ] A late source failure after a cancel does not overwrite cancelled or change the idle playlist.
- [ ] A cancel after completion and a second cancel both answer 204 and leave the terminal state unchanged.
- [ ] A reader, a stranger and an unknown playlist answer 404; a write collaborator can cancel.
- [ ] A transition publishes PlaylistChanged once; a no-op publishes nothing.
- [ ] A pending track and a downloading track associated with the playlist keep their file status through the cancel.
- [ ] The web run band shows Cancel only for a running latest run and a writable account; the header sync control and the menu Sync now item are disabled while the run is running.
- [ ] The web Cancel button has the playlist in its accessible name, exposes busy and disabled, reads "Cancelling..." while pending, and returns to "Cancel sync" on failure.
- [ ] A failed cancel shows the notice toast with "Could not cancel the sync" and keeps the run syncing.
- [ ] A successful cancel invalidates the playlist, latest-run and library reads, shows no toast, and renders the neutral "Sync cancelled" stamp.
- [ ] Both the web and mobile run bands render a cancelled latest run neutrally, without counts or retry.
- [ ] The gallery row leaves the Syncing group and is included in Sync all after the refetch.

## Verification

Run the server and web suites and the mobile run-band cancelled test, then the repository build and lint checks: `pnpm --filter @playliberty/server test`, `pnpm --filter @playliberty/web test`, `pnpm --filter @playliberty/mobile test`, `pnpm run build`, `pnpm run lint:check`.
