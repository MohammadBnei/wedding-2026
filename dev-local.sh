#!/usr/bin/env bash
# Local dev: real chatbot secrets from Infisical, but the LOCAL throwaway
# Postgres — note the `env` AFTER `--`. `infisical run` injects its own values
# over the parent environment, so exporting WEDDING_DB_HOST beforehand is
# silently overridden by postgres.bnei.lan, which does not resolve off-LAN.
set -euo pipefail
cd "$(dirname "$0")"

docker start wedding-pg 2>/dev/null || docker run -d --name wedding-pg \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=weddingdb \
  -p 55432:5432 postgres:16-alpine >/dev/null
until docker exec wedding-pg pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done

source ~/.hermes/cache/inf-env.sh 2>/dev/null || true
exec infisical run --projectId=798540d3-0c3e-47ee-b447-468d65088377 --env=dev --silent -- \
  env WEDDING_DB_HOST=localhost \
      WEDDING_DB_PORT=55432 \
      WEDDING_DB_NAME=weddingdb \
      WEDDING_DB_USER=postgres \
      WEDDING_DB_PASSWORD=postgres \
  bun run dev --port 5188 --host
