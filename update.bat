@echo off
title Update Inventory App
echo === Update Inventory App ===

echo.
echo Stopping container...
docker-compose -f docker-compose.production.yml stop inventory-app

echo.
echo Clearing Docker auth cache...
docker logout ghcr.io

echo.
echo Pulling latest image...
docker-compose -f docker-compose.production.yml pull inventory-app

echo.
echo Recreating container with new image...
docker-compose -f docker-compose.production.yml up -d --no-deps inventory-app

echo.
echo ✅ Update completed successfully! Container updated with latest image.
echo Database and data remain unchanged.
pause