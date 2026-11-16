#!/usr/bin/env bash
# Deploys the checked-out commit to one environment of the VPS. Usage: scripts/deploy.sh <production|preproduction> <commit>
set -euo pipefail
env="$1"
sha="$2"
target="/srv/pedidos/$env"
port=$([ "$env" = production ] && echo 4100 || echo 4200)

rsync -a --delete --exclude .git ./ "$target/app/"
if [ "$env" = preproduction ]; then
  # Preproduction always starts from a known state: fixed test records plus the case's records.
  (cd "$target/app" && node scripts/restore-db.js "$target/data.db")
fi
echo "VIGILANTE_VERSION=$sha" > "$target/release.env"
sudo systemctl enable "pedidos@$env" >/dev/null 2>&1
sudo systemctl restart "pedidos@$env"

for _ in $(seq 1 30); do
  if curl -s -o /dev/null "http://127.0.0.1:$port/pedidos/health"; then
    echo "$env desplegado en ${sha:0:8}"
    exit 0
  fi
  sleep 1
done
echo "$env no respondió después del despliegue" >&2
exit 1
