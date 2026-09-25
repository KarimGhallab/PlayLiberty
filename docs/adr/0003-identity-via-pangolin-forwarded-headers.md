# Authenticate by trusting Pangolin's forwarded identity headers

The server takes the account identity from the `Remote-User`, `Remote-Email`, `Remote-Name`, and `Remote-Role` headers that the Pangolin edge injects, auto-provisions an account on first sight, and fails closed when the headers are absent. The app runs no login and stores no password. The first admin is a config value matching a Pangolin user.

Pangolin is already the deployment's authenticating edge, it is multi-user, and its Badger forward-auth strips any client-supplied copies of those headers before injecting the verified ones. Trusting it removes an entire login surface from the app. The trust precondition is that the origin is reachable only through Pangolin, which the deployment already guarantees: no published host port, attached to `pangolin_frontend`. Failing closed matters because an identity-less request means a misconfigured resource (for example one protected by a PIN, which carries no identity), not an anonymous user.

Alternatives rejected:

- App-owned accounts: double-gates every request and re-implements what the edge already does.
- OIDC directly against an upstream IdP: more moving parts and a second identity source, for no benefit when Pangolin is the sole ingress.
- Trusting the headers without the no-direct-reachability guarantee: anyone able to reach the origin could impersonate any account.
