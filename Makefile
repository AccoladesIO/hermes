# Hermes — developer shortcuts
SERVICES := gateway user-service task-service notification-service

.PHONY: help up down logs build test lint install clean observability

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

up: ## Build and start the whole stack
	docker compose up --build -d

down: ## Stop the stack and remove volumes
	docker compose down -v

logs: ## Tail logs from all services
	docker compose logs -f

build: ## Build all images
	docker compose build

observability: ## Start the stack with Prometheus + Grafana
	docker compose --profile observability up --build -d

install: ## Install dependencies for every service
	@for s in $(SERVICES); do echo ">> $$s"; (cd $$s && npm install); done

test: ## Run the test suite for every service
	@for s in $(SERVICES); do echo ">> $$s"; (cd $$s && npm test) || exit 1; done

lint: ## Lint every service
	@for s in $(SERVICES); do echo ">> $$s"; (cd $$s && npm run lint) || exit 1; done

clean: ## Remove node_modules from every service
	@for s in $(SERVICES); do rm -rf $$s/node_modules; done
