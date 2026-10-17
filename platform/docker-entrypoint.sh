#!/bin/sh
# Starts as root only to fix ownership of the mounted volume, then runs everything as "node".
set -eu

DB="${DB_PATH:-/data/platform.db}"
mkdir -p "$(dirname "$DB")"
chown -R node:node "$(dirname "$DB")"

as_node() { setpriv --reuid=node --regid=node --init-groups "$@"; }
APP="node --disable-warning=ExperimentalWarning server/index.js"

if [ -n "${BUCKET_NAME:-}" ]; then
  # First start on an empty volume (new machine, lost volume): rebuild the database from the replica.
  as_node litestream restore -if-db-not-exists -if-replica-exists -config /etc/litestream.yml "$DB"
  # Replicate every change off the machine while the app runs.
  exec setpriv --reuid=node --regid=node --init-groups litestream replicate -config /etc/litestream.yml -exec "$APP"
fi

echo "WARNING: BUCKET_NAME is not set, so the database is NOT being backed up off this machine." >&2
exec setpriv --reuid=node --regid=node --init-groups $APP
