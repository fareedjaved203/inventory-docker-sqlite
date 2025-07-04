import { PrismaClient } from '@prisma/client';

async function addPurchasePrice() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Adding purchasePrice column to Product table...');
    
    // Check if column already exists
    const result = await prisma.$queryRaw`PRAGMA table_info(Product)`;
    const columnExists = result.some(column => column.name === 'purchasePrice');
    
    if (!columnExists) {
      await prisma.$executeRaw`ALTER TABLE Product ADD COLUMN purchasePrice INTEGER DEFAULT 0`;
      console.log('✅ purchasePrice column added successfully');
    } else {
      console.log('✅ purchasePrice column already exists');
    }
    
  } catch (error) {
    console.error('❌ Error adding purchasePrice column:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addPurchasePrice();