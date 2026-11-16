#!/usr/bin/env bash
# Deploys the checked-out commit to one Railway environment. RAILWAY_TOKEN is scoped to that environment.
# Usage: scripts/deploy.sh <production|preproduction> <commit>
set -euo pipefail
env="$1"
sha="$2"
# Static (musl) build pinned by checksum: the glibc build of the CLI crashes on Ubuntu 26.04.
cli="${RUNNER_TEMP:-/tmp}/railway-4.30.3"
if [ ! -x "$cli/railway" ]; then
  mkdir -p "$cli"
  curl -fsSL -o "$cli/r.tgz" https://github.com/railwayapp/cli/releases/download/v4.30.3/railway-v4.30.3-x86_64-unknown-linux-musl.tar.gz
  echo "c35959abd99d354baf65149ec566e16e0e6bc00c85d0d51caa841e50f60bbc36  $cli/r.tgz" | sha256sum -c --quiet
  tar xzf "$cli/r.tgz" -C "$cli"
fi
railway() { "$cli/railway" "$@"; }
# The vigilante reports this version: a `railway up` upload carries no git commit of its own.
railway variables --service pedidos --set "VIGILANTE_VERSION=$sha" --skip-deploys
railway up --service pedidos --ci --message "$sha"
echo "$env desplegado en ${sha:0:8}"
