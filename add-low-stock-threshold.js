import { PrismaClient } from '@prisma/client';

async function addLowStockThreshold() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Adding lowStockThreshold column to Product table...');
    
    // Check if column already exists
    const result = await prisma.$queryRaw`PRAGMA table_info(Product)`;
    const columnExists = result.some(column => column.name === 'lowStockThreshold');
    
    if (!columnExists) {
      await prisma.$executeRaw`ALTER TABLE Product ADD COLUMN lowStockThreshold INTEGER DEFAULT 10`;
      
      // Update existing products to have default value 10
      await prisma.$executeRaw`UPDATE Product SET lowStockThreshold = 10 WHERE lowStockThreshold IS NULL`;
      
      console.log('✅ lowStockThreshold column added and existing products updated with default value 10');
    } else {
      console.log('✅ lowStockThreshold column already exists');
    }
    
  } catch (error) {
    console.error('❌ Error adding lowStockThreshold column:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addLowStockThreshold();