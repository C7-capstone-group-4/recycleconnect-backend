const { PrismaClient } = require('@prisma/client');

// Reuse a single PrismaClient instance across the app (recommended by Prisma docs)
// to avoid exhausting DB connections in dev with hot-reloading.
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

module.exports = prisma;
