#!/bin/bash
set -e

ROOT_DIR=$(pwd)

# The opencode bind mounts can make Docker create parent directories as root.
sudo mkdir -p /home/vscode/.config
sudo mkdir -p /home/vscode/.local/share/opencode/repos
sudo chown vscode:vscode /home/vscode/.config /home/vscode/.local /home/vscode/.local/share /home/vscode/.local/share/opencode /home/vscode/.local/share/opencode/repos

# Keep pnpm's content-addressable store out of the mounted workspace.
pnpm config set store-dir "$HOME/.local/share/pnpm/store"

echo "Installing Web dependencies..."
cd "$ROOT_DIR/web" && pnpm install && pnpm db:setup:local
