import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('Initializing database...');
  
  // Create a new Prisma client
  const prisma = new PrismaClient();
  
  try {
    // Check if database is already initialized by trying to count products
    try {
      await prisma.product.count();
      console.log('Database already initialized.');
      return;
    } catch (error) {
      console.log('Database not initialized. Creating schema...');
    }
    
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, 'prisma', 'migrations', '20250620_sqlite_migration', 'migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        await prisma.$executeRawUnsafe(`${statement};`);
      }
    }
    
    console.log('Database schema created successfully.');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();