#!/bin/bash

set -a
source ./.env
set -e


docker run --rm \
  -e SONAR_HOST_URL="$SONAR_URL" \
  -e SONAR_LOGIN="$SONAR_TOKEN" \
  -v "$(pwd):/usr/src" \
  -w /usr/src \
  sonarsource/sonar-scanner-cli:latest