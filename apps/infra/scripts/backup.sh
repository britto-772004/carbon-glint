#!/usr/bin/env bash
# Nightly Postgres backup (systemd timer carbon-glint-backup.timer). Keeps 7 local dumps and uploads to
# Cloud Storage when BACKUP_BUCKET is set (the VM's service account can only create objects there).
set -euo pipefail

BACKUP_DIR=/opt/carbon-glint/backups
KEEP_LOCAL=7
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$BACKUP_DIR/carbon_glint-$STAMP.dump"

mkdir -p "$BACKUP_DIR"
sudo -u postgres pg_dump --format=custom --compress=9 carbon_glint > "$FILE"
echo "backup written: $FILE ($(du -h "$FILE" | cut -f1))"

if [ -n "${BACKUP_BUCKET:-}" ]; then
  gcloud storage cp --quiet "$FILE" "gs://$BACKUP_BUCKET/postgres/$(basename "$FILE")"
  echo "uploaded to gs://$BACKUP_BUCKET/postgres/"
fi

ls -1t "$BACKUP_DIR"/carbon_glint-*.dump | tail -n +$((KEEP_LOCAL + 1)) | xargs -r rm -f

# Restore:  pg_restore --clean --if-exists -d carbon_glint <file.dump>   (as the postgres user)
