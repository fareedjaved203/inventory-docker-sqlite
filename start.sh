#!/bin/sh
set -e

# Run database initialization script
echo "Initializing database..."
node init-db.js

# Start the application
echo "Starting application..."
exec node src/index.js