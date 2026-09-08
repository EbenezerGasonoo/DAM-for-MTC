import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Seeding MTC DAM Admin, Editor Accounts & Enterprise Audit Logs ---');

    const adminHash = await bcrypt.hash('Admin@Mtc2026!', 12);
    const editorHash = await bcrypt.hash('Editor@Mtc2026!', 12);
    const producerHash = await bcrypt.hash('Producer@Mtc2026!', 12);

    // 1. Seed / Upsert Admin Accounts
    const adminUsersData = [
        {
            email: 'admin@mtc.com',
            name: 'System Administrator',
            role: 'ADMIN',
            password: adminHash,
        },
        {
            email: 'director@mtc.com',
            name: 'Marcus Vance - Broadcast Director',
            role: 'ADMIN',
            password: adminHash,
        },
        {
            email: 'admin@mtc-network.space',
            name: 'Enterprise Admin',
            role: 'ADMIN',
            password: adminHash,
        },
    ];

    const adminMap = {};
    for (const u of adminUsersData) {
        const user = await prisma.user.upsert({
            where: { email: u.email },
            update: {
                name: u.name,
                role: u.role,
                password: u.password,
            },
            create: u,
        });
        adminMap[u.email] = user;
        console.log(`✓ Admin User: ${user.name} (${user.email}) [ROLE: ${user.role}]`);
    }

    // 2. Seed / Upsert Editor Accounts
    const editorUsersData = [
        {
            email: 'editor@mtc.com',
            name: 'Sarah Jenkins - Lead Video Editor',
            role: 'EDITOR',
            password: editorHash,
        },
        {
            email: 'senior.editor@mtc.com',
            name: 'David Chen - Senior NLE Colorist',
            role: 'EDITOR',
            password: editorHash,
        },
        {
            email: 'audio.editor@mtc.com',
            name: 'Elena Rostova - Broadcast Audio Engineer',
            role: 'EDITOR',
            password: editorHash,
        },
        {
            email: 'content.editor@mtc.com',
            name: 'Kofi Mensah - Digital & Social Media Editor',
            role: 'EDITOR',
            password: editorHash,
        },
    ];

    const editorMap = {};
    for (const u of editorUsersData) {
        const user = await prisma.user.upsert({
            where: { email: u.email },
            update: {
                name: u.name,
                role: u.role,
                password: u.password,
            },
            create: u,
        });
        editorMap[u.email] = user;
        console.log(`✓ Editor User: ${user.name} (${user.email}) [ROLE: ${user.role}]`);
    }

    // 3. Seed / Upsert Producer Account
    const producer = await prisma.user.upsert({
        where: { email: 'producer@mtc.com' },
        update: {
            name: 'Michael Adebayo - Creative Producer',
            role: 'PRODUCER',
            password: producerHash,
        },
        create: {
            email: 'producer@mtc.com',
            name: 'Michael Adebayo - Creative Producer',
            role: 'PRODUCER',
            password: producerHash,
        },
    });
    console.log(`✓ Producer User: ${producer.name} (${producer.email}) [ROLE: ${producer.role}]`);

    // 4. Ensure Broadcast Projects exist for context
    const mainAdmin = adminMap['admin@mtc.com'];
    const leadEditor = editorMap['editor@mtc.com'];
    const colorist = editorMap['senior.editor@mtc.com'];
    const soundEngineer = editorMap['audio.editor@mtc.com'];

    const projectsData = [
        {
            name: 'Sunday Service Master Broadcast',
            description: 'Weekly multi-cam 4K worship recordings, sermon cutdowns, and broadcast audio stems.',
            status: 'APPROVED',
            ownerId: producer.id,
        },
        {
            name: 'Easter Campaign 2026',
            description: 'Integrated multi-platform campaign across television, digital billboards, and social media.',
            status: 'ACTIVE',
            ownerId: producer.id,
        },
        {
            name: 'Youth Retreat Promo: Unshakable',
            description: 'High-energy video reels, motion graphics, and print flyers for the 2026 Youth Camp.',
            status: 'IN_PROGRESS',
            ownerId: leadEditor.id,
        },
        {
            name: 'Faith & Life Broadcast Series',
            description: 'Studio broadcast quality master recordings, show notes, and audiogram snippets.',
            status: 'ACTIVE',
            ownerId: mainAdmin.id,
        },
    ];

    const projectMap = {};
    for (const p of projectsData) {
        let proj = await prisma.project.findFirst({ where: { name: p.name } });
        if (!proj) {
            proj = await prisma.project.create({ data: p });
        }
        projectMap[p.name] = proj;
    }
    console.log(`✓ Ensured ${Object.keys(projectMap).length} broadcast projects`);

    // 5. Ensure Core Assets exist
    const assetsData = [
        {
            title: 'Sunday_Service_Main_Camera_A_4K.mp4',
            description: 'Primary pulpit 4K ProRes master camera angle recorded on Sunday 9AM service.',
            type: 'video',
            mimeType: 'video/mp4',
            size: 14260633600, // 13.28 GB
            status: 'APPROVED',
            creatorId: leadEditor.id,
            projectName: 'Sunday Service Master Broadcast',
            metadata: JSON.stringify({
                resolution: '3840x2160',
                fps: 59.94,
                codec: 'Apple ProRes 422 HQ',
                colorSpace: 'Rec.709',
                durationSeconds: 5280,
            }),
            tags: ['Worship', '4K', 'Master', 'Sunday', 'Camera A'],
        },
        {
            title: 'Sunday_Worship_Multitrack_Stem_Pack.zip',
            description: '16-channel isolated WAV multitracks (Drums, Bass, Guitars, Synth, Lead Vocals, Choir).',
            type: 'audio',
            mimeType: 'application/zip',
            size: 1887436800, // 1.76 GB
            status: 'APPROVED',
            creatorId: soundEngineer.id,
            projectName: 'Sunday Service Master Broadcast',
            metadata: JSON.stringify({
                tracksCount: '16 Stems',
                sampleRate: '48.0 kHz 24-bit Broadcast Wave',
                targetPlatforms: ['Pro Tools', 'Logic Pro', 'Ableton Live'],
            }),
            tags: ['Worship', 'Multitrack', 'Stems', 'Audio', 'Mixing'],
        },
        {
            title: 'Easter_Campaign_Master_Cutdown_1080p.mp4',
            description: 'Final 60-second broadcast promo cutdown with color grade and audio mix.',
            type: 'video',
            mimeType: 'video/mp4',
            size: 852400000, // 812 MB
            status: 'REVIEW',
            creatorId: colorist.id,
            projectName: 'Easter Campaign 2026',
            metadata: JSON.stringify({
                resolution: '1920x1080',
                fps: 29.97,
                codec: 'H.264 High Profile',
                durationSeconds: 60,
            }),
            tags: ['Easter', 'Commercial', 'Cutdown', 'Graded', '1080p'],
        },
        {
            title: 'MTC_Official_Brand_Guidelines_2026.pdf',
            description: 'Official visual identity manual: Pantone specs, typography rules, and safe areas.',
            type: 'document',
            mimeType: 'application/pdf',
            size: 48234496, // 46 MB
            status: 'PUBLISHED',
            creatorId: mainAdmin.id,
            projectName: 'Faith & Life Broadcast Series',
            metadata: JSON.stringify({
                pages: 48,
                version: '2026.1',
                restricted: false,
            }),
            tags: ['Brand', 'Guidelines', 'Identity', 'Vector', 'PDF'],
        },
    ];

    const assetList = [];
    for (const ad of assetsData) {
        let asset = await prisma.asset.findFirst({ where: { title: ad.title } });
        const proj = projectMap[ad.projectName];
        if (!asset) {
            asset = await prisma.asset.create({
                data: {
                    title: ad.title,
                    description: ad.description,
                    type: ad.type,
                    mimeType: ad.mimeType,
                    size: ad.size,
                    status: ad.status,
                    creatorId: ad.creatorId,
                    projectId: proj ? proj.id : null,
                    metadata: ad.metadata,
                    tags: {
                        connectOrCreate: ad.tags.map(t => ({
                            where: { name: t },
                            create: { name: t },
                        })),
                    },
                    versions: {
                        create: [
                            {
                                versionNum: 1,
                                nextcloudUri: `/mtc-dam-uploads/${ad.title}`,
                                proxyUri: `/mtc-dam-uploads/${ad.title}`,
                            },
                        ],
                    },
                },
            });
        }
        assetList.push(asset);
    }
    console.log(`✓ Ensured ${assetList.length} media assets`);

    // 6. Generate Comprehensive Activity Logs for Admins and Editors
    const now = Date.now();
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    const sampleLogs = [
        // Admin Activities
        {
            userId: mainAdmin.id,
            action: 'LOGIN',
            entityType: 'USER',
            entityId: mainAdmin.id,
            details: JSON.stringify({ method: 'Direct OAuth Session', email: mainAdmin.email }),
            ipAddress: '192.168.1.10',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
            createdAt: new Date(now - 14 * day),
        },
        {
            userId: mainAdmin.id,
            action: 'CREATE',
            entityType: 'PROJECT',
            entityId: projectMap['Sunday Service Master Broadcast']?.id || 'prj-1',
            details: JSON.stringify({ projectName: 'Sunday Service Master Broadcast', priority: 'HIGH' }),
            ipAddress: '192.168.1.10',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
            createdAt: new Date(now - 12 * day),
        },
        {
            userId: adminMap['director@mtc.com'].id,
            action: 'LOGIN',
            entityType: 'USER',
            entityId: adminMap['director@mtc.com'].id,
            details: JSON.stringify({ method: 'Director Station Login', email: 'director@mtc.com' }),
            ipAddress: '192.168.1.15',
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) Safari/605.1.15',
            createdAt: new Date(now - 10 * day),
        },
        {
            userId: adminMap['director@mtc.com'].id,
            action: 'UPDATE',
            entityType: 'SYSTEM_SETTING',
            entityId: 'watermark-security-profile',
            details: JSON.stringify({ setting: 'MTC DRM Confidential Burn-in', roleLevels: ['VIEWER', 'EDITOR'] }),
            ipAddress: '192.168.1.15',
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) Safari/605.1.15',
            createdAt: new Date(now - 8 * day),
        },
        {
            userId: mainAdmin.id,
            action: 'APPROVE',
            entityType: 'ASSET',
            entityId: assetList[0]?.id || 'ast-1',
            details: JSON.stringify({ assetTitle: assetList[0]?.title, note: 'Passed technical broadcast compliance QC' }),
            ipAddress: '192.168.1.10',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
            createdAt: new Date(now - 2 * day),
        },

        // Editor Activities - Ingest, Updates, Edits, Views, Comments
        {
            userId: leadEditor.id,
            action: 'LOGIN',
            entityType: 'USER',
            entityId: leadEditor.id,
            details: JSON.stringify({ station: 'NLE Edit Suite 1', app: 'Premiere Pro Extension' }),
            ipAddress: '192.168.1.42',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NLE-Connector/2.4',
            createdAt: new Date(now - 9 * day),
        },
        {
            userId: leadEditor.id,
            action: 'UPLOAD',
            entityType: 'ASSET',
            entityId: assetList[0]?.id || 'ast-1',
            details: JSON.stringify({
                fileName: assetList[0]?.title,
                size: '13.28 GB',
                codec: 'ProRes 422 HQ',
                format: '4K UHD',
            }),
            ipAddress: '192.168.1.42',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
            createdAt: new Date(now - 7 * day),
        },
        {
            userId: soundEngineer.id,
            action: 'LOGIN',
            entityType: 'USER',
            entityId: soundEngineer.id,
            details: JSON.stringify({ station: 'Audio Master Suite', email: soundEngineer.email }),
            ipAddress: '192.168.1.44',
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) ProTools-Bridge/1.0',
            createdAt: new Date(now - 6 * day),
        },
        {
            userId: soundEngineer.id,
            action: 'UPLOAD',
            entityType: 'ASSET',
            entityId: assetList[1]?.id || 'ast-2',
            details: JSON.stringify({
                fileName: assetList[1]?.title,
                channels: 16,
                sampleRate: '48kHz 24-bit',
                type: 'Multitrack Stems',
            }),
            ipAddress: '192.168.1.44',
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) ProTools-Bridge/1.0',
            createdAt: new Date(now - 5 * day),
        },
        {
            userId: colorist.id,
            action: 'LOGIN',
            entityType: 'USER',
            entityId: colorist.id,
            details: JSON.stringify({ station: 'DaVinci Resolve Grading Bay', email: colorist.email }),
            ipAddress: '192.168.1.48',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Resolve-Panel/19.0',
            createdAt: new Date(now - 4 * day),
        },
        {
            userId: colorist.id,
            action: 'VIEW',
            entityType: 'ASSET',
            entityId: assetList[0]?.id || 'ast-1',
            details: JSON.stringify({ method: '1080p Proxy Stream', bitrate: '12 Mbps' }),
            ipAddress: '192.168.1.48',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
            createdAt: new Date(now - 3 * day),
        },
        {
            userId: colorist.id,
            action: 'DOWNLOAD',
            entityType: 'ASSET',
            entityId: assetList[0]?.id || 'ast-1',
            details: JSON.stringify({ rendition: 'ProRes 422 HQ Master', purpose: 'Color Grade Conform' }),
            ipAddress: '192.168.1.48',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
            createdAt: new Date(now - 2 * day - 12 * hour),
        },
        {
            userId: colorist.id,
            action: 'UPLOAD',
            entityType: 'ASSET',
            entityId: assetList[2]?.id || 'ast-3',
            details: JSON.stringify({
                fileName: assetList[2]?.title,
                revision: 'Rec.709 Graded Cutdown',
                length: '00:01:00:00',
            }),
            ipAddress: '192.168.1.48',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
            createdAt: new Date(now - 1 * day - 4 * hour),
        },
        {
            userId: leadEditor.id,
            action: 'COMMENT',
            entityType: 'COMMENT',
            entityId: assetList[2]?.id || 'ast-3',
            details: JSON.stringify({
                frameTimestamp: '00:00:42:15',
                note: 'Black level looks clean. Bump the lower-third graphics intro by 2 frames.',
            }),
            ipAddress: '192.168.1.42',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
            createdAt: new Date(now - 18 * hour),
        },
        {
            userId: editorMap['content.editor@mtc.com'].id,
            action: 'LOGIN',
            entityType: 'USER',
            entityId: editorMap['content.editor@mtc.com'].id,
            details: JSON.stringify({ station: 'Digital Distribution Desk', email: 'content.editor@mtc.com' }),
            ipAddress: '192.168.1.52',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
            createdAt: new Date(now - 8 * hour),
        },
        {
            userId: editorMap['content.editor@mtc.com'].id,
            action: 'UPDATE',
            entityType: 'ASSET',
            entityId: assetList[2]?.id || 'ast-3',
            details: JSON.stringify({
                tagsAdded: ['Reels', 'TikTok', 'Instagram', 'Promo'],
                status: 'REVIEW',
            }),
            ipAddress: '192.168.1.52',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
            createdAt: new Date(now - 4 * hour),
        },
        {
            userId: producer.id,
            action: 'APPROVE',
            entityType: 'ASSET',
            entityId: assetList[1]?.id || 'ast-2',
            details: JSON.stringify({ note: 'Multitrack approved for broadcast mixing and post-mix archival' }),
            ipAddress: '192.168.1.20',
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) Safari/605.1.15',
            createdAt: new Date(now - 2 * hour),
        },
        {
            userId: mainAdmin.id,
            action: 'LOGIN',
            entityType: 'USER',
            entityId: mainAdmin.id,
            details: JSON.stringify({ method: 'Web Console Login', email: mainAdmin.email }),
            ipAddress: '192.168.1.10',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
            createdAt: new Date(now - 25 * minute),
        },
    ];

    const existingLogCount = await prisma.activityLog.count();
    if (existingLogCount === 0) {
        let seededLogCount = 0;
        for (const log of sampleLogs) {
            await prisma.activityLog.create({
                data: log,
            });
            seededLogCount++;
        }
        console.log(`✓ Seeded ${seededLogCount} comprehensive enterprise Activity Logs`);
    } else {
        console.log(`✓ Database already contains ${existingLogCount} Activity Logs; preserving existing audit history`);
    }
    console.log('--- Seeding Completed Successfully! ---');
}

main()
    .catch((err) => {
        console.error('Error during seeding:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
