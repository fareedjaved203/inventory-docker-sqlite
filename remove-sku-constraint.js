import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removeSKUConstraint() {
  try {
    console.log('Removing SKU unique constraint...');
    
    // Create new table without SKU unique constraint
    await prisma.$executeRaw`CREATE TABLE Product_new (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      price BIGINT NOT NULL,
      sku TEXT,
      quantity BIGINT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );`;
    
    // Copy data from old table
    await prisma.$executeRaw`INSERT INTO Product_new SELECT * FROM Product;`;
    
    // Drop old table and rename new one
    await prisma.$executeRaw`DROP TABLE Product;`;
    await prisma.$executeRaw`ALTER TABLE Product_new RENAME TO Product;`;
    
    console.log('✅ SKU unique constraint removed successfully!');
    
  } catch (error) {
    console.error('❌ Error removing SKU constraint:', error);
  } finally {
    await prisma.$disconnect();
  }
}

removeSKUConstraint();