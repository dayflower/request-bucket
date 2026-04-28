#!/bin/bash
set -e

BUMP="${1:-patch}"

if [[ ! "$BUMP" =~ ^(major|minor|patch)$ ]]; then
  echo "Usage: $0 [major|minor|patch]"
  exit 1
fi

DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD | sed 's|refs/remotes/origin/||')
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "$DEFAULT_BRANCH" ]]; then
  echo "Error: must be on the default branch ($DEFAULT_BRANCH), currently on '$CURRENT_BRANCH'"
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: uncommitted changes detected, please commit or stash them first"
  exit 1
fi

NEW_VERSION=$(bun version "$BUMP" | sed 's/^v//')
BRANCH="release/v${NEW_VERSION}"

git checkout -b "$BRANCH"
git add package.json bun.lock
git commit -m "chore: bump version to v${NEW_VERSION}"
git push origin "$BRANCH"

gh pr create \
  --title "chore: bump version to v${NEW_VERSION}" \
  --body "Bumps version to \`v${NEW_VERSION}\`. Merging this PR will automatically create the git tag, build Docker images, and publish a GitHub Release." \
  --base main
