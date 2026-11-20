#!/usr/bin/env bash
# Runs ON THE VM as the deploy user (called by GitHub Actions over SSH):
#   bash deploy-release.sh <release-id>
# Expects /tmp/carbon-glint-<release-id>.tgz and /tmp/carbon-glint.env to have been uploaded.
set -euo pipefail

RELEASE_ID="${1:?usage: deploy-release.sh <release-id>}"
APP_DIR=/opt/carbon-glint
RELEASE_DIR="$APP_DIR/releases/$RELEASE_ID"
TARBALL="/tmp/carbon-glint-$RELEASE_ID.tgz"
ENV_UPLOAD=/tmp/carbon-glint.env
KEEP_RELEASES=5
DB_NAME=carbon_glint
DB_USER=carbon

log() { echo "▶ $*"; }

# ── 1. Unpack release + install env ──────────────────────────────────────────────
log "Unpacking $RELEASE_ID"
rm -rf "$RELEASE_DIR" && mkdir -p "$RELEASE_DIR"
tar -xzf "$TARBALL" -C "$RELEASE_DIR"
install -m 600 "$ENV_UPLOAD" "$APP_DIR/shared/.env"
rm -f "$TARBALL" "$ENV_UPLOAD"

set -a
# shellcheck disable=SC1091
. "$APP_DIR/shared/.env"
set +a

# ── 2. Database role, database, extensions (idempotent) ──────────────────────────
log "Ensuring database"
sudo -u postgres psql -v ON_ERROR_STOP=1 -q <<SQL
SELECT 'CREATE ROLE $DB_USER LOGIN' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER')\gexec
ALTER ROLE $DB_USER WITH LOGIN PASSWORD '${POSTGRES_PASSWORD}';
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec
SQL
sudo -u postgres psql -v ON_ERROR_STOP=1 -q -d "$DB_NAME" <<'SQL'
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS vector;
SQL

# ── 3. Migrations (before switching traffic) ─────────────────────────────────────
log "Running migrations"
(cd "$RELEASE_DIR/api" && node --env-file="$APP_DIR/shared/.env" dist/migrate.js)

# ── 4. Switch release + restart processes ────────────────────────────────────────
log "Activating release"
ln -sfn "$RELEASE_DIR" "$APP_DIR/current"

sudo install -m 644 "$RELEASE_DIR/Caddyfile" /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null
sudo systemctl reload caddy

# pm2 pins a process's cwd at start, so replace the processes instead of reloading them (~1-2 s blip).
pm2 delete "$RELEASE_DIR/ecosystem.config.cjs" >/dev/null 2>&1 || true
pm2 start "$RELEASE_DIR/ecosystem.config.cjs" --env production
pm2 save --force >/dev/null

# Named tunnel token may have changed → restart the tunnel only if it's configured.
if [ -n "${CLOUDFLARE_TUNNEL_TOKEN:-}" ]; then sudo systemctl restart carbon-glint-tunnel; fi

# ── 5. Smoke test ────────────────────────────────────────────────────────────────
log "Smoke test"
curl -fsS --retry 15 --retry-delay 2 --retry-all-errors http://127.0.0.1/api/health
echo

# ── 6. Keep the last N releases ──────────────────────────────────────────────────
ls -1dt "$APP_DIR"/releases/*/ | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -rf

URL="$(/usr/local/bin/carbon-glint-tunnel-url || true)"
log "Deployed $RELEASE_ID${URL:+ → $URL}"
