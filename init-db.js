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
    let isNewDatabase = false;
    try {
      await prisma.product.count();
      console.log('Database already exists.');
    } catch (error) {
      console.log('Database not initialized. Creating schema...');
      isNewDatabase = true;
    }
    
    // If database exists, check if we need to migrate from Vendor to Contact
    if (!isNewDatabase) {
      try {
        // Try to access Contact table
        await prisma.contact.count();
        console.log('Database already migrated to Contact schema.');
        return;
      } catch (error) {
        // Contact table doesn't exist, need to migrate
        console.log('Migrating from Vendor to Contact schema...');
        try {
          await prisma.$executeRaw`ALTER TABLE Vendor RENAME TO Contact;`;
          await prisma.$executeRaw`ALTER TABLE Sale RENAME COLUMN vendorId TO contactId;`;
          await prisma.$executeRaw`ALTER TABLE BulkPurchase RENAME COLUMN vendorId TO contactId;`;
          console.log('Migration completed successfully.');
          return;
        } catch (migrationError) {
          console.error('Migration failed:', migrationError);
          // Continue with schema creation if migration fails
        }
      }
    }
    
    if (!isNewDatabase) return;
    
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