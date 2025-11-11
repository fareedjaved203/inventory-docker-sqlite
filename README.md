# Inventory Management System

A complete inventory management system with SQLite database, containerized in a single Docker image.

## Features

- Product management with decimal price support
- Sales tracking with decimal amounts
- Vendor management
- Bulk purchasing
- Dashboard with analytics
- Single container deployment
- Automatic database migration for decimal support

## Running the Application

### Development Mode (with hot reloading)

```bash
docker-compose -f docker-compose.dev.yml up
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

Changes to code will automatically reload without rebuilding.

### Production Mode

```bash
docker-compose up --build
```

The application will be available at http://localhost:3000

### Manual Build

```bash
docker build -t inventory-app .
docker run -p 3000:3000 -v inventory_data:/app/prisma/data inventory-app
```

## Technical Details

- **Backend**: Node.js with Express
- **Database**: SQLite3
- **Frontend**: React with Vite
- **Containerization**: Multi-stage Docker build
- **Data Persistence**: Docker volume for SQLite database

## Development

To run in development mode:

1. Start the backend:
```bash
cd backend
npm install
npm run dev
```

2. Start the frontend:
```bash
cd frontend
npm install
npm run dev
```