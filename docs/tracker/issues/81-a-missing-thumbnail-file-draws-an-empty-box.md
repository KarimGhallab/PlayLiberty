# 81: A missing thumbnail file draws an empty box

**State:** `resolved`
**Category:** `bug`

## Outcome

A failed track thumbnail now records its path and drops the image, so the row's `data-art` flips to `no-art` and the existing hatch draws in place of the empty box. The failed path scopes the fallback, so a different thumbnail gets its own read without an extra render or effect.

A working thumbnail keeps its image, source and lazy loading. The playlist cover's error fallback remains the model; the thumbnail endpoint and the pruner are untouched.

The new row test holds the hatch after a thumbnail error and the image still present before it.
