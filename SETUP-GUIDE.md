# Setup Guide - Running Without Docker

## Prerequisites

1. **Install Node.js** (version 16 or higher)
   - Download from: https://nodejs.org/
   - Choose the LTS version
   - Install with default settings

## Automatic Setup (Recommended)

1. **Double-click** `setup-and-run.bat`
2. Wait for the setup to complete
3. The application will start automatically
4. Open your browser and go to: http://localhost:3000

## Manual Setup Steps

If you prefer to run commands manually:

### Step 1: Setup Backend
```bash
cd backend
npm install
copy .env.example .env
npx prisma generate
npx prisma migrate dev --name init
```

### Step 2: Setup Frontend
```bash
cd ../frontend
npm install
npm run build
```

### Step 3: Start the Application
```bash
cd ../backend
npm start
```

### Step 4: Access the Application
Open your browser and go to: http://localhost:3000

## Development Mode

If you want to run in development mode with hot reload:

### Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

### Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

Then access:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## Troubleshooting

### Common Issues:

1. **"Node.js not found"**
   - Install Node.js from https://nodejs.org/
   - Restart your command prompt

2. **"npm not found"**
   - Node.js installation includes npm
   - Restart your command prompt after installing Node.js

3. **Port 3000 already in use**
   - Close any other applications using port 3000
   - Or change the PORT in backend/.env file

4. **Database errors**
   - Delete the `backend/prisma/dev.db` file
   - Run `npx prisma migrate dev --name init` again

5. **Frontend not loading**
   - Make sure you ran `npm run build` in the frontend folder
   - Check that `frontend/dist` folder exists

## Stopping the Application

- Press `Ctrl+C` in the terminal where the server is running
- Close the command prompt window