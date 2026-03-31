#!/usr/bin/env bash
set -euo pipefail

IMAGE=${IMAGE:-labcabrera/rmu-api-tactical}
TAG=${TAG:-latest}
PLATFORMS=${PLATFORMS:-linux/amd64,linux/arm64}

echo "Building and pushing ${IMAGE}:${TAG} for platforms: ${PLATFORMS}"

docker buildx build \
  --platform "${PLATFORMS}" \
  -t "${IMAGE}:${TAG}" \
  --push \
  .

echo "Buildx push completed: ${IMAGE}:${TAG}"
