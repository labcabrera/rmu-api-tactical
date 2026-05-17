#!/bin/bash

set -euo pipefail

CONTAINER_NAME="${CONTAINER_NAME:-rmu-api-tactical}"
IMAGE_NAME="${IMAGE_NAME:-labcabrera/rmu-api-tactical:latest}"
ENV_FILE="${ENV_FILE:-.env.docker}"
HOST_PORT="${HOST_PORT:-3003}"
CONTAINER_PORT="${CONTAINER_PORT:-3003}"

if [ ! -f "${ENV_FILE}" ]; then
    echo "Missing ${ENV_FILE}. Copy docker-run.env.example to ${ENV_FILE} and provide local secret values." >&2
    exit 1
fi

docker stop "${CONTAINER_NAME}" >/dev/null 2>&1 || true

docker rm "${CONTAINER_NAME}" >/dev/null 2>&1 || true

docker rmi "${IMAGE_NAME}" >/dev/null 2>&1 || true

docker build -t "${IMAGE_NAME}" .

docker run -d \
    -p "${HOST_PORT}:${CONTAINER_PORT}" \
    --network rmu-network \
    --name "${CONTAINER_NAME}" \
    -h "${CONTAINER_NAME}" \
    --env-file "${ENV_FILE}" \
    "${IMAGE_NAME}"

docker logs -f "${CONTAINER_NAME}"
