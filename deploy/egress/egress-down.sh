#!/bin/bash
set -euo pipefail

# Only an explicit stop runs this. An agent restart keeps the namespace and the
# interface, so a working exit is never recreated by accident.

NS="${EGRESS_NETNS:-playliberty-egress}"
VETH_HOST="${EGRESS_VETH_HOST:-pl-egress0}"
SOCKET_DIR="/run/playliberty"

if [ -e "/run/netns/$NS" ]; then
  ip netns del "$NS"
fi

ip link del "$VETH_HOST" >/dev/null 2>&1 || true
nft delete table inet playliberty_egress >/dev/null 2>&1 || true

rm -f "$SOCKET_DIR/egress-agent.sock"
rm -rf "/etc/netns/$NS"
