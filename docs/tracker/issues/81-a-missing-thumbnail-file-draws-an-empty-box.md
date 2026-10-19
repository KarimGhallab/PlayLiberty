# 81: A missing thumbnail file draws an empty box

**State:** `resolved`
**Category:** `bug`

**Blocked by:** None. Can start immediately.

## Outcome

A failed track thumbnail now records its path and drops the image, so the row's `data-art` flips to `no-art` and the existing hatch draws in place of the empty box. The failed path scopes the fallback, so a different thumbnail gets its own read without an extra render or effect.

A working thumbnail keeps its image, source and lazy loading. The playlist cover's error fallback remains the model; the thumbnail endpoint and the pruner are untouched.

Verification: `pnpm run build` and `pnpm run lint` pass; the unit suites pass (tokens 2, i18n 39, youtube 31, ui-foundation 6, server 386, web 535). The new row test holds the hatch after a thumbnail error and the image still present before it.
