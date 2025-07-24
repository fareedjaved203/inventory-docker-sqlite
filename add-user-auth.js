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
          "username" TEXT NOT NULL UNIQUE,
          "password" TEXT NOT NULL,
          "email" TEXT,
          "resetOtp" TEXT,
          "otpExpiry" DATETIME,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `;
      console.log('✅ User authentication table created successfully');
    } else {
      // Check if email column exists and add missing columns
      const columns = await prisma.$queryRaw`PRAGMA table_info(User)`;
      const hasEmail = columns.some(col => col.name === 'email');
      const hasResetOtp = columns.some(col => col.name === 'resetOtp');
      const hasOtpExpiry = columns.some(col => col.name === 'otpExpiry');
      
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
    
  } catch (error) {
    console.error('❌ Error adding User authentication table:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addUserAuth();