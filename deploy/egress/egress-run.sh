#!/bin/bash
set -euo pipefail

# The up script creates the namespace in the host mount namespace. The exec
# below enters that same namespace, so the netns file is visible to the agent.

NS="${EGRESS_NETNS:-playliberty-egress}"

/usr/local/lib/playliberty/egress-up

exec /usr/sbin/ip netns exec "$NS" \
  /usr/bin/env node /opt/playliberty/apps/egress-agent/dist/main.js
