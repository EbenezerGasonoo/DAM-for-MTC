import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Enterprise MTC DAM database...');

    // 1. Ensure Admin User exists
    let admin = await prisma.user.findUnique({
        where: { email: 'admin@mtc.com' },
    });

    if (!admin) {
        admin = await prisma.user.create({
            data: {
                email: 'admin@mtc.com',
                name: 'System Admin',
                password: '$2a$10$wT5gQ9Xb3r8.KqGj9z5vK.xJm3WkR8vP6yKqVl8jLm9N.OpQrStUu', // admin123
                role: 'ADMIN',
            },
        });
    }

    // Ensure secondary users for enterprise collaboration
    const producer = await prisma.user.upsert({
        where: { email: 'producer@mtc.com' },
        update: {},
        create: {
            email: 'producer@mtc.com',
            name: 'Sarah Kim',
            password: '$2a$10$wT5gQ9Xb3r8.KqGj9z5vK.xJm3WkR8vP6yKqVl8jLm9N.OpQrStUu',
            role: 'PRODUCER',
        },
    });

    const editor = await prisma.user.upsert({
        where: { email: 'editor@mtc.com' },
        update: {},
        create: {
            email: 'editor@mtc.com',
            name: 'Mike Johnson',
            password: '$2a$10$wT5gQ9Xb3r8.KqGj9z5vK.xJm3WkR8vP6yKqVl8jLm9N.OpQrStUu',
            role: 'EDITOR',
        },
    });

    // 2. Create Enterprise Projects
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
            status: 'EDITING',
            ownerId: producer.id,
        },
        {
            name: 'Youth Retreat Promo: Unshakable',
            description: 'High-energy video reels, motion graphics, and print flyers for the 2026 Youth Camp.',
            status: 'REVIEW',
            ownerId: editor.id,
        },
        {
            name: 'Faith & Life Podcast Series',
            description: 'Studio broadcast quality master WAV recordings, show notes, and audiogram snippets.',
            status: 'PUBLISHED',
            ownerId: admin.id,
        },
    ];

    const projectMap = {};
    for (const p of projectsData) {
        let existing = await prisma.project.findFirst({ where: { name: p.name } });
        if (!existing) {
            existing = await prisma.project.create({ data: p });
        }
        projectMap[p.name] = existing;
    }

    // 3. Create Enterprise Watermark Profile
    const watermarkProfile = await prisma.watermarkProfile.upsert({
        where: { id: 'mtc-security-watermark-1' },
        update: {},
        create: {
            id: 'mtc-security-watermark-1',
            name: 'MTC Internal Confidential Burn-in',
            textTemplate: 'CONFIDENTIAL — MTC BROADCAST PIPELINE — {USER}',
            roleLevels: JSON.stringify(['VIEWER', 'EDITOR']),
            isActive: true,
        },
    });

    // 4. Create Rich Enterprise Media Assets
    const enterpriseAssets = [
        {
            title: 'Sunday_Service_Main_Camera_A_4K.mp4',
            description: 'Master 4K multi-cam line cut of the Sunday Morning Worship & Ministry Service.',
            type: 'video',
            mimeType: 'video/mp4',
            size: 4823449600, // 4.8 GB
            status: 'APPROVED',
            creatorId: producer.id,
            projectName: 'Sunday Service Master Broadcast',
            metadata: JSON.stringify({
                resolution: '3840x2160 (4K UHD)',
                aspectRatio: '16:9',
                framerate: '59.94 fps',
                codec: 'Apple ProRes 422 HQ / H.264',
                colorSpace: 'Rec.709 Wide Gamut',
                audioChannels: 'Stereo 48kHz 24-bit PCM',
                duration: '01:14:22',
                checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                targetPlatforms: ['YouTube 4K', 'Local Broadcast Network', 'Archive Storage'],
            }),
            tags: ['SundayService', 'Broadcast', '4K', 'MainSanctuary', 'Worship'],
            license: {
                licenseName: 'MTC Global Broadcast & VOD Rights',
                licenseType: 'Perpetual Ministry License',
                grantedTo: 'Mountain Top Communications',
                expiresAt: new Date('2028-12-31'),
                notes: 'Full world rights for non-commercial ministry broadcasting and streaming.',
            },
            versions: [
                { versionNum: 1, nextcloudUri: '/storage/Sunday_Service_v1.mp4', proxyUri: '/storage/Sunday_Service_v1.mp4' },
                { versionNum: 2, nextcloudUri: '/storage/Sunday_Service_Main_Camera_A_4K.mp4', proxyUri: '/storage/Sunday_Service_Main_Camera_A_4K.mp4' },
            ],
            comments: [
                { content: 'Color grading on pastor key light looks crisp and balanced.', authorId: producer.id, timestampFrame: 450.2 },
                { content: 'Audio normalized to -14 LUFS standard for streaming.', authorId: editor.id, timestampFrame: 1240.5 },
            ],
        },
        {
            title: 'Easter_2026_Main_Trailer_Cinematic.mp4',
            description: 'High-production 2-minute cinematic teaser campaign for Easter Sunday 2026 services.',
            type: 'video',
            mimeType: 'video/mp4',
            size: 891289600, // 850 MB
            status: 'REVIEW',
            creatorId: editor.id,
            projectName: 'Easter Campaign 2026',
            metadata: JSON.stringify({
                resolution: '1920x1080 (FHD)',
                aspectRatio: '16:9 Cinematic',
                framerate: '23.976 fps',
                codec: 'H.264 High Profile 5.1',
                colorSpace: 'Rec.709 (Film Emulation LUT)',
                audioChannels: '5.1 Surround + 2.0 Stereo Master',
                duration: '00:02:15',
                checksum: '3f48a17b07dfb9d479bb72d2426027a00f2495d4323ab26f98fb77d33d93541a',
                targetPlatforms: ['Instagram', 'Meta Ads', 'Church Website'],
            }),
            tags: ['Easter2026', 'Trailer', 'Cinematic', 'Promo', 'Campaign'],
            license: {
                licenseName: 'Sync License — PremiumBeat Soundtrack',
                licenseType: 'Commercial Sync Web/Broadcast',
                grantedTo: 'Mountain Top Communications',
                expiresAt: new Date('2027-04-15'),
                notes: 'License covers worldwide streaming and web placement until April 2027.',
            },
            versions: [
                { versionNum: 1, nextcloudUri: '/storage/Easter_2026_Main_Trailer_Cinematic.mp4', proxyUri: '/storage/Easter_2026_Main_Trailer_Cinematic.mp4' },
            ],
            comments: [
                { content: 'Check end screen typography: ensure Sunday service times are prominent.', authorId: producer.id, timestampFrame: 122.0 },
            ],
        },
        {
            title: 'Youth_Retreat_2026_Keynote_Banner.psd',
            description: 'Master multi-layered print banner canvas for 2026 Youth Camp outdoor stage backdrop.',
            type: 'image',
            mimeType: 'image/vnd.adobe.photoshop',
            size: 188743680, // 180 MB
            status: 'REVIEW',
            creatorId: editor.id,
            projectName: 'Youth Retreat Promo: Unshakable',
            metadata: JSON.stringify({
                resolution: '7680x4320 (8K Print Canvas)',
                dimensions: '7680 x 4320 px @ 300 DPI',
                colorSpace: 'CMYK (U.S. Web Coated SWOP v2)',
                layers: '42 layered groups with smart objects',
                checksum: '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
                targetPlatforms: ['Vinyl Stage Print', 'Retractable Banners'],
            }),
            tags: ['Youth', 'Retreat', 'Banner', 'Photoshop', 'PrintReady', 'CMYK'],
            license: {
                licenseName: 'Stock Photo Rights — Adobe Stock Pro',
                licenseType: 'Enhanced Print License',
                grantedTo: 'Mountain Top Communications',
                expiresAt: new Date('2026-10-01'),
                notes: 'Print run under 500,000 copies.',
            },
            versions: [
                { versionNum: 1, nextcloudUri: '/storage/Youth_Retreat_2026_Keynote_Banner.psd', proxyUri: '/storage/Youth_Retreat_2026_Keynote_Banner.psd' },
            ],
            comments: [
                { content: 'Verify bleed margins with printing vendor before sending to press.', authorId: admin.id },
            ],
        },
        {
            title: 'Faith_Life_Podcast_Episode_42_Master.wav',
            description: 'Uncompressed broadcast audio master of Episode 42: "Leading with Servant Grace".',
            type: 'audio',
            mimeType: 'audio/wav',
            size: 629145600, // 600 MB
            status: 'PUBLISHED',
            creatorId: admin.id,
            projectName: 'Faith & Life Podcast Series',
            metadata: JSON.stringify({
                sampleRate: '96.0 kHz',
                bitDepth: '24-bit Uncompressed PCM',
                channels: 'Stereo (2.0)',
                loudnessLUFS: '-14.1 LUFS (Apple/Spotify Podcast Specs)',
                duration: '00:48:15',
                checksum: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
                targetPlatforms: ['Apple Podcasts', 'Spotify', 'YouTube Music'],
            }),
            tags: ['Podcast', 'Audio', 'MasterMix', 'FaithLife', 'Grace', 'Interview'],
            license: {
                licenseName: 'Creative Commons CC BY-NC 4.0',
                licenseType: 'Open Ministry Educational',
                grantedTo: 'Public',
                expiresAt: null,
                notes: 'Free distribution with attribution.',
            },
            versions: [
                { versionNum: 1, nextcloudUri: '/storage/Faith_Life_Podcast_Episode_42_Master.wav', proxyUri: '/storage/Faith_Life_Podcast_Episode_42_Master.wav' },
            ],
            comments: [
                { content: 'Great clarity in guest audio. Intro sting crossfaded smoothly.', authorId: producer.id },
            ],
        },
        {
            title: 'Mountain_Top_Brand_Guidelines_Master.pdf',
            description: 'Comprehensive brand standards, font rules, logo safe zones, and ministry voice identity manual.',
            type: 'document',
            mimeType: 'application/pdf',
            size: 25165824, // 24 MB
            status: 'PUBLISHED',
            creatorId: admin.id,
            projectName: 'Sunday Service Master Broadcast',
            metadata: JSON.stringify({
                pageCount: '38 pages',
                pdfVersion: 'PDF/X-4:2010 High Quality Print',
                colorStandard: 'ISO 15930-7 (Hunter Green #386642 / Cornsilk #FFEBCC)',
                checksum: '1a79a4d60de6718e8e5b326e338ae533',
                targetPlatforms: ['Internal Staff', 'Freelancers', 'Agencies'],
            }),
            tags: ['Branding', 'Guidelines', 'PDF', 'Official', 'CorporateIdentity'],
            license: {
                licenseName: 'Internal Confidential Work-For-Hire',
                licenseType: 'Proprietary MTC',
                grantedTo: 'Mountain Top Communications Staff',
                expiresAt: null,
                notes: 'Strictly internal distribution. Do not distribute without approval.',
            },
            versions: [
                { versionNum: 1, nextcloudUri: '/storage/Mountain_Top_Brand_Guidelines_Master.pdf', proxyUri: '/storage/Mountain_Top_Brand_Guidelines_Master.pdf' },
            ],
            comments: [],
        },
        {
            title: 'Social_Reel_Youth_Testimony_Vertical.mp4',
            description: 'Fast-paced vertical reel featuring student baptism testimonies with animated captions.',
            type: 'video',
            mimeType: 'video/mp4',
            size: 157286400, // 150 MB
            status: 'DRAFT',
            creatorId: editor.id,
            projectName: 'Youth Retreat Promo: Unshakable',
            metadata: JSON.stringify({
                resolution: '1080x1920 (Vertical 9:16)',
                aspectRatio: '9:16 Mobile',
                framerate: '30.0 fps',
                codec: 'H.264 AAC',
                duration: '00:00:58',
                checksum: 'd283749bcf867492a8b3f23471415667',
                targetPlatforms: ['Instagram Reels', 'TikTok', 'YouTube Shorts'],
            }),
            tags: ['Instagram', 'TikTok', 'Vertical', 'Youth', 'Reels', 'Testimony'],
            versions: [
                { versionNum: 1, nextcloudUri: '/storage/Social_Reel_Youth_Testimony_Vertical.mp4', proxyUri: '/storage/Social_Reel_Youth_Testimony_Vertical.mp4' },
            ],
            comments: [],
        },
        {
            title: 'MTC_Logo_Master_Vector_Collection.ai',
            description: 'Vector artwork package including full lockups, horizontal badges, and peak cross icon.',
            type: 'image',
            mimeType: 'application/illustrator',
            size: 44040192, // 42 MB
            status: 'APPROVED',
            creatorId: admin.id,
            projectName: 'Sunday Service Master Broadcast',
            metadata: JSON.stringify({
                vectorPrecision: 'Infinite mathematical bezier resolution',
                colorProfiles: 'Pantone 554 C + CMYK + Hex #386642',
                checksum: '5d41402abc4b2a76b9719d911017c592',
                targetPlatforms: ['App Icon', 'Website Header', 'Merchandise Embroidery'],
            }),
            tags: ['Logo', 'Vector', 'Master', 'Illustrator', 'Icon', 'Brand'],
            versions: [
                { versionNum: 1, nextcloudUri: '/storage/MTC_Logo_Master_Vector_Collection.ai', proxyUri: '/storage/MTC_Logo_Master_Vector_Collection.ai' },
            ],
            comments: [],
        },
        {
            title: 'Sunday_Worship_Multitrack_Stem_Pack.zip',
            description: '16-channel isolated WAV multitracks (Drums, Bass, Guitars, Synth, Lead Vocals, Choir).',
            type: 'audio',
            mimeType: 'application/zip',
            size: 1887436800, // 1.8 GB
            status: 'REVIEW',
            creatorId: producer.id,
            projectName: 'Sunday Service Master Broadcast',
            metadata: JSON.stringify({
                tracksCount: '16 Stems',
                sampleRate: '48.0 kHz 24-bit Broadcast Wave',
                checksum: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
                targetPlatforms: ['Pro Tools', 'Ableton Live', 'Logic Pro'],
            }),
            tags: ['Worship', 'Multitrack', 'Stems', 'Audio', 'Mixing', 'ProTools'],
            versions: [
                { versionNum: 1, nextcloudUri: '/storage/Sunday_Worship_Multitrack_Stem_Pack.zip', proxyUri: '/storage/Sunday_Worship_Multitrack_Stem_Pack.zip' },
            ],
            comments: [],
        },
    ];

    for (const assetData of enterpriseAssets) {
        const project = projectMap[assetData.projectName];
        const existing = await prisma.asset.findFirst({
            where: { title: assetData.title },
        });

        if (existing) {
            console.log(`Asset already exists: ${assetData.title}`);
            continue;
        }

        // Create Usage Right if provided
        let licenseInfoId = undefined;
        if (assetData.license) {
            const license = await prisma.usageRight.create({
                data: assetData.license,
            });
            licenseInfoId = license.id;
        }

        // Create Asset
        const asset = await prisma.asset.create({
            data: {
                title: assetData.title,
                description: assetData.description,
                type: assetData.type,
                mimeType: assetData.mimeType,
                size: assetData.size,
                status: assetData.status,
                creatorId: assetData.creatorId,
                projectId: project ? project.id : null,
                metadata: assetData.metadata,
                watermarkProfileId: watermarkProfile.id,
                licenseInfoId,
                tags: {
                    connectOrCreate: assetData.tags.map(t => ({
                        where: { name: t },
                        create: { name: t },
                    })),
                },
                versions: {
                    create: assetData.versions.map(v => ({
                        versionNum: v.versionNum,
                        nextcloudUri: v.nextcloudUri,
                        proxyUri: v.proxyUri,
                    })),
                },
                comments: assetData.comments
                    ? {
                        create: assetData.comments.map(c => ({
                            content: c.content,
                            authorId: c.authorId,
                            timestampFrame: c.timestampFrame || null,
                        })),
                    }
                    : undefined,
            },
        });

        // Add Activity Log for Asset Ingestion
        await prisma.activityLog.create({
            data: {
                userId: assetData.creatorId,
                action: 'UPLOAD',
                entityType: 'ASSET',
                entityId: asset.id,
                details: JSON.stringify({
                    fileName: asset.title,
                    size: asset.size,
                    type: asset.type,
                    status: asset.status,
                    project: assetData.projectName,
                }),
                ipAddress: '127.0.0.1',
                userAgent: 'MTC Enterprise Ingestion Engine v2.0',
            },
        });

        console.log(`Created Enterprise Asset: ${asset.title} (${asset.status})`);
    }

    // 5. Seed Additional Activity Logs for Enterprise Audit Trail
    const systemActivities = [
        { action: 'APPROVE', entityType: 'ASSET', details: JSON.stringify({ note: 'Passed technical QC inspection' }) },
        { action: 'UPDATE', entityType: 'PROJECT', details: JSON.stringify({ note: 'Scheduled delivery date set for Q2' }) },
        { action: 'VIEW', entityType: 'ASSET', details: JSON.stringify({ method: 'Web Inspector Preview' }) },
        { action: 'DOWNLOAD', entityType: 'ASSET', details: JSON.stringify({ rendition: '1080p Proxy' }) },
    ];

    const firstAsset = await prisma.asset.findFirst();
    if (firstAsset) {
        for (const act of systemActivities) {
            await prisma.activityLog.create({
                data: {
                    userId: admin.id,
                    action: act.action,
                    entityType: act.entityType,
                    entityId: firstAsset.id,
                    details: act.details,
                    ipAddress: '192.168.1.105',
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
                },
            });
        }
    }

    console.log('Enterprise MTC DAM Seeding Complete!');
}

main()
    .catch((e) => {
        console.error('Error seeding enterprise DAM:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
