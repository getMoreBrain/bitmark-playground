#!/usr/bin/env bash
set -euo pipefail

# Fix ownership on volume-backed dirs (volumes mount as root on first creation).
# The read-only host overlays under ~/.claude (settings.json, CLAUDE.md, commands/,
# agents/, skills/) sit on read-only bind mounts, so chown'ing them returns EROFS.
# Those errors are expected and benign — swallow them so set -e doesn't abort here.
# chown -R still fixes every writable path it can reach; only the RO mountpoints skip.
sudo chown -R vscode:vscode /home/vscode 2>/dev/null || true
sudo chown -R vscode:vscode ${CONTAINER_WORKSPACE_FOLDER} 2>/dev/null || true

mise install
mise exec -- bun install

# Persist ~/.claude.json by relocating it into the .claude volume and symlinking.
# Claude Code keeps onboarding state, OAuth account info, and project history in
# ~/.claude.json (not inside ~/.claude/), so without this it resets on rebuild.
claude_json=/home/vscode/.claude.json
claude_json_target=/home/vscode/.claude/claude.json
[ -e "$claude_json" ] || echo "{}" > "$claude_json"
if [ ! -L "$claude_json" ]; then
  if [ ! -f "$claude_json_target" ]; then
    if [ -f "$claude_json" ]; then
      mv "$claude_json" "$claude_json_target"
    else
      touch "$claude_json_target"
    fi
  fi
  rm -f "$claude_json"
  ln -s "$claude_json_target" "$claude_json"
fi
