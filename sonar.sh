#!/bin/bash

set -a
source ./.env
set -e

# echo "SONAR_URL=$SONAR_URL"
# echo "SONAR_TOKEN=$SONAR_TOKEN"

# docker run --rm \
#   -e SONAR_HOST_URL="$SONAR_URL" \
#   -e SONAR_LOGIN="$SONAR_TOKEN" \
#   -v "$(pwd):/usr/src" \
#   -w /usr/src \
#   sonarsource/sonar-scanner-cli:latest

sonar-scanner \
  -Dsonar.projectKey=rmu-api-tactical \
  -Dsonar.sources=src \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.typescript.tsconfigPaths=tsconfig.sonar.json \
  -Dsonar.login=sqp_5f7d34163408fdfb5fa88b5a3f6fe6421c23d6b1  