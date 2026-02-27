#!/usr/bin/env bash
# Bump version, commit, tag, and push. Run from repo root.
# Usage: pnpm release [patch|minor|major]   (default: patch)
# With GitFlow: merge develop → main, then run this from main.
set -e
RELEASE_TYPE=${1:-patch}
if [[ "$RELEASE_TYPE" != "patch" && "$RELEASE_TYPE" != "minor" && "$RELEASE_TYPE" != "major" ]]; then
	echo "Usage: pnpm release [patch|minor|major]"
	exit 1
fi

pnpm version "$RELEASE_TYPE" --no-git-tag-version
VERSION=$(node -p "require('./package.json').version")
git add package.json
[[ -f pnpm-lock.yaml ]] && git add pnpm-lock.yaml
git commit -m "chore(release): v$VERSION"
git tag "v$VERSION"
echo "Pushing branch and tag v$VERSION..."
git push origin HEAD
git push origin "v$VERSION"
echo "Done. CI will publish verso-lib@$VERSION to npm."
