import { PrismaClient } from '@prisma/client';

async function addRemainingAmount() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Adding remainingAmount column to Contact table...');
    
    // Check if column already exists
    const result = await prisma.$queryRaw`PRAGMA table_info(Contact)`;
    const hasRemainingAmount = result.some(col => col.name === 'remainingAmount');
    
    if (!hasRemainingAmount) {
      // Add the remainingAmount column
      await prisma.$executeRaw`ALTER TABLE Contact ADD COLUMN remainingAmount REAL DEFAULT 0`;
      console.log('✅ Successfully added remainingAmount column to Contact!');
    } else {
      console.log('✅ remainingAmount column already exists in Contact.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  addRemainingAmount().catch(console.error);
}

export { addRemainingAmount };