import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateToBigInt() {
  try {
    console.log('Starting BigInt migration...');
    
    // Check if migration is needed
    try {
      await prisma.$executeRaw`SELECT price FROM Product LIMIT 1;`;
      console.log('Checking if BigInt migration is needed...');
    } catch (error) {
      console.log('Database not accessible, skipping migration.');
      return;
    }
    
    // Create new tables with BIGINT columns
    console.log('Creating new Product table with BIGINT columns...');
    await prisma.$executeRaw`CREATE TABLE Product_new (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price BIGINT NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      quantity BIGINT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );`;
    
    // Copy data from old table
    console.log('Copying data to new table...');
    await prisma.$executeRaw`INSERT INTO Product_new SELECT * FROM Product;`;
    
    // Drop old table and rename new one
    console.log('Replacing old table...');
    await prisma.$executeRaw`DROP TABLE Product;`;
    await prisma.$executeRaw`ALTER TABLE Product_new RENAME TO Product;`;
    
    // Update other tables
    console.log('Updating Sale table...');
    await prisma.$executeRaw`CREATE TABLE Sale_new (
      id TEXT PRIMARY KEY,
      billNumber TEXT UNIQUE NOT NULL,
      totalAmount BIGINT NOT NULL,
      paidAmount BIGINT DEFAULT 0,
      saleDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      contactId TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (contactId) REFERENCES Contact(id)
    );`;
    
    await prisma.$executeRaw`INSERT INTO Sale_new SELECT * FROM Sale;`;
    await prisma.$executeRaw`DROP TABLE Sale;`;
    await prisma.$executeRaw`ALTER TABLE Sale_new RENAME TO Sale;`;
    
    console.log('Updating SaleItem table...');
    await prisma.$executeRaw`CREATE TABLE SaleItem_new (
      id TEXT PRIMARY KEY,
      quantity BIGINT NOT NULL,
      price BIGINT NOT NULL,
      saleId TEXT NOT NULL,
      productId TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (saleId) REFERENCES Sale(id),
      FOREIGN KEY (productId) REFERENCES Product(id)
    );`;
    
    await prisma.$executeRaw`INSERT INTO SaleItem_new SELECT * FROM SaleItem;`;
    await prisma.$executeRaw`DROP TABLE SaleItem;`;
    await prisma.$executeRaw`ALTER TABLE SaleItem_new RENAME TO SaleItem;`;
    
    console.log('Updating BulkPurchase table...');
    await prisma.$executeRaw`CREATE TABLE BulkPurchase_new (
      id TEXT PRIMARY KEY,
      invoiceNumber TEXT UNIQUE,
      totalAmount BIGINT NOT NULL,
      paidAmount BIGINT NOT NULL,
      purchaseDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      contactId TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (contactId) REFERENCES Contact(id)
    );`;
    
    await prisma.$executeRaw`INSERT INTO BulkPurchase_new SELECT * FROM BulkPurchase;`;
    await prisma.$executeRaw`DROP TABLE BulkPurchase;`;
    await prisma.$executeRaw`ALTER TABLE BulkPurchase_new RENAME TO BulkPurchase;`;
    
    console.log('Updating BulkPurchaseItem table...');
    await prisma.$executeRaw`CREATE TABLE BulkPurchaseItem_new (
      id TEXT PRIMARY KEY,
      quantity BIGINT NOT NULL,
      purchasePrice BIGINT NOT NULL,
      bulkPurchaseId TEXT NOT NULL,
      productId TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bulkPurchaseId) REFERENCES BulkPurchase(id),
      FOREIGN KEY (productId) REFERENCES Product(id)
    );`;
    
    await prisma.$executeRaw`INSERT INTO BulkPurchaseItem_new SELECT * FROM BulkPurchaseItem;`;
    await prisma.$executeRaw`DROP TABLE BulkPurchaseItem;`;
    await prisma.$executeRaw`ALTER TABLE BulkPurchaseItem_new RENAME TO BulkPurchaseItem;`;
    
    console.log('✅ BigInt migration completed successfully!');
  } catch (error) {
    console.error('❌ BigInt migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateToBigInt();