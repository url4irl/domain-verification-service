#!/bin/bash

set -e

SERVICE_NAME="domain-verification-service"
CONTAINER_NAME="domain-verification-service-test"
DB_COMPOSE_FILE="./dev/docker-compose.yml"
CLEAN_DB_SCRIPT="./dev/clean-db.sh"
API_PORT=4000
API_URL="http://localhost:${API_PORT}"

echo "--- Setting up test database ---"
./scripts/setup-test.sh

echo "--- Building Docker image for the service ---"
docker build -t ${SERVICE_NAME} .

echo "--- Running service Docker container ---"
# Remove any existing container with the same name
docker rm -f ${CONTAINER_NAME}
# Run the new container, linking it to the test database network
docker run -d -p ${API_PORT}:${API_PORT} --name ${CONTAINER_NAME} --network dev_default -e DATABASE_URL="postgres://postgres:postgres@domain_verification_service_db:5432/postgres_test" ${SERVICE_NAME}

echo "--- Waiting for service to be ready ---"
# Wait for the service's health check endpoint to respond
until nc -z localhost ${API_PORT}; do
  echo "Waiting for service to start..."
  sleep 2
done

echo "--- Service is ready. Running API endpoint tests ---"

# --- API Endpoint Tests ---

echo "Testing GET /"
curl -s ${API_URL} | jq .

echo "Testing POST /api/domains/push"
curl -s -X POST -H "Content-Type: application/json" -d '{
  "domain": "example.com",
  "ip": "192.168.1.1",
  "customerId": "testuser123"
}' ${API_URL}/api/domains/push | jq .

echo "Testing POST /api/domains/verify"
curl -s -X POST -H "Content-Type: application/json" -d '{
  "domain": "example.com",
  "customerId": "testuser123",
  "serviceHost": "your-service.com",
  "txtRecordVerifyKey": "verify-key-123"
}' ${API_URL}/api/domains/verify | jq .

echo "Testing POST /api/domains/check"
curl -s -X POST -H "Content-Type: application/json" -d '{
  "domain": "example.com",
  "customerId": "testuser123",
  "serviceHost": "your-service.com",
  "txtRecordVerifyKey": "verify-key-123"
}' ${API_URL}/api/domains/check | jq .

echo "Testing GET /api/domains/status"
curl -s "${API_URL}/api/domains/status?domain=example.com&customerId=testuser123" | jq .

echo "--- All API endpoint tests completed ---"

echo "--- Teardown: Stopping and removing service container ---"
docker stop ${CONTAINER_NAME}
docker rm ${CONTAINER_NAME}

echo "--- Teardown: Cleaning up test database data ---"
${CLEAN_DB_SCRIPT}

echo "--- Test script finished ---"
