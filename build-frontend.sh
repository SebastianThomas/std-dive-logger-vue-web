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
# Optional build mode (staging or production) passed as second argument
BUILD_MODE="${2:-production}"

if [[ -n "$VERSION" ]]; then
    # Build with both latest and version tags
    docker build . --platform "$PLATFORM" --build-arg BUILD_MODE="$BUILD_MODE" -t "$IMAGE:latest" -t "$IMAGE:$VERSION"
    # Push both tags
    docker push "$IMAGE:latest"
    docker push "$IMAGE:$VERSION"
else
    # Build and push only latest
    docker build . --platform "$PLATFORM" --build-arg BUILD_MODE="$BUILD_MODE" -t "$IMAGE:latest"
    docker push "$IMAGE:latest"
fi
