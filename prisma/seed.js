/* Database seeder */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';


// Instantiate PostgreSQL driver adapter
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Seeding material categories...');

    const categories = [
        { name: 'PET PLastics', unit: 'kg' },
        { name: 'Aluminium Cans', unit: 'kg' },
        { name: 'Glass bottles', unit: 'kg' },
        { name: 'Cartons & Paper', unit: 'kg' },
        { name: 'Scrap Metal', unit: 'kg' }
    ];

    for (const cat of categories) {
        await prisma.materialCategory.upsert({
            where: { name: cat.name },
            update: {},
            create: cat,
        });
    }

    console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
