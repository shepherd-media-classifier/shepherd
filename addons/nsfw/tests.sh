#!/bin/bash

docker compose -f docker-compose.test.yml build 
docker compose -f docker-compose.test.yml run test-service npm test
# docker compose -f docker-compose.test.yml rm -f