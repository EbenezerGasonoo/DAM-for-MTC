import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Cleaning MTC DAM Mock & Demo Data ---');

    // 1. Delete Activity Logs
    const deletedLogs = await prisma.activityLog.deleteMany();
    console.log(`✓ Deleted ${deletedLogs.count} activity log entries`);

    // 2. Delete Comments
    const deletedComments = await prisma.comment.deleteMany();
    console.log(`✓ Deleted ${deletedComments.count} comments`);

    // 3. Delete Asset Versions
    const deletedVersions = await prisma.assetVersion.deleteMany();
    console.log(`✓ Deleted ${deletedVersions.count} asset version records`);

    // 4. Delete Custom Field Values
    const deletedValues = await prisma.customFieldValue.deleteMany();
    console.log(`✓ Deleted ${deletedValues.count} custom field values`);

    // 5. Delete Collection Asset Associations
    const deletedCollectionAssets = await prisma.collectionAsset.deleteMany();
    console.log(`✓ Deleted ${deletedCollectionAssets.count} collection asset associations`);

    // 6. Delete Favorites
    const deletedFavorites = await prisma.assetFavorite.deleteMany();
    console.log(`✓ Deleted ${deletedFavorites.count} favorites`);

    // 7. Delete Assets
    const deletedAssets = await prisma.asset.deleteMany();
    console.log(`✓ Deleted ${deletedAssets.count} assets`);

    // 8. Delete Projects
    const deletedProjects = await prisma.project.deleteMany();
    console.log(`✓ Deleted ${deletedProjects.count} projects`);

    // 9. Delete Demo User Accounts
    const demoEmails = [
        'viewer@mtc.com',
        'editor@mtc.com',
        'senior.editor@mtc.com',
        'audio.editor@mtc.com',
        'content.editor@mtc.com',
        'producer@mtc.com',
        'director@mtc.com',
    ];

    const deletedUsers = await prisma.user.deleteMany({
        where: {
            email: { in: demoEmails },
        },
    });
    console.log(`✓ Deleted ${deletedUsers.count} demo user accounts`);

    // 10. Ensure Primary Administrator Account(s) Exist and are Active
    const adminPasswordHash = await bcrypt.hash('Admin@Mtc2026!', 12);

    const primaryAdmins = [
        {
            email: 'admin@mtc.com',
            name: 'System Administrator',
            role: 'ADMIN',
            password: adminPasswordHash,
        },
        {
            email: 'admin@mtc-network.space',
            name: 'Enterprise Admin',
            role: 'ADMIN',
            password: adminPasswordHash,
        },
    ];

    for (const a of primaryAdmins) {
        const adminUser = await prisma.user.upsert({
            where: { email: a.email },
            update: {
                role: 'ADMIN',
                password: a.password,
            },
            create: a,
        });
        console.log(`✓ Verified Admin Account: ${adminUser.name} (${adminUser.email})`);
    }

    console.log('\n--- Database State After Cleanup ---');
    console.log('Total Assets:', await prisma.asset.count());
    console.log('Total Projects:', await prisma.project.count());
    console.log('Total Activity Logs:', await prisma.activityLog.count());
    const remainingUsers = await prisma.user.findMany({ select: { name: true, email: true, role: true } });
    console.log('Remaining Users:', remainingUsers);
    console.log('--- Cleanup Completed Successfully! ---');
}

main()
    .catch((err) => {
        console.error('Error during cleanup:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
