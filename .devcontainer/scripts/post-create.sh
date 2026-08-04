#!/usr/bin/env bash
set -euo pipefail

export MISE_YES=1
export MISE_VERBOSE=1

# Fix ownership on volume-backed dirs (volumes mount as root on first creation).
# The read-only host overlays under ~/.claude (settings.json, CLAUDE.md, commands/,
# agents/, skills/) sit on read-only bind mounts, so chown'ing them returns EROFS.
# Those errors are expected and benign — swallow them so set -e doesn't abort here.
# chown -R still fixes every writable path it can reach; only the RO mountpoints skip.
sudo chown -R vscode:vscode /home/vscode 2>/dev/null || true
sudo chown -R vscode:vscode ${CONTAINER_WORKSPACE_FOLDER} 2>/dev/null || true

mise install
mise exec -- bun install

