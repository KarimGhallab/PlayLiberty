# 02: Move the API protocol into one transport

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-scaffold-the-shared-client-packages.md).

## Observed

Each client owns one transport of about 200 lines. Both repeat the problem parse, the error type, the client header on a mutation and the non-ok throw. Web adds same-origin credentials, a manual redirect and one navigation per tab on a `401`. Mobile adds the token pair, one renewal and one retry on a `401`, then a provisioning error.

The two paths also encode a query differently, so a space becomes `+` on web and `%20` on mobile.

## Expected

`@playliberty/client-data` owns the protocol: the method, the client header rule on a mutation, the path and query build, the problem parse, the error type, and the non-ok throw. The package exposes one transport factory. The app supplies one auth adapter.

Web supplies a cookie adapter. It keeps same-origin credentials, the manual redirect and the one-navigation guard. Mobile supplies a token adapter. It keeps the token pair, the one renewal, the one retry and the provisioning error.

Land it in this order, and keep the build green at each step: add the transport beside the old code, move web, move mobile, delete both old transports.

## Evidence

- Web transport: `apps/web/src/shared/api/clients/apiClient/apiClient.ts`, 203 lines.
- Mobile transport: `apps/mobile/src/api/apiClient/ApiClient.ts`, 194 lines.
- Both build the problem from the same schema and throw the same two-field error.
- Both set the client header only when the method is not `GET` or `HEAD`.
- The query encoder differs: `URLSearchParams` on web, `encodeURIComponent` on mobile.

## Acceptance criteria

- [ ] `client-data` owns one error type, one problem reader, one path and query build, and one non-ok throw.
- [ ] The package imports no DOM API, no React Native module and no Expo module.
- [ ] The web adapter keeps same-origin credentials, the manual redirect and one navigation per tab, then fails instead of looping.
- [ ] The mobile adapter keeps the token pair, one renewal, one retry, and a provisioning error when the session ends.
- [ ] Both clients throw and catch the package error type.
- [ ] The two old transport files are deleted.
- [ ] A mutation carries the client header on both clients, and a `GET` does not.

## Verification

The package suite covers a malformed problem body, a `401`, a `403`, a `404` and a `409`, and asserts that a mutation carries the client header. `pnpm --filter @playliberty/web test` and `pnpm --filter @playliberty/mobile test` pass. `pnpm run build` and `pnpm run lint:check` pass.
