# 77: Sync is the fourth item of the overflow

**State:** `resolved`
**Category:** `enhancement`

## Outcome

The detail's state line now carries a named **Sync now** control, so a writer starts a run without opening the overflow. The control uses the same `sync.mutate` endpoint as the menu item and the same `actions.syncing` flag; it waits during the request and for the whole run (`playlist.syncStatus === syncing`), so a second press cannot fire. Its in-flight form swaps the rotate glyph for the spinner and the word for **Syncing**, and the state line flips to **Syncing** on the press rather than waiting for the next playlist read.

The first start and the failed retry keep single owners: the empty state's own button owns a never-synced playlist with no tracks, and the failed band's button owns a playlist in error, so the header does not draw a second control there. The gallery keeps **Sync now** in its item menu. The overflow still holds pin, share, rename, sync and delete in that order.

`docs/DESIGN.md` records the detail's named sync and the split owners.

Verification: `pnpm run build` and `pnpm run lint` pass. The web header and detail suites pass (111 tests across the two files); the rest of the unit suites pass (server 386, i18n 39, ui-foundation 6, web 522 across the 51 files outside the concurrent SyncSummary change). The full `pnpm test:unit` is red only in `SyncSummary.test.tsx`, whose staged expectations say "still failed" while the staged catalog says "failed"; that concurrent copy change was left untouched.
