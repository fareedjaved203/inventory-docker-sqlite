import { PrismaClient } from '@prisma/client';

async function addUserAuth() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Adding User authentication table...');
    
    const tables = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name='User'`;
    
    if (tables.length === 0) {
      await prisma.$executeRaw`
        CREATE TABLE "User" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "email" TEXT NOT NULL UNIQUE,
          "password" TEXT NOT NULL,
          "resetOtp" TEXT,
          "otpExpiry" DATETIME,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `;
      console.log('✅ User authentication table created successfully');
    } else {
      // Check table structure and migrate from username to email
      const columns = await prisma.$queryRaw`PRAGMA table_info(User)`;
      const hasUsername = columns.some(col => col.name === 'username');
      const hasEmail = columns.some(col => col.name === 'email');
      const hasResetOtp = columns.some(col => col.name === 'resetOtp');
      const hasOtpExpiry = columns.some(col => col.name === 'otpExpiry');
      
      if (hasUsername && !hasEmail) {
        console.log('🔄 Migrating from username to email-based authentication...');
        
        // Create new table with email structure
        await prisma.$executeRaw`
          CREATE TABLE "User_new" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "email" TEXT NOT NULL UNIQUE,
            "password" TEXT NOT NULL,
            "resetOtp" TEXT,
            "otpExpiry" DATETIME,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `;
        
        // Copy data from old table (username becomes email)
        await prisma.$executeRaw`
          INSERT INTO "User_new" (id, email, password, createdAt, updatedAt)
          SELECT id, username, password, createdAt, updatedAt FROM "User"
        `;
        
        // Drop old table and rename new one
        await prisma.$executeRaw`DROP TABLE "User"`;
        await prisma.$executeRaw`ALTER TABLE "User_new" RENAME TO "User"`;
        
        console.log('✅ Successfully migrated to email-based authentication');
      } else {
        // Add missing columns if needed
        if (!hasEmail) {
          await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN "email" TEXT`;
          console.log('✅ Added email column to User table');
        }
        
        if (!hasResetOtp) {
          await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN "resetOtp" TEXT`;
          console.log('✅ Added resetOtp column to User table');
        }
        
        if (!hasOtpExpiry) {
          await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN "otpExpiry" DATETIME`;
          console.log('✅ Added otpExpiry column to User table');
        }
        
        console.log('✅ User authentication table updated successfully');
      }
    }
    
  } catch (error) {
    console.error('❌ Error adding User authentication table:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addUserAuth();