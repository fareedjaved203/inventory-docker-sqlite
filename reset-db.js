import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function resetDatabase() {
  try {
    console.log('Resetting database...');
    
    // Delete the database file
    const dbPath = '/app/prisma/data/inventory.db';
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log('Database file deleted.');
    }
    
    console.log('Database reset completed.');
  } catch (error) {
    console.error('Error resetting database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase();