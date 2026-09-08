import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';
import { logActivity } from '@/lib/activity';

export interface BrandSettingsResponse {
    brandName: string;
    brandShortName: string;
    brandTagline: string;
    brandDescription: string;
    brandLogoUrl: string | null;
    colors?: Record<string, string>;
    updatedAt?: string;
}

const DEFAULT_BRANDING: BrandSettingsResponse = {
    brandName: 'Mountain Top Communications',
    brandShortName: 'MTC',
    brandTagline: 'Studio-Grade Digital Asset Management',
    brandDescription:
        'The official content brain for Mountain Top Communications — delivering values-based, educational, and inspiring media across Ghana and West Africa.',
    brandLogoUrl: null,
};

const BRAND_KEYS = [
    'BRAND_NAME',
    'BRAND_SHORT_NAME',
    'BRAND_TAGLINE',
    'BRAND_DESCRIPTION',
    'BRAND_LOGO_DATA',
    'BRAND_LOGO_MIME',
    'BRAND_COLORS',
] as const;

export async function GET() {
    try {
        const settings = await prisma.systemSetting.findMany({
            where: {
                key: { in: [...BRAND_KEYS] },
            },
        });

        const settingsMap: Record<string, { value: string; updatedAt: Date }> = {};
        for (const s of settings) {
            settingsMap[s.key] = { value: s.value, updatedAt: s.updatedAt };
        }

        const brandName = settingsMap['BRAND_NAME']?.value || DEFAULT_BRANDING.brandName;
        const brandShortName = settingsMap['BRAND_SHORT_NAME']?.value || DEFAULT_BRANDING.brandShortName;
        const brandTagline = settingsMap['BRAND_TAGLINE']?.value || DEFAULT_BRANDING.brandTagline;
        const brandDescription = settingsMap['BRAND_DESCRIPTION']?.value || DEFAULT_BRANDING.brandDescription;
        const brandLogoData = settingsMap['BRAND_LOGO_DATA']?.value || null;

        let colors = undefined;
        if (settingsMap['BRAND_COLORS']?.value) {
            try {
                colors = JSON.parse(settingsMap['BRAND_COLORS'].value);
            } catch {
                // Ignore parse errors
            }
        }

        return NextResponse.json({
            brandName,
            brandShortName,
            brandTagline,
            brandDescription,
            brandLogoUrl: brandLogoData ? '/api/settings/branding/logo' : null,
            brandLogoData, // Also returned for immediate client cache
            colors,
            updatedAt: settingsMap['BRAND_NAME']?.updatedAt || null,
        });
    } catch (error) {
        console.error('Error fetching brand settings:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (auth.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
        }

        const contentType = req.headers.get('content-type') || '';
        let brandName: string | undefined;
        let brandShortName: string | undefined;
        let brandTagline: string | undefined;
        let brandDescription: string | undefined;
        let colors: string | undefined;
        let logoDataUrl: string | undefined;
        let logoMime: string | undefined;

        if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();
            brandName = formData.get('brandName') as string | undefined;
            brandShortName = formData.get('brandShortName') as string | undefined;
            brandTagline = formData.get('brandTagline') as string | undefined;
            brandDescription = formData.get('brandDescription') as string | undefined;
            colors = formData.get('colors') as string | undefined;

            const logoFile = formData.get('logo') as File | null;
            if (logoFile && logoFile.size > 0) {
                // Validate file size (max 5MB)
                if (logoFile.size > 5 * 1024 * 1024) {
                    return NextResponse.json({ error: 'Logo file size exceeds 5MB limit' }, { status: 400 });
                }

                const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
                if (!allowedMimes.includes(logoFile.type)) {
                    return NextResponse.json(
                        { error: 'Invalid file type. Please upload a PNG, SVG, JPG, or WebP logo.' },
                        { status: 400 }
                    );
                }

                logoMime = logoFile.type;
                const buffer = Buffer.from(await logoFile.arrayBuffer());
                logoDataUrl = `data:${logoMime};base64,${buffer.toString('base64')}`;
            }
        } else {
            const body = await req.json();
            brandName = body.brandName;
            brandShortName = body.brandShortName;
            brandTagline = body.brandTagline;
            brandDescription = body.brandDescription;
            colors = body.colors ? JSON.stringify(body.colors) : undefined;
            if (body.logoDataUrl) {
                logoDataUrl = body.logoDataUrl;
                // Extract mime
                const match = body.logoDataUrl.match(/^data:([^;]+);base64,/);
                logoMime = match ? match[1] : 'image/png';
            }
        }

        const updates: { key: string; value: string }[] = [];

        if (brandName !== undefined) {
            updates.push({ key: 'BRAND_NAME', value: brandName.trim() });
        }
        if (brandShortName !== undefined) {
            updates.push({ key: 'BRAND_SHORT_NAME', value: brandShortName.trim().toUpperCase() });
        }
        if (brandTagline !== undefined) {
            updates.push({ key: 'BRAND_TAGLINE', value: brandTagline.trim() });
        }
        if (brandDescription !== undefined) {
            updates.push({ key: 'BRAND_DESCRIPTION', value: brandDescription.trim() });
        }
        if (colors !== undefined) {
            updates.push({ key: 'BRAND_COLORS', value: typeof colors === 'string' ? colors : JSON.stringify(colors) });
        }
        if (logoDataUrl !== undefined) {
            updates.push({ key: 'BRAND_LOGO_DATA', value: logoDataUrl });
            if (logoMime) {
                updates.push({ key: 'BRAND_LOGO_MIME', value: logoMime });
            }
        }

        // Upsert all modified keys
        for (const u of updates) {
            await prisma.systemSetting.upsert({
                where: { key: u.key },
                update: { value: u.value },
                create: { key: u.key, value: u.value },
            });
        }

        // Audit Trail: Record branding update
        await logActivity(
            auth.userId,
            'UPDATE',
            'SYSTEM_SETTING',
            'brand-identity',
            {
                updatedFields: updates.map(u => u.key),
                hasLogoUpload: Boolean(logoDataUrl),
                brandName: brandName || 'Unchanged',
                brandShortName: brandShortName || 'Unchanged',
            },
            req
        );

        return NextResponse.json({
            success: true,
            message: 'Brand identity & logo updated successfully',
            brandLogoUrl: logoDataUrl ? '/api/settings/branding/logo' : null,
        });
    } catch (error) {
        console.error('Error updating brand settings:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (auth.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
        }

        // Remove custom logo data and mime type
        await prisma.systemSetting.deleteMany({
            where: {
                key: { in: ['BRAND_LOGO_DATA', 'BRAND_LOGO_MIME'] },
            },
        });

        // Audit Trail: Record logo reset
        await logActivity(
            auth.userId,
            'DELETE',
            'SYSTEM_SETTING',
            'brand-logo',
            { action: 'Reset to default official MTC vector emblem' },
            req
        );

        return NextResponse.json({
            success: true,
            message: 'Custom logo removed. Reverted to default brand vector emblem.',
        });
    } catch (error) {
        console.error('Error removing brand logo:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
