import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${path.join(__dirname, 'prisma', 'data', 'inventory.db')}`
    }
  }
});

async function addDescriptionToSales() {
  try {
    console.log('Adding description column to Sale table...');
    
    // Add the description column to the Sale table
    await prisma.$executeRaw`ALTER TABLE Sale ADD COLUMN description TEXT`;
    
    console.log('Description column added successfully to Sale table!');
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('Description column already exists in Sale table.');
    } else {
      console.error('Error adding description column:', error);
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

addDescriptionToSales()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });