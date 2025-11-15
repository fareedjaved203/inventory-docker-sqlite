import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addCounterTable() {
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS Counter (
        id TEXT PRIMARY KEY,
        value INTEGER NOT NULL
      )
    `;
    console.log('Counter table created successfully');
  } catch (error) {
    console.error('Error creating Counter table:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addCounterTable();
