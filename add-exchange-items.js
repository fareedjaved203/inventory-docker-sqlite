import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addExchangeItems() {
  try {
    console.log('Adding exchange items support...');
    
    // Add the exchangeItems table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "ExchangeItem" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "quantity" INTEGER NOT NULL,
        "price" REAL NOT NULL,
        "orderIndex" INTEGER NOT NULL DEFAULT 0,
        "saleId" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ExchangeItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "ExchangeItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `;

    console.log('Exchange items table created successfully!');
  } catch (error) {
    console.error('Error adding exchange items:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addExchangeItems();