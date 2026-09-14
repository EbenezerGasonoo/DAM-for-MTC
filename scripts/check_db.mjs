import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const settings = await prisma.systemSetting.findMany();
    console.log('--- SYSTEM SETTINGS IN LOCAL DB ---');
    console.log('Count:', settings.length);
    for (const s of settings) {
        console.log(s.key, '=>', s.key === 'NEXTCLOUD_PASSWORD' ? '***' : s.value);
    }

    const assetCount = await prisma.asset.count();
    console.log('Total Assets in DB:', assetCount);

    const userCount = await prisma.user.count();
    console.log('Total Users in DB:', userCount);

    const assets = await prisma.asset.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, type: true, size: true, createdAt: true, versions: true }
    });
    console.log('Recent Assets in DB with versions:', JSON.stringify(assets, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
