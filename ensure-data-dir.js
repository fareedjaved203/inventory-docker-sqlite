import fs from 'fs';
import path from 'path';

// Ensure data directory exists
const dataDir = '/app/prisma/data';
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('Created data directory:', dataDir);
}