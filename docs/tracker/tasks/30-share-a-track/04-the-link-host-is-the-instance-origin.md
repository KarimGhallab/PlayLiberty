# 04: The link host is the instance origin

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The app config is dynamic now. It reads `EXPO_PUBLIC_API_BASE_URL`, falling back to the static `extra.apiBaseUrl`,
and only an HTTPS origin yields a host. With a host, the Android `playlists/`, `tracks/` and `auth/` intent filters
carry it with `autoVerify`, and the iOS associated domain is `applinks:{host}`. With a plain-LAN origin, both are
empty and the `dev.playliberty.app` scheme remains.

The placeholder `playliberty.example` filters and associated domain left `app.json`; every other field stayed. The
association file is `apps/web/public/.well-known/assetlinks.json`; the Pangolin resource must bypass auth for
`/.well-known/assetlinks.json` so Android can fetch it.
