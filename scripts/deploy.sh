#!/usr/bin/env bash
# Deploys the checked-out commit to one Railway environment. RAILWAY_TOKEN is scoped to that environment.
# Usage: scripts/deploy.sh <production|preproduction> <commit>
set -euo pipefail
env="$1"
sha="$2"
railway() { npx --yes @railway/cli@4.30.3 "$@"; }
# The vigilante reports this version: a `railway up` upload carries no git commit of its own.
railway variables --service pedidos --set "VIGILANTE_VERSION=$sha" --skip-deploys
railway up --service pedidos --ci --message "$sha"
echo "$env desplegado en ${sha:0:8}"
