#!/bin/bash

echo "Updating Inventory Management System with Description Field Support..."
echo

echo "Step 1: Stopping current containers..."
docker-compose down

echo
echo "Step 2: Pulling latest Docker image..."
docker pull ghcr.io/fareedjaved203/inventory-docker-sqlite:latest

echo
echo "Step 3: Starting updated containers..."
docker-compose up -d

echo
echo "Update complete! The application now supports description fields in sales."
echo "Access your application at: http://localhost:3000"
echo