# Deploy behind the Pangolin authenticating edge, never publishing a host port

PlayLiberty is deployed for personal access behind the Pangolin authenticating edge. The production origin never publishes a host port and attaches to the shared `pangolin_frontend` network declared `external`; it runs as a `systemd --user` Quadlet unit. Container files do not exist yet, so this decision constrains them before they are written. The concrete rules live in the deployment guideline at `~/.config/opencode/refs/guidelines/deployment.md`; this ADR records why we accept them.

The service holds the owner's personal library and depends on YouTube access. Exposing an unauthenticated port would put a personal media service on the network and make the YouTube dependency reachable by anyone who finds it. Pangolin already provides the authentication the service would otherwise have to build, so the origin stays private and the edge is the only entry. One less thing to get wrong.

Alternatives rejected:

- Local only: simplest, but the owner wants to reach the library from a phone away from the host, which loopback cannot serve.
- A published host port gated only by the app: forces authentication into the app and widens the attack surface; the edge already does it.
- Public behind Pangolin without auth: needless exposure of private media; authentication costs nothing here.
