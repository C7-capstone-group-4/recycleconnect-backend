import 'dotenv/config';
import prisma from '../src/config/db.js';


async function cleanDatabase() {
    console.log('Starting database wipe...');

    const tables = [
        'Dispute',
        'TransactionItem',
        'CollectionTransaction',
        'WalletTransaction',
        'Wallet',
        'ScheduledDeclaration',
        'PartnerMaterialPrice',
        'PartnerSchedule',
        'HouseholdProfile',
        'CollectionPartnerProfile',
        'RecyclingOrgProfile',
        'User',
        'MaterialCategory',
    ];

    try {
        for (const table of tables) {
            await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
        }
        console.log('Database wiped clean successfully!');
    } catch (error) {
        console.error('Error clearing database:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

cleanDatabase();
