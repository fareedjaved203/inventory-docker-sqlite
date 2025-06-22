import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateVendorToContact() {
  try {
    console.log('Starting migration from Vendor to Contact...');
    
    // Execute raw SQL to rename tables and columns
    await prisma.$executeRaw`ALTER TABLE Vendor RENAME TO Contact;`;
    console.log('✅ Renamed Vendor table to Contact');
    
    await prisma.$executeRaw`ALTER TABLE Sale RENAME COLUMN vendorId TO contactId;`;
    console.log('✅ Renamed vendorId to contactId in Sale table');
    
    await prisma.$executeRaw`ALTER TABLE BulkPurchase RENAME COLUMN vendorId TO contactId;`;
    console.log('✅ Renamed vendorId to contactId in BulkPurchase table');
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateVendorToContact();