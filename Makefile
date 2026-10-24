IMAGE          ?= labcabrera/rmu-api-tactical
TAG            ?= latest
IMAGE_NAME     ?= $(IMAGE):$(TAG)
PLATFORMS      ?= linux/amd64,linux/arm64
CONTAINER_NAME ?= rmu-api-tactical
ENV_FILE       ?= .env.docker
HOST_PORT      ?= 3003
CONTAINER_PORT ?= 3003
NETWORK        ?= rmu-network
REMOTE         ?= origin
MASTER_BRANCH  ?= main
DEVELOP_BRANCH ?= develop
RELEASE_BUMP   ?=

.DEFAULT_GOAL := help
.PHONY: help check docker-build docker-stop docker-run docker-logs docker-push create-release

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

check: ## Lint, type-check, unit and e2e tests (what CI runs before the build)
	pnpm run check
	pnpm run test:e2e

docker-build: ## Build the local docker image
	docker build -t "$(IMAGE_NAME)" .

docker-stop: ## Stop and remove the container and the local image
	-docker stop "$(CONTAINER_NAME)" >/dev/null 2>&1
	-docker rm "$(CONTAINER_NAME)" >/dev/null 2>&1
	-docker rmi "$(IMAGE_NAME)" >/dev/null 2>&1

docker-run: ## Rebuild the image and run it on the docker network, following logs
	@test -f "$(ENV_FILE)" || { echo "Missing $(ENV_FILE). Copy .env.docker.example to $(ENV_FILE) and provide local secret values." >&2; exit 1; }
	$(MAKE) docker-stop
	$(MAKE) docker-build
	docker run -d \
		-p "$(HOST_PORT):$(CONTAINER_PORT)" \
		--network $(NETWORK) \
		--name "$(CONTAINER_NAME)" \
		-h "$(CONTAINER_NAME)" \
		--env-file "$(ENV_FILE)" \
		"$(IMAGE_NAME)"
	$(MAKE) docker-logs

docker-logs: ## Follow the container logs
	docker logs -f "$(CONTAINER_NAME)"

docker-push: ## Build multi-platform image with buildx and push it to Docker Hub
	@echo "Building and pushing $(IMAGE):$(TAG) for platforms: $(PLATFORMS)"
	docker buildx build \
		--platform "$(PLATFORMS)" \
		-t "$(IMAGE):$(TAG)" \
		--push \
		.
	@echo "Buildx push completed: $(IMAGE):$(TAG)"

create-release: ## Release develop to master with semantic-release (tag + CHANGELOG), push, and bump develop to next -SNAPSHOT. Optional RELEASE_BUMP=patch|minor|major
	@test "$$(git branch --show-current)" = "$(DEVELOP_BRANCH)" || { echo "Releases must start from '$(DEVELOP_BRANCH)' (current: $$(git branch --show-current))" >&2; exit 1; }
	@test -z "$$(git status --porcelain)" || { echo "Working directory is not clean:" >&2; git status --short >&2; exit 1; }
	git fetch --tags $(REMOTE)
	git pull --ff-only $(REMOTE) $(DEVELOP_BRANCH)
	git checkout $(MASTER_BRANCH) 2>/dev/null || git checkout -b $(MASTER_BRANCH) --track $(REMOTE)/$(MASTER_BRANCH)
	git pull --ff-only $(REMOTE) $(MASTER_BRANCH)
	git merge --no-ff --no-edit -m "Merge branch '$(DEVELOP_BRANCH)' into $(MASTER_BRANCH)" $(DEVELOP_BRANCH)
	@RELEASE_BUMP="$(RELEASE_BUMP)" pnpm exec semantic-release --no-ci \
		&& git describe --exact-match --tags HEAD >/dev/null 2>&1 \
		|| { echo "No release was created, restoring $(MASTER_BRANCH) and returning to $(DEVELOP_BRANCH)" >&2; \
			git reset -q --hard $(REMOTE)/$(MASTER_BRANCH); git checkout -q $(DEVELOP_BRANCH); exit 1; }
	git checkout $(DEVELOP_BRANCH)
	git merge --no-edit $(MASTER_BRANCH)
	@version=$$(node -p "require('./package.json').version"); \
		next=$$(pnpm exec semver -i patch "$$version")-SNAPSHOT; \
		pnpm pkg set version="$$next" \
		&& git commit -q -m "chore: prepare next development version $$next" package.json \
		&& echo "Released $$version, $(DEVELOP_BRANCH) is now at $$next"
	git push $(REMOTE) $(DEVELOP_BRANCH)
