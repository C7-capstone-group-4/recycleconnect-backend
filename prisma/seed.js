/* Database seeder */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from '../src/config/db.js';


async function main() {
    console.log('Seeding database...');

    // Seed material categories
    console.log('1/5: Seeding material categories...');
    const categoriesData = [
        { name: 'PET Plastics', unit: 'kg' },
        { name: 'Aluminium Cans', unit: 'kg' },
        { name: 'Glass Bottles', unit: 'kg' },
        { name: 'Cartons & Paper', unit: 'kg' },
        { name: 'Scrap Metal', unit: 'kg' }
    ];

    for (const cat of categoriesData) {
        await prisma.materialCategory.upsert({
            where: { name: cat.name },
            update: {},
            create: cat,
        });
    }

    // Fetch created categories to guarantee valid IDs
    const petCategory = await prisma.materialCategory.findUnique({ where: { name: 'PET Plastics' } });
    const cansCategory = await prisma.materialCategory.findUnique({ where: { name: 'Aluminium Cans' } });

    // Pre-hash test credentials
    const defaultPinHash = await bcrypt.hash('1234', 10);
    const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

    // Seed Admin account
    console.log('2/5: Seeding Admin account...');
    await prisma.user.upsert({
        where: { email: 'admin@recycleconnect.ng' },
        update: {},
        create: {
            email: 'admin@recycleconnect.ng',
            password_hash: defaultPasswordHash,
            phone: '+2348000000000',
            role: 'ADMIN',
            status: 'APPROVED',
        },
    });

    // Seed verified Collection Partner (Green Cycle Hub)
    console.log('3/5: Seeding Collection Partner...');
    const partnerUser = await prisma.user.upsert({
        where: { phone: '+2348087654321' },
        update: {},
        create: {
            phone: '+2348087654321',
            pin_hash: defaultPinHash,
            role: 'COLLECTION_PARTNER',
            status: 'APPROVED',
            partnerProfile: {
                create: {
                    full_name: "John Chukwu",
                    business_name: 'Green Cycle Hub',
                    partner_type: 'EXISTING_OPERATOR',
                    id_type: 'NIN',
                    id_number: '12345678901',
                    id_photo_url: 'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg',
                    vehicle_type: 'TRICYCLE',
                    storage_capacity: '5000_KG',
                    address: 'Plot 5 Industrial Estate',
                    landmark: 'Opposite Coca-Cola Bottling Plant',
                    latitude: 6.6050,
                    longitude: 3.3580,
                    dropoff_hours: 'Mon-Sat 8AM - 5PM',
                    service_area: 'Ikeja Zone A',
                    badge_title: 'Verified Community Partner',
                },
            },
            wallet: {
                create: {
                    balance: 50000.0,  // Pre-funded balance for household payouts
                },
            },
        },
        include: { partnerProfile: true },
    });

    // Seed Partner Buying Prices & Collection Schedule
    if (partnerUser.partnerProfile && petCategory && cansCategory) {
        const partnerId = partnerUser.partnerProfile.id;

        // PET PLastic price
        await prisma.partnerMaterialPrice.upsert({
            where: { id: `price_pet_${partnerId}` },
            update: { price_per_kg: 120.0 },
            create: {
                id: `price_pet_${partnerId}`,
                partner_id: partnerId,
                category_id: petCategory.id,
                price_per_kg: 120.0,
            },
        });

        // Aluminum Cans price
        await prisma.partnerMaterialPrice.upsert({
            where: { id: `price_cans_${partnerId}` },
            update: { price_per_kg: 450.0 },
            create: {
                id: `price_cans_${partnerId}`,
                partner_id: partnerId,
                category_id: cansCategory.id,
                price_per_kg: 450.0,
            },
        });

        // Schedule
        await prisma.partnerSchedule.upsert({
            where: { id: `sched_${partnerId}` },
            update: {},
            create: {
                id: `sched_${partnerId}`,
                partner_id: partnerId,
                service_area: 'Ikeja Zone A',
                collection_day: 'EVERY_TUESDAY',
                time_window: '8:00 AM - 12:00 PM',
            },
        });
    }

    // Seed Household User (Blessing)
    console.log('4/5: Seeding HOusehold user...');
    await prisma.user.upsert({
        where: { phone: '+2348012345678' },
        update: {},
        create: {
            phone: '+2348012345678',
            pin_hash: defaultPinHash,
            role: 'HOUSEHOLD',
            status: 'APPROVED',
            householdProfile: {
                create: {
                    first_name: 'Blessing',
                    reference_code: 'HC-8392',
                    state: 'Lagos',
                    area: 'Ikeja',
                    landmark: 'Near Ikeja City Hall',
                    service_zone: 'Ikeja Zone A',
                    loyalty_points: 150,
                    tier_status: 'SILVER',
                },
            },
            wallet: {
                create: {
                    balance: 2500.0,
                },
            },
        },
    });

    // Seed Recycling Organization
    console.log('5/5: Seeding Recycling Organization...');
    await prisma.user.upsert({
        where: { email: 'procurement@lagosrecycling.com' },
        update: {},
        create: {
            email: 'procurement@lagosrecycling.com',
            password_hash: defaultPasswordHash,
            phone: '+2348099988776',
            role: 'RECYCLING_ORG',
            status: 'APPROVED',
            recyclingOrgProfile: {
                create: {
                    org_name: 'Lagos Plastic Processing Ltd',
                    contact_name: 'Engineer David',
                    address: '10 Express Way, Ikeja',
                    materials_of_interest: ['PET Plastics', 'Aluminum Cans'],
                },
            },
        },
    });

    console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
