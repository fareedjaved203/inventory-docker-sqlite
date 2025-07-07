import { PrismaClient } from '@prisma/client';

async function addLoanTransactions() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Adding LoanTransaction table...');
    
    // Check if table already exists
    const tables = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name='LoanTransaction'`;
    
    if (tables.length === 0) {
      await prisma.$executeRaw`
        CREATE TABLE "LoanTransaction" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "amount" INTEGER NOT NULL,
          "type" TEXT NOT NULL,
          "description" TEXT,
          "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "contactId" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        )
      `;
      console.log('✅ LoanTransaction table created successfully');
    } else {
      console.log('✅ LoanTransaction table already exists');
    }
    
  } catch (error) {
    console.error('❌ Error adding LoanTransaction table:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addLoanTransactions();