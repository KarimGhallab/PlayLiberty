# 04: The link host is the instance origin

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## Outcome

The app config is dynamic now. It reads `EXPO_PUBLIC_API_BASE_URL`, falling back to the static `extra.apiBaseUrl`,
and only an HTTPS origin yields a host. With a host, the Android `playlists/`, `tracks/` and `auth/` intent filters
carry it with `autoVerify`, and the iOS associated domain is `applinks:{host}`. With a plain-LAN origin, both are
empty and the `dev.playliberty.app` scheme remains.

The placeholder `playliberty.example` filters and associated domain left `app.json`; every other field stayed. The
association file is the deployment's and was not added.

## Verification

- `EXPO_PUBLIC_API_BASE_URL=https://media.example expo config --type public` resolved `scheme:
dev.playliberty.app`, the three `pathPrefix` entries on `host: media.example`, and `associatedDomains:
["applinks:media.example"]`.
- The same command with `http://192.168.1.10:8080` resolved `intentFilters: []`, `associatedDomains: []`, and the
  same scheme.
- Mobile typecheck and `pnpm run lint:check` pass. The resolved config is the ticket's proof; the native manifest
  needs the human's rebuild to be exercised.
