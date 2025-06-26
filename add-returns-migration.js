import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addReturnsTables() {
  try {
    console.log('Adding returns tables...');
    
    // Create SaleReturn table (if not exists)
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS SaleReturn (
      id TEXT PRIMARY KEY,
      returnNumber TEXT UNIQUE NOT NULL,
      totalAmount BIGINT NOT NULL,
      returnDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      reason TEXT,
      saleId TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (saleId) REFERENCES Sale(id)
    );`;
    
    // Create SaleReturnItem table (if not exists)
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS SaleReturnItem (
      id TEXT PRIMARY KEY,
      quantity BIGINT NOT NULL,
      price BIGINT NOT NULL,
      saleReturnId TEXT NOT NULL,
      productId TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (saleReturnId) REFERENCES SaleReturn(id),
      FOREIGN KEY (productId) REFERENCES Product(id)
    );`;
    
    console.log('✅ Returns tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating returns tables:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addReturnsTables();