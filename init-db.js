import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${path.join(__dirname, 'prisma', 'data', 'inventory.db')}`
    }
  }
});

async function addColumnIfNotExists(tableName, columnName, columnDefinition) {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
    console.log(`Added ${columnName} to ${tableName}`);
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log(`${columnName} already exists in ${tableName}`);
    } else {
      throw error;
    }
  }
}

async function createTableIfNotExists(tableName, createStatement) {
  try {
    await prisma.$executeRawUnsafe(createStatement);
    console.log(`Created table ${tableName}`);
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log(`Table ${tableName} already exists`);
    } else {
      throw error;
    }
  }
}

async function main() {
  console.log('Initializing database with complete schema...');
  
  try {
    // Create all tables with complete schema
    await createTableIfNotExists('Product', `
      CREATE TABLE "Product" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL UNIQUE,
        "description" TEXT NOT NULL,
        "price" BIGINT NOT NULL,
        "purchasePrice" BIGINT DEFAULT 0,
        "sku" TEXT,
        "quantity" BIGINT NOT NULL,
        "damagedQuantity" BIGINT DEFAULT 0,
        "lowStockThreshold" BIGINT DEFAULT 10,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await createTableIfNotExists('Contact', `
      CREATE TABLE "Contact" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "address" TEXT,
        "phoneNumber" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await createTableIfNotExists('Sale', `
      CREATE TABLE "Sale" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "billNumber" TEXT NOT NULL UNIQUE,
        "totalAmount" BIGINT NOT NULL,
        "originalTotalAmount" BIGINT,
        "discount" BIGINT DEFAULT 0,
        "paidAmount" BIGINT DEFAULT 0,
        "saleDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "description" TEXT,
        "contactId" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);

    await createTableIfNotExists('SaleItem', `
      CREATE TABLE "SaleItem" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "quantity" BIGINT NOT NULL,
        "price" BIGINT NOT NULL,
        "purchasePrice" BIGINT DEFAULT 0,
        "orderIndex" INTEGER DEFAULT 0,
        "saleId" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    await createTableIfNotExists('BulkPurchase', `
      CREATE TABLE "BulkPurchase" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "invoiceNumber" TEXT UNIQUE,
        "totalAmount" BIGINT NOT NULL,
        "paidAmount" BIGINT NOT NULL,
        "purchaseDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "contactId" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    await createTableIfNotExists('BulkPurchaseItem', `
      CREATE TABLE "BulkPurchaseItem" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "quantity" BIGINT NOT NULL,
        "purchasePrice" BIGINT NOT NULL,
        "bulkPurchaseId" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("bulkPurchaseId") REFERENCES "BulkPurchase" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    await createTableIfNotExists('SaleReturn', `
      CREATE TABLE "SaleReturn" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "returnNumber" TEXT NOT NULL UNIQUE,
        "totalAmount" BIGINT NOT NULL,
        "returnDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "reason" TEXT,
        "refundAmount" BIGINT DEFAULT 0,
        "refundPaid" BOOLEAN DEFAULT false,
        "refundDate" DATETIME,
        "saleId" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    await createTableIfNotExists('SaleReturnItem', `
      CREATE TABLE "SaleReturnItem" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "quantity" BIGINT NOT NULL,
        "price" BIGINT NOT NULL,
        "saleReturnId" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("saleReturnId") REFERENCES "SaleReturn" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    await createTableIfNotExists('LoanTransaction', `
      CREATE TABLE "LoanTransaction" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "amount" BIGINT NOT NULL,
        "type" TEXT NOT NULL,
        "description" TEXT,
        "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "contactId" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);

    await createTableIfNotExists('DriveSettings', `
      CREATE TABLE "DriveSettings" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "serviceAccountKey" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await createTableIfNotExists('User', `
      CREATE TABLE "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL,
        "resetOtp" TEXT,
        "otpExpiry" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await createTableIfNotExists('ShopSettings', `
      CREATE TABLE "ShopSettings" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL,
        "shopName" TEXT NOT NULL,
        "shopDescription" TEXT,
        "shopDescription2" TEXT,
        "userName1" TEXT NOT NULL,
        "userPhone1" TEXT NOT NULL,
        "userName2" TEXT,
        "userPhone2" TEXT,
        "userName3" TEXT,
        "userPhone3" TEXT,
        "brand1" TEXT,
        "brand1Registered" BOOLEAN DEFAULT false,
        "brand2" TEXT,
        "brand2Registered" BOOLEAN DEFAULT false,
        "brand3" TEXT,
        "brand3Registered" BOOLEAN DEFAULT false,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add missing columns to existing tables (for upgrades)
    await addColumnIfNotExists('Product', 'purchasePrice', 'BIGINT DEFAULT 0');
    await addColumnIfNotExists('Product', 'damagedQuantity', 'BIGINT DEFAULT 0');
    await addColumnIfNotExists('Product', 'lowStockThreshold', 'BIGINT DEFAULT 10');
    await addColumnIfNotExists('Sale', 'originalTotalAmount', 'BIGINT');
    await addColumnIfNotExists('Sale', 'discount', 'BIGINT DEFAULT 0');
    await addColumnIfNotExists('Sale', 'description', 'TEXT');
    await addColumnIfNotExists('SaleItem', 'purchasePrice', 'BIGINT DEFAULT 0');
    await addColumnIfNotExists('SaleItem', 'orderIndex', 'INTEGER DEFAULT 0');
    
    console.log('Database initialization completed successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();