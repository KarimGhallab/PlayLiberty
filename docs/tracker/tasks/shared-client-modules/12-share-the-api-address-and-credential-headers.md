# 12: Share the API address and credential headers

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`@playliberty/api-client` exports `apiUrl`, `accessHeaders`, `AccessToken` and `USER_AGENT_HEADER`. `apiUrl` joins the base URL, the API prefix and the path with one slash. `accessHeaders` builds the access pair and the user agent headers.

The shared transport uses `apiUrl`. The web media URL uses `apiUrl` with an empty base. The mobile media, stream and live adapters call both builders. The mobile `USER_AGENT` value stays local, and the header name moves to the client.
