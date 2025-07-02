import { PrismaClient } from '@prisma/client';

async function addDamagedQuantity() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Adding damagedQuantity column to Product table...');
    
    // Check if column already exists
    const result = await prisma.$queryRaw`PRAGMA table_info(Product)`;
    const columnExists = result.some(column => column.name === 'damagedQuantity');
    
    if (!columnExists) {
      await prisma.$executeRaw`ALTER TABLE Product ADD COLUMN damagedQuantity INTEGER DEFAULT 0`;
      console.log('✅ damagedQuantity column added successfully');
    } else {
      console.log('✅ damagedQuantity column already exists');
    }
    
  } catch (error) {
    console.error('❌ Error adding damagedQuantity column:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addDamagedQuantity();