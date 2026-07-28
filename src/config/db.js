import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';


// Instantiate PostgreSQL driver adapter
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Instantiate PrismaCLient using the driver adapter
const prisma = new PrismaClient({ adapter });

export default prisma;
