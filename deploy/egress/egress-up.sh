#!/bin/bash
set -euo pipefail

# The namespace, the interface and the socket are the system scope. The pod
# only mounts the socket directory; it never gets NET_ADMIN and never joins the
# namespace. The host default route and sshd are not touched.

NS="${EGRESS_NETNS:-playliberty-egress}"
IFACE="${WG_INTERFACE:-wg0}"
VETH_HOST="${EGRESS_VETH_HOST:-pl-egress0}"
VETH_NS="${EGRESS_VETH_NS:-pl-egress1}"
HOST_IP="${EGRESS_VETH_HOST_IP:-10.200.0.1}"
NS_IP="${EGRESS_VETH_NS_IP:-10.200.0.2}"
POOL="${PROTON_POOL_DIR:?PROTON_POOL_DIR is required}"
STATE="${EGRESS_STATE_FILE:?EGRESS_STATE_FILE is required}"
PEER_UID="${EGRESS_AGENT_PEER_UID:-1000}"
SOCKET_DIR="/run/playliberty"
RESOLV_DIR="/etc/netns/$NS"

die() {
  printf 'egress-up: %s\n' "$*" >&2
  exit 1
}

command -v ip >/dev/null || die 'iproute2 is required.'
command -v wg >/dev/null || die 'wireguard-tools is required.'
command -v wg-quick >/dev/null || die 'wireguard-tools is required.'
command -v nft >/dev/null || die 'nftables is required.'
command -v sysctl >/dev/null || die 'procps is required.'

[ -d "$POOL" ] || die "The pool directory $POOL does not exist."
[ "$(stat -c '%u:%a' "$POOL")" = '0:700' ] ||
  die "The pool directory $POOL must be root-owned at 0700."

# The state file is the agent's memory; it wins over the explicit name, and the
# first file is the last resort. The agent resolves the same order at startup.
name=''
if [ -f "$STATE" ]; then
  name="$(tr -d '[:space:]' <"$STATE")"
fi

if [ -n "$name" ]; then
  [ -f "$POOL/$name.conf" ] ||
    die "The active state file names \"$name\", which is not in the pool."
elif [ -n "${PROTON_ACTIVE_CONFIG:-}" ]; then
  name="$PROTON_ACTIVE_CONFIG"
  [ -f "$POOL/$name.conf" ] ||
    die "PROTON_ACTIVE_CONFIG names \"$name\", which is not in the pool."
else
  name="$(find "$POOL" -maxdepth 1 \( -type f -o -type l \) -name '*.conf' -printf '%f\n' |
    sort | head -n 1 | sed 's/\.conf$//')"
  [ -n "$name" ] || die "The pool $POOL has no config."
fi

config="$POOL/$name.conf"
[ "$(stat -c '%u:%a' "$config")" = '0:600' ] ||
  die "The config $config must be root-owned at 0600."

# The namespace and the veth that carries only the WireGuard endpoint. The
# interface is created once and only synced on later starts, so an agent
# restart never recreates a working interface.
if [ ! -e "/run/netns/$NS" ]; then
  ip netns add "$NS"
fi

if ! ip link show "$VETH_HOST" >/dev/null 2>&1 ||
  ! ip -n "$NS" link show "$VETH_NS" >/dev/null 2>&1; then
  ip link del "$VETH_HOST" >/dev/null 2>&1 || true
  ip -n "$NS" link del "$VETH_NS" >/dev/null 2>&1 || true
  ip link add "$VETH_HOST" type veth peer name "$VETH_NS"
  ip link set "$VETH_NS" netns "$NS"
fi

ip addr replace "$HOST_IP/30" dev "$VETH_HOST"
ip link set "$VETH_HOST" up
ip -n "$NS" addr replace "$NS_IP/30" dev "$VETH_NS"
ip -n "$NS" link set "$VETH_NS" up

# IPv6 is off in the namespace, so a v6 attempt cannot escape; yt-dlp is also
# forced to IPv4 by its own arguments.
ip netns exec "$NS" sysctl -qw net.ipv6.conf.all.disable_ipv6=1
ip netns exec "$NS" sysctl -qw net.ipv6.conf.default.disable_ipv6=1
ip netns exec "$NS" sysctl -qw "net.ipv6.conf.$VETH_NS.disable_ipv6=1" || true

if ! ip -n "$NS" link show "$IFACE" >/dev/null 2>&1; then
  ip -n "$NS" link add "$IFACE" type wireguard
fi

addresses=0
while IFS= read -r address; do
  [ -n "$address" ] || continue
  case "$address" in *:*) continue ;; esac
  ip -n "$NS" addr replace "$address" dev "$IFACE"
  addresses=$((addresses + 1))
done < <(sed -n 's/^[[:space:]]*Address[[:space:]]*=[[:space:]]*//p' "$config" |
  tr ',' '\n' | sed 's/[[:space:]]//g')
[ "$addresses" -gt 0 ] || die "The active config has no IPv4 Address line."

# The namespace resolver is the active config's DNS; the host resolver is not
# modified. ip netns exec bind-mounts this file over /etc/resolv.conf.
mkdir -p "$RESOLV_DIR"
: >"$RESOLV_DIR/resolv.conf"
while IFS= read -r dns; do
  [ -n "$dns" ] || continue
  case "$dns" in *:*) continue ;; esac
  printf 'nameserver %s\n' "$dns" >>"$RESOLV_DIR/resolv.conf"
done < <(sed -n 's/^[[:space:]]*DNS[[:space:]]*=[[:space:]]*//p' "$config" |
  tr ',' '\n' | sed 's/[[:space:]]//g')
[ -s "$RESOLV_DIR/resolv.conf" ] ||
  die "The active config has no IPv4 DNS line."
chmod 0644 "$RESOLV_DIR/resolv.conf"

endpoint="$(sed -n 's/^[[:space:]]*Endpoint[[:space:]]*=[[:space:]]*//p' "$config" |
  head -n 1 | tr -d '[:space:]')"
[ -n "$endpoint" ] || die "The active config has no endpoint."
case "$endpoint" in
  *:*) ;;
  *) die "The endpoint $endpoint has no port." ;;
esac
endpoint_host="${endpoint%:*}"
case "$endpoint_host" in
  *:*) die "The endpoint $endpoint is not IPv4." ;;
esac

# Every config in the pool may become active; the host allows only those
# endpoint IP:port pairs over the veth, and the namespace route picks one.
endpoint_elements=()
while IFS= read -r file; do
  candidate="$(sed -n 's/^[[:space:]]*Endpoint[[:space:]]*=[[:space:]]*//p' "$file" |
    head -n 1 | tr -d '[:space:]')"
  [ -n "$candidate" ] || continue
  candidate_host="${candidate%:*}"
  candidate_port="${candidate##*:}"
  case "$candidate_host" in *:*) continue ;; esac
  case "$candidate_port" in '' | *[!0-9]*) continue ;; esac
  endpoint_elements+=("$candidate_host . $candidate_port")
done < <(find "$POOL" -maxdepth 1 \( -type f -o -type l \) -name '*.conf' | sort)
[ "${#endpoint_elements[@]}" -gt 0 ] ||
  die "The pool has no usable endpoint."
mapfile -t endpoint_elements < <(
  printf '%s\n' "${endpoint_elements[@]}" | sort -u
)

stripped="$(mktemp)"
trap 'rm -f "$stripped"' EXIT
wg-quick strip "$config" >"$stripped"
ip netns exec "$NS" wg syncconf "$IFACE" "$stripped"
ip -n "$NS" link set "$IFACE" up

# The endpoint is the only destination the namespace reaches outside the
# tunnel; everything else has the WireGuard default.
ip -n "$NS" route replace "$endpoint_host/32" via "$HOST_IP" dev "$VETH_NS"
ip -n "$NS" route replace default dev "$IFACE"

# The host forwards only the encrypted WireGuard packets from the veth and
# masquerades them out the existing default route. It does not change it.
sysctl -qw net.ipv4.ip_forward=1
wan="$(ip route show default | awk '{print $5; exit}')"
[ -n "$wan" ] || die 'The host has no default route.'

nft add table inet playliberty_egress
nft flush table inet playliberty_egress
nft add set inet playliberty_egress endpoints \
  '{ type ipv4_addr . inet_service; }'
nft add element inet playliberty_egress endpoints \
  "{ $(IFS=,; printf '%s' "${endpoint_elements[*]}") }"
nft add chain inet playliberty_egress postrouting \
  '{ type nat hook postrouting priority srcnat; }'
nft add rule inet playliberty_egress postrouting \
  ip saddr "$NS_IP" oifname "$wan" masquerade
nft add chain inet playliberty_egress forward \
  '{ type filter hook forward priority filter; }'
nft add rule inet playliberty_egress forward \
  ip saddr "$NS_IP" ip daddr . udp dport @endpoints accept
nft add rule inet playliberty_egress forward ip saddr "$NS_IP" drop

# The socket directory belongs to the pod's uid; the agent owns the socket
# inside it at 0600. No host port is opened.
install -d -m 0700 -o "$PEER_UID" "$SOCKET_DIR"
chown "$PEER_UID" "$SOCKET_DIR"
chmod 0700 "$SOCKET_DIR"
