import fs from 'fs';
import path from 'path';

// Ensure data directory exists with proper permissions
const dataDir = '/app/prisma/data';
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o777 });
  console.log('Created data directory:', dataDir);
} else {
  console.log('Data directory already exists:', dataDir);
}

// Ensure database file is writable if it exists
const dbPath = path.join(dataDir, 'inventory.db');
if (fs.existsSync(dbPath)) {
  try {
    fs.chmodSync(dbPath, 0o666);
    console.log('Set database file permissions');
  } catch (error) {
    console.log('Could not set database file permissions (this is usually fine):', error.message);
  }
}