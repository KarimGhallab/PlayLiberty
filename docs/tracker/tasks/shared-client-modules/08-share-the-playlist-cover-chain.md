# 08: Share the playlist cover chain

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`@playliberty/ui-foundation` exports `CoverFailure`, `selectPlaylistCover`, `nextCoverFailure` and `coverChainKey`, plus the `CoverLevel` and `CoverSelection` types. The selector returns the level (`custom`, `track`, `sleeve`) and the version to append: the custom cover's stamp, the first track's id, or none at the sleeve. `nextCoverFailure` records the level that failed and leaves the sleeve alone. `coverChainKey` moves when either the custom version or the first track changes, so the hooks reset there.

The web hook maps the level to a URL and appends the version; the mobile hook maps it to a `MediaSource` with the session headers. Both keep only their mapping and the reset effect. The local `CoverFailure` enums and the two fallback orders are gone.
