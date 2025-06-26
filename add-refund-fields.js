import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addRefundFields() {
  try {
    console.log('Adding refund tracking fields to SaleReturn table...');
    
    // Add refund tracking columns
    await prisma.$executeRaw`ALTER TABLE SaleReturn ADD COLUMN refundAmount BIGINT DEFAULT 0;`;
    await prisma.$executeRaw`ALTER TABLE SaleReturn ADD COLUMN refundPaid BOOLEAN DEFAULT 0;`;
    await prisma.$executeRaw`ALTER TABLE SaleReturn ADD COLUMN refundDate DATETIME;`;
    
    console.log('✅ Refund tracking fields added successfully!');
    
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('✅ Refund tracking fields already exist, skipping...');
    } else {
      console.error('❌ Error adding refund tracking fields:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

addRefundFields();