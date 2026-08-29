#!/usr/bin/env bash
set -euo pipefail

SOURCE=main
GROUP=hetzner-cloud-radar
PREFIX=hcr-dev
MAX_AGE=86400

if ! command -v turso >/dev/null 2>&1; then
  echo "turso CLI not found" >&2
  exit 1
fi

now=$(date +%s)

while read -r name; do
  [ -n "$name" ] || continue
  ts="${name#"$PREFIX"-}"
  ts="${ts%%-*}"
  case "$ts" in
    ''|*[!0-9]*) continue ;;
  esac
  if [ $((now - ts)) -gt "$MAX_AGE" ]; then
    echo "pruning $name"
    turso db destroy "$name" -y
  fi
done < <(turso db list -g "$GROUP" | awk -v p="^${PREFIX}-" 'NR>1 && $1 ~ p {print $1}')

NAME="${PREFIX}-${now}-$$"

echo "branching $NAME from $SOURCE"
turso db branch "$SOURCE" "$NAME" --group "$GROUP"

cleanup() {
  trap - EXIT INT TERM
  turso db destroy "$NAME" -y || true
}
trap cleanup EXIT INT TERM

url=""
for _ in 1 2 3 4 5 6 7 8 9 10; do
  url=$(turso db show "$NAME" --url 2>/dev/null || true)
  [ -n "$url" ] && break
  sleep 1
done
if [ -z "$url" ]; then
  echo "failed to get URL for $NAME" >&2
  exit 1
fi

TOKEN=$(turso db tokens create "$NAME" -e 1d)
if [ -z "$TOKEN" ]; then
  echo "failed to create token for $NAME" >&2
  exit 1
fi

echo "using $NAME $url"
export TURSO_DATABASE_URL="$url"
export TURSO_AUTH_TOKEN="$TOKEN"
next dev "$@"
