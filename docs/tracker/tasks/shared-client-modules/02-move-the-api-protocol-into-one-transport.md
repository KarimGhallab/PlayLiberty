# 02: Move the API protocol into one transport

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`@playliberty/api-client` exports `createTransport`: one path and query build (`encodeURIComponent`, so a space is `%20` on both clients), the client header on every method but `GET` and `HEAD`, the problem parse, the error type and the one non-ok throw. It exposes `send` (parses the endpoint response), `command` (ignores the body), `probe` (returns a status without throwing) and `url`.

Web supplies `cookieAdapter`: same-origin credentials, a manual redirect and one navigation per tab from session storage. Mobile supplies `tokenAdapter`: the token pair, one renewal, one retry, and `NeedsProvisioningError` when the session has ended. The old `apiClient.ts` and `ApiClient.ts` and their suites are gone; the web re-auth test and the mobile renewal tests sit beside their adapters. Every read and command in both apps sends through the package transport.
