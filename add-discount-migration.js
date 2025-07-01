import { PrismaClient } from '@prisma/client';

async function addDiscountField() {
  const prisma = new PrismaClient();
  
  try {
    // Check if discount column already exists
    const result = await prisma.$queryRaw`PRAGMA table_info(Sale)`;
    const hasDiscount = result.some(column => column.name === 'discount');
    
    if (!hasDiscount) {
      console.log('Adding discount column to Sale table...');
      await prisma.$executeRaw`ALTER TABLE "Sale" ADD COLUMN "discount" DECIMAL(10,2) NOT NULL DEFAULT 0.00`;
      console.log('Discount column added successfully');
    } else {
      console.log('Discount column already exists');
    }
  } catch (error) {
    console.error('Error adding discount field:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addDiscountField();