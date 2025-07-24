import { PrismaClient } from '@prisma/client';

async function addDriveSettings() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Adding DriveSettings table...');
    
    const tables = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name='DriveSettings'`;
    
    if (tables.length === 0) {
      await prisma.$executeRaw`
        CREATE TABLE "DriveSettings" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "serviceAccountKey" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `;
      console.log('✅ DriveSettings table created successfully');
    } else {
      // Check if table has old structure and update it
      const columns = await prisma.$queryRaw`PRAGMA table_info(DriveSettings)`;
      const hasOldStructure = columns.some(col => col.name === 'clientId');
      
      if (hasOldStructure) {
        console.log('🔄 Updating DriveSettings table structure...');
        await prisma.$executeRaw`DROP TABLE "DriveSettings"`;
        await prisma.$executeRaw`
          CREATE TABLE "DriveSettings" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "serviceAccountKey" TEXT NOT NULL,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `;
        console.log('✅ DriveSettings table updated to new structure');
      } else {
        console.log('✅ DriveSettings table already exists with correct structure');
      }
    }
    
  } catch (error) {
    console.error('❌ Error adding DriveSettings table:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addDriveSettings();