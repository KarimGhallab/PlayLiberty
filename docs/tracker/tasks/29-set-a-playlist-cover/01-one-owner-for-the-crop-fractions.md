# 01: One owner for the cover crop fractions

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The crop module and its test suite moved from the web app into `@playliberty/ui-foundation`, and the package exports
`clampPan`, `cropOf`, `formatZoom`, `maxZoom`, `panLimits`, `shortEdge` and the `CoverCrop`, `CropFraming` and
`PanLimits` types unchanged. The web cover dialog, the cover client, the dialog test and the crop test now import
the package, and the web app's `shared/coverCrop` directory is gone.

No behaviour changed: the zoom ceiling, the fraction maths and the six-decimal query fields are the same code.

See [`29-set-a-playlist-cover`](../../specs/29-set-a-playlist-cover.md).
