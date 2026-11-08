# 01: Scaffold the shared client packages

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`packages/api-client` and `packages/player` exist with the `ui-foundation` manifest, tsconfig and script shape. `api-client` owns `ApiError`, `readProblem` and the wire constants (`API_PREFIX`, `CLIENT_HEADER`, `ACCESS_TOKEN_ID_HEADER`, `ACCESS_TOKEN_HEADER`); both transports and the mobile session import them. `player` owns `isPlayable` and `hasPlayableTrack`; the web row, queue, gallery item and detail use both, the mobile player and rows use the single-track form. The app-local error class, constants, two problem readers and both playable files are gone. `tsconfig.depcruise.json`, `build:packages`, both app manifests and the web `Containerfile` name both packages.
