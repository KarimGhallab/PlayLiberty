# 01: One owner for the cover crop fractions

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## Outcome

The crop module and its test suite moved from the web app into `@playliberty/ui-foundation`, and the package exports
`clampPan`, `cropOf`, `formatZoom`, `maxZoom`, `panLimits`, `shortEdge` and the `CoverCrop`, `CropFraming` and
`PanLimits` types unchanged. The web cover dialog, the cover client, the dialog test and the crop test now import
the package, and the web app's `shared/coverCrop` directory is gone.

No behaviour changed: the zoom ceiling, the fraction maths and the six-decimal query fields are the same code.

## Verification

- `pnpm --filter @playliberty/ui-foundation run test`: 15 tests across 3 files pass.
- `pnpm --filter @playliberty/ui-foundation run build` passes.
- `pnpm --filter @playliberty/web run test`: 628 tests across 59 files pass.
- `pnpm run build`, `pnpm run lint:check` and `pnpm --filter @playliberty/mobile run typecheck` pass.
- `rg` finds the module only under `packages/ui-foundation/src/coverCrop`.

See [`29-set-a-playlist-cover`](../../specs/29-set-a-playlist-cover.md).
