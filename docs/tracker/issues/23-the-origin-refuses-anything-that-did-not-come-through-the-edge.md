# 23: The origin refuses anything that did not come through the edge

**State:** `resolved`
**Category:** `bug`
**Blocked by:** None. Can start immediately.

## Outcome

The origin now requires the edge's assertion before it believes `Remote-User`. A new `EDGE_ASSERTION` config value makes `loadConfig` throw in production when it is unset, so an open origin is a boot failure, and the identity hook compares the `X-PlayLiberty-Edge` header against the secret in constant time and refuses a request without it (401), after the health-path exemption. The nginx config became a template the entrypoint renders at container start, injecting the assertion from the environment, which also required a writable `/etc/nginx/conf.d` (issue 31's pod and the dev compose tmpfs). The secret is a podman secret in production (`playliberty_edge_assertion`, key `EDGE_ASSERTION`) and a plain value in the dev `compose.yaml`; [Identity comes from Pangolin's forwarded headers](../../ARCHITECTURE.md#identity-comes-from-pangolins-forwarded-headers) records the assertion.
