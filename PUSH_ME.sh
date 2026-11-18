#!/bin/bash
# Run this once from your own Terminal (not from Claude) — it needs your
# GitHub credentials, which only exist on your Mac.
#
#   cd ~/shiurfinder && bash PUSH_ME.sh
#
set -e

echo "==> Fetching main from GitHub..."
git fetch origin main

echo "==> Basing the scaffold on main (keeps the staged files)..."
git reset --soft origin/main

echo "==> Committing as $(git config user.name) <$(git config user.email)>"
git commit -F .git/COMMIT_MSG_SCAFFOLD

echo "==> Pushing feat/fr5-map-search..."
git push -u origin feat/fr5-map-search

echo
echo "Done. Open the PR here:"
echo "  https://github.com/Reuvi5/shiurfinder/compare/main...feat/fr5-map-search?expand=1"
