#!/usr/bin/env bash
# Carbon Glint VM bootstrap (Ubuntu 24.04, e2-micro). Installs everything natively — no Docker.
#   Node 24 + pm2 (api, worker) · PostgreSQL 18 + pgvector · Redis 8 · Caddy · cloudflared · backup timer
# Runs as the GCE startup-script on every boot, and is safe to re-run by hand:  sudo bash bootstrap-vm.sh
set -euo pipefail
exec > >(tee -a /var/log/carbon-glint-bootstrap.log) 2>&1
echo "=== bootstrap $(date -u +%FT%TZ) ==="

DEPLOY_USER="${DEPLOY_USER:-deploy}"
APP_DIR=/opt/carbon-glint
NODE_MAJOR=24
PG_MAJOR=18
export DEBIAN_FRONTEND=noninteractive

have() { command -v "$1" >/dev/null 2>&1; }
apt_repo() { # name, key-url, repo-line
  local keyring="/etc/apt/keyrings/$1.gpg"
  [ -f "$keyring" ] || curl -fsSL "$2" | gpg --dearmor -o "$keyring"
  echo "$3" | sed "s#KEYRING#$keyring#" > "/etc/apt/sources.list.d/$1.list"
}

# ── Base packages, swap, kernel settings ────────────────────────────────────────
apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release unattended-upgrades jq
install -m 0755 -d /etc/apt/keyrings
CODENAME="$(lsb_release -cs)"

if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q /swapfile /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
cat > /etc/sysctl.d/99-carbon-glint.conf <<'EOF'
vm.swappiness=10
vm.overcommit_memory=1
EOF
sysctl --system >/dev/null

# ── Deploy user + directories ────────────────────────────────────────────────────
id "$DEPLOY_USER" >/dev/null 2>&1 || useradd -m -s /bin/bash "$DEPLOY_USER"
usermod -aG systemd-journal "$DEPLOY_USER" # read tunnel logs for the quick-tunnel URL
cat > /etc/sudoers.d/carbon-glint-deploy <<EOF
$DEPLOY_USER ALL=(ALL) NOPASSWD:ALL
EOF
chmod 440 /etc/sudoers.d/carbon-glint-deploy
mkdir -p "$APP_DIR"/{releases,shared/files,backups}
chown -R "$DEPLOY_USER":"$DEPLOY_USER" "$APP_DIR"

# ── Repositories ─────────────────────────────────────────────────────────────────
apt_repo nodesource https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
  "deb [signed-by=KEYRING] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main"
apt_repo pgdg https://www.postgresql.org/media/keys/ACCC4CF8.asc \
  "deb [signed-by=KEYRING] https://apt.postgresql.org/pub/repos/apt ${CODENAME}-pgdg main"
apt_repo redis https://packages.redis.io/gpg \
  "deb [signed-by=KEYRING] https://packages.redis.io/deb ${CODENAME} main"
apt_repo caddy https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
  "deb [signed-by=KEYRING] https://dl.cloudsmith.io/public/caddy/stable/deb/debian any-version main"
apt_repo cloudflared https://pkg.cloudflare.com/cloudflare-main.gpg \
  "deb [signed-by=KEYRING] https://pkg.cloudflare.com/cloudflared ${CODENAME} main"
apt-get update -y
apt-get install -y nodejs "postgresql-${PG_MAJOR}" "postgresql-${PG_MAJOR}-pgvector" redis caddy cloudflared

# ── PostgreSQL: localhost only, tuned for 1 GB RAM ───────────────────────────────
cat > "/etc/postgresql/${PG_MAJOR}/main/conf.d/carbon-glint.conf" <<'EOF'
listen_addresses = 'localhost'
max_connections = 30
shared_buffers = 128MB
effective_cache_size = 384MB
work_mem = 4MB
maintenance_work_mem = 64MB
wal_buffers = 4MB
random_page_cost = 2.0
log_min_duration_statement = 1000
EOF
systemctl enable postgresql
systemctl restart postgresql

# ── Redis: localhost only, small memory cap ──────────────────────────────────────
REDIS_CONF=/etc/redis/redis.conf
if ! grep -q "# carbon-glint" "$REDIS_CONF"; then
  cat >> "$REDIS_CONF" <<'EOF'
# carbon-glint
bind 127.0.0.1 -::1
protected-mode yes
maxmemory 64mb
maxmemory-policy noeviction
appendonly yes
EOF
fi
systemctl enable redis-server
systemctl restart redis-server

# ── pm2 (runs api + worker as the deploy user, restarted on boot) ────────────────
have pm2 || npm install -g pm2@7
sudo -u "$DEPLOY_USER" -H bash -lc 'pm2 ping >/dev/null && (pm2 describe pm2-logrotate >/dev/null 2>&1 || pm2 install pm2-logrotate) && pm2 set pm2-logrotate:max_size 10M >/dev/null && pm2 set pm2-logrotate:retain 7 >/dev/null' || true
env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$DEPLOY_USER" --hp "/home/$DEPLOY_USER" >/dev/null

# ── Caddy: static web + /api reverse proxy (config is replaced on every deploy) ─
if [ ! -f /etc/caddy/.carbon-glint ]; then
  cat > /etc/caddy/Caddyfile <<'EOF'
:80 {
  respond "Carbon Glint is installed. Waiting for the first deploy." 200
}
EOF
  touch /etc/caddy/.carbon-glint
fi
systemctl enable caddy
systemctl reload-or-restart caddy

# ── Cloudflare Tunnel: named tunnel if a token is configured, else a quick tunnel ─
cat > /usr/local/bin/carbon-glint-tunnel <<'EOF'
#!/usr/bin/env bash
# Named tunnel (stable hostname) when CLOUDFLARE_TUNNEL_TOKEN is set in shared/.env; otherwise a quick tunnel
# (random https://*.trycloudflare.com URL, changes when this service restarts).
TOKEN="$(grep -E '^CLOUDFLARE_TUNNEL_TOKEN=' /opt/carbon-glint/shared/.env 2>/dev/null | cut -d= -f2- | tr -d '"')"
if [ -n "$TOKEN" ]; then
  exec /usr/bin/cloudflared tunnel --no-autoupdate run --token "$TOKEN"
fi
exec /usr/bin/cloudflared tunnel --no-autoupdate --url http://127.0.0.1:80
EOF
chmod 755 /usr/local/bin/carbon-glint-tunnel
cat > /etc/systemd/system/carbon-glint-tunnel.service <<'EOF'
[Unit]
Description=Carbon Glint Cloudflare Tunnel
After=network-online.target caddy.service
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/carbon-glint-tunnel
Restart=always
RestartSec=5
User=nobody

[Install]
WantedBy=multi-user.target
EOF

cat > /usr/local/bin/carbon-glint-tunnel-url <<'EOF'
#!/usr/bin/env bash
# Prints the current public URL of the quick tunnel (empty for named tunnels).
journalctl -u carbon-glint-tunnel --no-pager -o cat 2>/dev/null | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1
EOF
chmod 755 /usr/local/bin/carbon-glint-tunnel-url
systemctl daemon-reload
systemctl enable carbon-glint-tunnel
systemctl is-active --quiet carbon-glint-tunnel || systemctl start carbon-glint-tunnel

# ── Nightly Postgres backup → local + Cloud Storage ──────────────────────────────
BACKUP_BUCKET="$(curl -fs -H 'Metadata-Flavor: Google' \
  http://metadata.google.internal/computeMetadata/v1/instance/attributes/backup-bucket || true)"
cat > /etc/systemd/system/carbon-glint-backup.service <<EOF
[Unit]
Description=Carbon Glint Postgres backup
After=postgresql.service

[Service]
Type=oneshot
Environment=BACKUP_BUCKET=$BACKUP_BUCKET
ExecStart=/bin/bash $APP_DIR/current/scripts/backup.sh
EOF
cat > /etc/systemd/system/carbon-glint-backup.timer <<'EOF'
[Unit]
Description=Nightly Carbon Glint Postgres backup

[Timer]
OnCalendar=*-*-* 20:30:00 UTC
Persistent=true

[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now carbon-glint-backup.timer

# ── Automatic security updates ───────────────────────────────────────────────────
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "=== bootstrap complete: node $(node -v), pm2 $(pm2 -v), $(psql --version), $(redis-server --version | cut -d' ' -f3), caddy $(caddy version | cut -d' ' -f1) ==="
