import { PrismaClient } from '@prisma/client';

async function addPurchasePriceToSaleItem() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Adding purchasePrice column to SaleItem table...');
    
    // Check if column already exists
    const result = await prisma.$queryRaw`PRAGMA table_info(SaleItem)`;
    const columnExists = result.some(column => column.name === 'purchasePrice');
    
    if (!columnExists) {
      await prisma.$executeRaw`ALTER TABLE SaleItem ADD COLUMN purchasePrice INTEGER DEFAULT 0`;
      console.log('✅ purchasePrice column added to SaleItem table successfully');
    } else {
      console.log('✅ purchasePrice column already exists in SaleItem table');
    }
    
  } catch (error) {
    console.error('❌ Error adding purchasePrice column to SaleItem:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addPurchasePriceToSaleItem();