# 13: Share the share mark state

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`@playliberty/ui-foundation` exports `shareMarkOf`, `ShareMarkState` and the `ShareMark` type. The selector returns `collab`, `own-shared` or `own-private` with its label key.

Web maps the state to its Tabler glyph through a local icon table. Mobile keeps its share-mark adapter: it maps the state to its own glyph and keeps the tone rule. The local branch in both clients is deleted.
