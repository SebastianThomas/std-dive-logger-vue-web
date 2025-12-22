#!/usr/bin/env bash
set -euo pipefail

IMAGE="sthomasch/std-dive-logger-web"
PLATFORM="${PLATFORM:-linux/amd64}"

# Optional version tag passed as first argument
VERSION="${1:-}"

if [[ -n "$VERSION" ]]; then
    # Build with both latest and version tags
    docker build . --platform "$PLATFORM" -t "$IMAGE:latest" -t "$IMAGE:$VERSION"
    # Push both tags
    docker push "$IMAGE:latest"
    docker push "$IMAGE:$VERSION"
else
    # Build and push only latest
    docker build . --platform "$PLATFORM" -t "$IMAGE:latest"
    docker push "$IMAGE:latest"
fi
