import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

async function migrateToDecimal() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Checking if decimal migration is needed...');
    
    // Check if we need to migrate by testing a known field type
    const result = await prisma.$queryRaw`PRAGMA table_info(Product)`;
    const priceColumn = result.find(col => col.name === 'price');
    
    if (priceColumn && priceColumn.type === 'BIGINT') {
      console.log('BigInt fields detected, migrating to decimal support...');
      
      // Run the migration SQL
      const migrationSQL = `
        -- Create new tables with REAL (Float) types
        CREATE TABLE IF NOT EXISTS "Product_new" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "name" TEXT NOT NULL,
            "description" TEXT NOT NULL,
            "price" REAL NOT NULL,
            "purchasePrice" REAL DEFAULT 0,
            "sku" TEXT,
            "quantity" INTEGER NOT NULL,
            "damagedQuantity" INTEGER NOT NULL DEFAULT 0,
            "lowStockThreshold" INTEGER NOT NULL DEFAULT 10,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL
        );

        CREATE TABLE IF NOT EXISTS "Sale_new" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "billNumber" TEXT NOT NULL,
            "totalAmount" REAL NOT NULL,
            "originalTotalAmount" REAL,
            "discount" REAL NOT NULL DEFAULT 0,
            "paidAmount" REAL NOT NULL DEFAULT 0,
            "saleDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "description" TEXT,
            "contactId" TEXT,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL,
            CONSTRAINT "Sale_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS "SaleItem_new" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "quantity" INTEGER NOT NULL,
            "price" REAL NOT NULL,
            "purchasePrice" REAL NOT NULL DEFAULT 0,
            "orderIndex" INTEGER NOT NULL DEFAULT 0,
            "saleId" TEXT NOT NULL,
            "productId" TEXT NOT NULL,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL,
            CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
            CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS "BulkPurchase_new" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "invoiceNumber" TEXT,
            "totalAmount" REAL NOT NULL,
            "paidAmount" REAL NOT NULL,
            "purchaseDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "contactId" TEXT NOT NULL,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL,
            CONSTRAINT "BulkPurchase_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS "BulkPurchaseItem_new" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "quantity" INTEGER NOT NULL,
            "purchasePrice" REAL NOT NULL,
            "bulkPurchaseId" TEXT NOT NULL,
            "productId" TEXT NOT NULL,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL,
            CONSTRAINT "BulkPurchaseItem_bulkPurchaseId_fkey" FOREIGN KEY ("bulkPurchaseId") REFERENCES "BulkPurchase" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
            CONSTRAINT "BulkPurchaseItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS "SaleReturn_new" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "returnNumber" TEXT NOT NULL,
            "totalAmount" REAL NOT NULL,
            "returnDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "reason" TEXT,
            "refundAmount" REAL NOT NULL DEFAULT 0,
            "refundPaid" BOOLEAN NOT NULL DEFAULT false,
            "refundDate" DATETIME,
            "saleId" TEXT NOT NULL,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL,
            CONSTRAINT "SaleReturn_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS "SaleReturnItem_new" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "quantity" INTEGER NOT NULL,
            "price" REAL NOT NULL,
            "saleReturnId" TEXT NOT NULL,
            "productId" TEXT NOT NULL,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL,
            CONSTRAINT "SaleReturnItem_saleReturnId_fkey" FOREIGN KEY ("saleReturnId") REFERENCES "SaleReturn" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
            CONSTRAINT "SaleReturnItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS "LoanTransaction_new" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "amount" REAL NOT NULL,
            "type" TEXT NOT NULL,
            "description" TEXT,
            "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "contactId" TEXT NOT NULL,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL,
            CONSTRAINT "LoanTransaction_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );
      `;

      // Execute the table creation
      await prisma.$executeRawUnsafe(migrationSQL);

      // Copy data with proper type conversion
      console.log('Copying data to new tables...');
      
      await prisma.$executeRaw`
        INSERT INTO Product_new SELECT 
            id, name, description, 
            CAST(price AS REAL), 
            CAST(COALESCE(purchasePrice, 0) AS REAL),
            sku, 
            CAST(quantity AS INTEGER), 
            CAST(COALESCE(damagedQuantity, 0) AS INTEGER), 
            CAST(COALESCE(lowStockThreshold, 10) AS INTEGER),
            createdAt, updatedAt 
        FROM Product;
      `;

      await prisma.$executeRaw`
        INSERT INTO Sale_new SELECT 
            id, billNumber, 
            CAST(totalAmount AS REAL), 
            CAST(originalTotalAmount AS REAL),
            CAST(COALESCE(discount, 0) AS REAL), 
            CAST(COALESCE(paidAmount, 0) AS REAL),
            saleDate, description, contactId, createdAt, updatedAt 
        FROM Sale;
      `;

      await prisma.$executeRaw`
        INSERT INTO SaleItem_new SELECT 
            id, 
            CAST(quantity AS INTEGER), 
            CAST(price AS REAL), 
            CAST(COALESCE(purchasePrice, 0) AS REAL),
            COALESCE(orderIndex, 0), saleId, productId, createdAt, updatedAt 
        FROM SaleItem;
      `;

      // Check if tables exist before copying
      const tables = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table'`;
      const tableNames = tables.map(t => t.name);

      if (tableNames.includes('BulkPurchase')) {
        await prisma.$executeRaw`
          INSERT INTO BulkPurchase_new SELECT 
              id, invoiceNumber, 
              CAST(totalAmount AS REAL), 
              CAST(paidAmount AS REAL),
              purchaseDate, contactId, createdAt, updatedAt 
          FROM BulkPurchase;
        `;
      }

      if (tableNames.includes('BulkPurchaseItem')) {
        await prisma.$executeRaw`
          INSERT INTO BulkPurchaseItem_new SELECT 
              id, 
              CAST(quantity AS INTEGER), 
              CAST(purchasePrice AS REAL),
              bulkPurchaseId, productId, createdAt, updatedAt 
          FROM BulkPurchaseItem;
        `;
      }

      if (tableNames.includes('SaleReturn')) {
        await prisma.$executeRaw`
          INSERT INTO SaleReturn_new SELECT 
              id, returnNumber, 
              CAST(totalAmount AS REAL),
              returnDate, reason, 
              CAST(COALESCE(refundAmount, 0) AS REAL),
              COALESCE(refundPaid, false), refundDate, saleId, createdAt, updatedAt 
          FROM SaleReturn;
        `;
      }

      if (tableNames.includes('SaleReturnItem')) {
        await prisma.$executeRaw`
          INSERT INTO SaleReturnItem_new SELECT 
              id, 
              CAST(quantity AS INTEGER), 
              CAST(price AS REAL),
              saleReturnId, productId, createdAt, updatedAt 
          FROM SaleReturnItem;
        `;
      }

      if (tableNames.includes('LoanTransaction')) {
        await prisma.$executeRaw`
          INSERT INTO LoanTransaction_new SELECT 
              id, 
              CAST(amount AS REAL),
              type, description, date, contactId, createdAt, updatedAt 
          FROM LoanTransaction;
        `;
      }

      console.log('Replacing old tables with new ones...');

      // Drop old tables and rename new ones
      const dropAndRename = `
        DROP TABLE IF EXISTS Product;
        DROP TABLE IF EXISTS Sale;
        DROP TABLE IF EXISTS SaleItem;
        DROP TABLE IF EXISTS BulkPurchase;
        DROP TABLE IF EXISTS BulkPurchaseItem;
        DROP TABLE IF EXISTS SaleReturn;
        DROP TABLE IF EXISTS SaleReturnItem;
        DROP TABLE IF EXISTS LoanTransaction;

        ALTER TABLE Product_new RENAME TO Product;
        ALTER TABLE Sale_new RENAME TO Sale;
        ALTER TABLE SaleItem_new RENAME TO SaleItem;
        ALTER TABLE BulkPurchase_new RENAME TO BulkPurchase;
        ALTER TABLE BulkPurchaseItem_new RENAME TO BulkPurchaseItem;
        ALTER TABLE SaleReturn_new RENAME TO SaleReturn;
        ALTER TABLE SaleReturnItem_new RENAME TO SaleReturnItem;
        ALTER TABLE LoanTransaction_new RENAME TO LoanTransaction;

        CREATE UNIQUE INDEX IF NOT EXISTS "Product_name_key" ON "Product"("name");
        CREATE UNIQUE INDEX IF NOT EXISTS "Sale_billNumber_key" ON "Sale"("billNumber");
        CREATE UNIQUE INDEX IF NOT EXISTS "BulkPurchase_invoiceNumber_key" ON "BulkPurchase"("invoiceNumber");
        CREATE UNIQUE INDEX IF NOT EXISTS "SaleReturn_returnNumber_key" ON "SaleReturn"("returnNumber");
      `;

      await prisma.$executeRawUnsafe(dropAndRename);
      
      console.log('✅ Successfully migrated to decimal support!');
    } else {
      console.log('✅ Database already supports decimals, no migration needed.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrateToDecimal().catch(console.error);
}

export { migrateToDecimal };