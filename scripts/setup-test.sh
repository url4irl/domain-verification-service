#!/bin/bash

# Setup script for test environment
echo "Setting up test environment..."

# Start PostgreSQL container if not running
if ! docker ps | grep -q domain_verification_service_db; then
    echo "Starting PostgreSQL container..."
    docker compose -f ./dev/docker-compose.yml up -d
    
    # Wait for PostgreSQL to be ready
    echo "Waiting for PostgreSQL to be ready..."
    npx wait-on tcp:5432 --timeout 30000
fi

# Create test database if it doesn't exist
echo "Creating test database..."
docker exec domain_verification_service_db psql -U postgres -c "CREATE DATABASE postgres_test;" 2>/dev/null || echo "Test database already exists"

# Run migrations on test database
echo "Running migrations on test database..."
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres_test npx drizzle-kit migrate

echo "Test environment setup complete!"
