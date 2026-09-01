#!/usr/bin/env bash

# Enable strict mode; fall back gracefully if not running under bash
if [ -n "${BASH_VERSION:-}" ]; then
    set -euo pipefail
else
    set -eu
fi

IMAGE="sthomasch/std-dive-logger-web"
PLATFORM="${PLATFORM:-linux/amd64}"

# Optional version tag passed as first argument
VERSION="${1:-}"
# Build mode passed as second argument: "staging" (dev deploy) or "production".
BUILD_MODE="${2:-production}"
# CARTO basemap key - read from the environment (CI: the matching GitHub
# environment's CARTO_API_KEY secret), never a committed value. Empty = the
# keyless public CARTO basemap.
CARTO_API_KEY="${CARTO_API_KEY:-}"

# Vite bakes the API URLs per mode, so dev and prod need separate images.
# staging  -> :staging  + :<version>-staging   (deployed to std-dive-logger-dev)
# production -> :latest  + :<version>            (deployed to std-dive-logger-prod)
if [[ "$BUILD_MODE" == "staging" ]]; then
    FLOATING="staging"
    SUFFIX="-staging"
else
    FLOATING="latest"
    SUFFIX=""
fi

TAGS=(-t "$IMAGE:$FLOATING")
[[ -n "$VERSION" ]] && TAGS+=(-t "$IMAGE:${VERSION}${SUFFIX}")

docker build . --platform "$PLATFORM" \
    --build-arg BUILD_MODE="$BUILD_MODE" \
    --build-arg CARTO_API_KEY="$CARTO_API_KEY" \
    "${TAGS[@]}"

docker push "$IMAGE:$FLOATING"
[[ -n "$VERSION" ]] && docker push "$IMAGE:${VERSION}${SUFFIX}"
