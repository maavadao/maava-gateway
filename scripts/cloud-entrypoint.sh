#!/bin/sh
# cloud-entrypoint.sh — Mounts GCS bucket via gcsfuse, then starts the gateway.
#
# Required env vars:
#   GCS_BUCKET          — Name of the GCS bucket (e.g. "maavadao-user-alice")
#   PORT                — Port to listen on (set by Cloud Run, default 8080)
#   OPENCLAW_GATEWAY_TOKEN — Auth token for the gateway
#
# Optional env vars:
#   GCS_SUBFOLDER       — Sub-path inside the bucket to mount (e.g. "{userId}/mountfolder").
#                         When set, only that subdirectory is mounted via --only-dir.
#   JWT_SECRET          — Shared JWT secret (for cloud-auth middleware)
#   DATABASE_URL        — PostgreSQL connection string (for Supabase)

set -e

MOUNT_DIR="/home/node/.openclaw"
PORT="${PORT:-8080}"

# Mount GCS bucket if specified.
# Skip manual gcsfuse if the Cloud Run native CSI driver already mounted the directory —
# running two gcsfuse processes against the same GCS path at the same mountpoint causes
# write-cache conflicts where writes from one process are not flushed before the instance
# is killed (scale-to-zero), so identity/memory files written during a conversation are lost.
if mountpoint -q "$MOUNT_DIR" 2>/dev/null; then
  echo "[cloud-entrypoint] $MOUNT_DIR is already mounted by Cloud Run CSI driver — skipping manual gcsfuse"
elif [ -n "$GCS_BUCKET" ]; then
  echo "[cloud-entrypoint] Mounting GCS bucket: $GCS_BUCKET (subfolder: ${GCS_SUBFOLDER:-/}) -> $MOUNT_DIR"
  mkdir -p "$MOUNT_DIR"

  if [ -n "$GCS_SUBFOLDER" ]; then
    gcsfuse \
      --foreground=false \
      --implicit-dirs \
      --only-dir="$GCS_SUBFOLDER" \
      --uid=1000 \
      --gid=1000 \
      --file-mode=0644 \
      --dir-mode=0755 \
      "$GCS_BUCKET" "$MOUNT_DIR"
  else
    gcsfuse \
      --foreground=false \
      --implicit-dirs \
      --uid=1000 \
      --gid=1000 \
      --file-mode=0644 \
      --dir-mode=0755 \
      "$GCS_BUCKET" "$MOUNT_DIR"
  fi

  echo "[cloud-entrypoint] GCS mount successful"
else
  echo "[cloud-entrypoint] No GCS_BUCKET set, using local filesystem"
  mkdir -p "$MOUNT_DIR/workspace"
  chown -R node:node "$MOUNT_DIR"
fi

# Ensure workspace dir exists (may be empty on first mount)
mkdir -p "$MOUNT_DIR/workspace"

# Seed openclaw.json from bundled cloud default only if not already present.
# The file is written by the deployer at provisioning time; we preserve it so
# user customisations made via the dashboard are not overwritten on restart.
if [ ! -f "$MOUNT_DIR/openclaw.json" ]; then
  echo "[cloud-entrypoint] openclaw.json not found — seeding from bundled default"
  cp /app/scripts/cloud-openclaw.json "$MOUNT_DIR/openclaw.json"
else
  echo "[cloud-entrypoint] openclaw.json already present — skipping seed"
fi

# Start the gateway as non-root (node user, uid 1000)
# Explicitly set HOME so the config loader finds /home/node/.openclaw/openclaw.json
# (su without -l inherits root's HOME=/root, causing a config miss)
echo "[cloud-entrypoint] Starting gateway on port $PORT"
exec su -s /bin/sh node -c "HOME=/home/node exec node /app/dist/index.js gateway --allow-unconfigured --bind lan --port $PORT"
