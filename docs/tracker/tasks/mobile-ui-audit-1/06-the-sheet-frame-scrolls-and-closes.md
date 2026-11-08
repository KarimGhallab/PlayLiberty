# 06: The sheet frame scrolls and closes

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)

## Outcome

The sheet frame now owns one body scroll between the heading and the footer. `Sheet` wraps its children in a
`ScrollView` that shrinks inside the 90% cap, takes an optional `footer` that stays fixed, and puts a labelled Close
beside the title; the backdrop and the hardware back still close it. The sheets with a clean action row pass it as the
footer (add track, add playlist, rename, share, share account picker); the actions, track actions, account and sort
sheets scroll their whole body, which is where their content lives. The cover sheet keeps its conditional actions in
the body because they interleave with its confirm prompts; they scroll rather than pin.

`common.close` is in both catalogs. On the emulator at font scale 2, the playlist actions sheet showed the Close, the sync summary, the
cover and sync rows and the skip switch, with the body as the scroll region.
