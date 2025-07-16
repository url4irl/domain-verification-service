#!/bin/bash
# Stop any running containers with their networks
docker compose -f ./dev/docker-compose.yml down --volumes --remove-orphans

# Remove the volume explicitly
docker volume rm domain_verification_service_db_postgres_data || true

# Force remove any dangling volumes
docker volume prune -f

# Remove the containers to be sure
docker rm -f domain_verification_service_db || true

# Verify cleanup
echo "Checking for remaining volumes..."
docker volume ls | grep -E 'domain_verification_service_db_postgres_data' || echo "Volumes successfully removed"

echo "Checking for remaining containers..."
docker ps -a | grep -E 'domain_verification_service_db' || echo "Containers successfully removed"