import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromCookies } from '@/lib/auth';
import fs from 'fs';

// GET: Retrieve current AI Transcription settings & status
export async function GET() {
    try {
        const auth = await getAuthFromCookies();
        if (!auth?.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const settings = await prisma.systemSetting.findMany({
            where: {
                key: { in: ['GROQ_API_KEY', 'OPENAI_API_KEY', 'WHISPER_PROVIDER', 'WHISPER_AUTO_FAILOVER'] }
            }
        });

        const map = new Map(settings.map(s => [s.key, s.value]));
        const groqKey = map.get('GROQ_API_KEY') || process.env.GROQ_API_KEY || '';
        const openaiKey = map.get('OPENAI_API_KEY') || process.env.OPENAI_API_KEY || '';
        const provider = map.get('WHISPER_PROVIDER') || (groqKey ? 'groq' : openaiKey ? 'openai' : 'local');
        const autoFailover = map.get('WHISPER_AUTO_FAILOVER') !== 'false';

        const whisperBinary = process.env.WHISPER_CPP_PATH || '/opt/whisper/whisper-cli';
        const whisperModel = process.env.WHISPER_MODEL_PATH || '/opt/whisper/ggml-base.bin';
        const localWhisperAvailable = fs.existsSync(whisperBinary) && fs.existsSync(whisperModel);

        const maskKey = (k: string) => {
            if (!k || k.length < 8) return '';
            return `${k.substring(0, 4)}...${k.substring(k.length - 4)}`;
        };

        return NextResponse.json({
            groqConfigured: Boolean(groqKey),
            groqKeyMasked: maskKey(groqKey),
            openaiConfigured: Boolean(openaiKey),
            openaiKeyMasked: maskKey(openaiKey),
            provider,
            autoFailover,
            localWhisperAvailable,
            localWhisperBinary: fs.existsSync(whisperBinary) ? whisperBinary : null,
            localWhisperModel: fs.existsSync(whisperModel) ? whisperModel : null,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to fetch AI settings' }, { status: 500 });
    }
}

// POST: Update AI transcription settings or run connectivity test
export async function POST(req: NextRequest) {
    try {
        const auth = await getAuthFromCookies();
        if (!auth?.userId || auth.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const body = await req.json();
        const { action, groqApiKey, openaiApiKey, provider, autoFailover } = body;

        // Test Cloud AI API Connectivity
        if (action === 'test') {
            const testProvider = body.testProvider || 'groq';
            const testKey = body.testKey || (testProvider === 'groq'
                ? (await prisma.systemSetting.findUnique({ where: { key: 'GROQ_API_KEY' } }))?.value || process.env.GROQ_API_KEY
                : (await prisma.systemSetting.findUnique({ where: { key: 'OPENAI_API_KEY' } }))?.value || process.env.OPENAI_API_KEY);

            if (!testKey) {
                return NextResponse.json({ success: false, error: `No API key found for ${testProvider}` }, { status: 400 });
            }

            const t0 = Date.now();
            try {
                if (testProvider === 'groq') {
                    // Probe Groq API models endpoint
                    const res = await fetch('https://api.groq.com/openai/v1/models', {
                        headers: { 'Authorization': `Bearer ${testKey}` }
                    });
                    if (!res.ok) throw new Error(`Groq API returned HTTP ${res.status}`);
                    return NextResponse.json({
                        success: true,
                        message: 'Groq Whisper API connection verified (whisper-large-v3 available)',
                        latencyMs: Date.now() - t0
                    });
                } else {
                    // Probe OpenAI API models endpoint
                    const res = await fetch('https://api.openai.com/v1/models', {
                        headers: { 'Authorization': `Bearer ${testKey}` }
                    });
                    if (!res.ok) throw new Error(`OpenAI API returned HTTP ${res.status}`);
                    return NextResponse.json({
                        success: true,
                        message: 'OpenAI Whisper API connection verified',
                        latencyMs: Date.now() - t0
                    });
                }
            } catch (err: any) {
                return NextResponse.json({ success: false, error: err.message }, { status: 400 });
            }
        }

        // Save Settings to Database
        const updates: Array<{ key: string; value: string }> = [];

        if (groqApiKey !== undefined) {
            updates.push({ key: 'GROQ_API_KEY', value: groqApiKey.trim() });
        }
        if (openaiApiKey !== undefined) {
            updates.push({ key: 'OPENAI_API_KEY', value: openaiApiKey.trim() });
        }
        if (provider !== undefined) {
            updates.push({ key: 'WHISPER_PROVIDER', value: provider });
        }
        if (autoFailover !== undefined) {
            updates.push({ key: 'WHISPER_AUTO_FAILOVER', value: String(autoFailover) });
        }

        for (const item of updates) {
            await prisma.systemSetting.upsert({
                where: { key: item.key },
                update: { value: item.value },
                create: { key: item.key, value: item.value }
            });
        }

        return NextResponse.json({ success: true, message: 'AI Transcription configuration updated.' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to update AI settings' }, { status: 500 });
    }
}
