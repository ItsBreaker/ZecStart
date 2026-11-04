#!/bin/sh
# Make the wallet volume writable by the unprivileged "app" user, then run the
# service as that user. Hosted volumes (Railway) are mounted owned by root.
set -eu
mkdir -p "${WALLET_DIR}"
if [ "$(id -u)" = "0" ]; then
  chown -R app:app "$(dirname "${WALLET_DIR}")"
  chmod 700 "${WALLET_DIR}"
  exec setpriv --reuid=app --regid=app --init-groups -- "$@"
fi
exec "$@"
