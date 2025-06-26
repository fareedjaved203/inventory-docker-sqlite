import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addOriginalAmountField() {
  try {
    console.log('Adding originalTotalAmount field to Sale table...');
    
    // Add originalTotalAmount column and populate with current totalAmount
    await prisma.$executeRaw`ALTER TABLE Sale ADD COLUMN originalTotalAmount BIGINT;`;
    
    // Update existing records to set originalTotalAmount = totalAmount
    await prisma.$executeRaw`UPDATE Sale SET originalTotalAmount = totalAmount WHERE originalTotalAmount IS NULL;`;
    
    console.log('✅ Original amount field added successfully!');
    
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('✅ Original amount field already exists, skipping...');
    } else {
      console.error('❌ Error adding original amount field:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

addOriginalAmountField();