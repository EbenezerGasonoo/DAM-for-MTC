#!/usr/bin/env node
/**
 * MTC DAM — Background Ingestion Daemon
 * Continuously monitors designated camera card watch folders (Nextcloud WebDAV & local TrueNAS drops),
 * triggers Intel QuickSync GPU proxy generation, FFprobe technical metadata probing, and auto-registers assets.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEFAULT_INTERVAL_SECONDS = 45;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000';

console.log('[MTC Ingest Daemon] 🚀 Autonomous Background Ingestion Daemon starting...');

let isRunning = false;
let consecutiveErrors = 0;
let lastHeartbeatTime = Date.now();

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForAppReady() {
    console.log('[MTC Ingest Daemon] ⏳ Waiting for DAM web server to be ready on port 3000...');
    for (let i = 0; i < 30; i++) {
        try {
            const res = await fetch(`${APP_URL}/api/dashboard`, { method: 'HEAD' }).catch(() => null);
            if (res && res.status < 500) {
                console.log('[MTC Ingest Daemon] ✓ DAM web service is responsive and online.');
                return true;
            }
        } catch { }
        await sleep(2000);
    }
    console.warn('[MTC Ingest Daemon] ⚠️ Web service readiness check timed out. Proceeding with polling loop.');
    return false;
}

async function getIntervalSeconds() {
    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key: 'WATCH_FOLDER_INTERVAL_SECONDS' },
        });
        if (setting && setting.value) {
            const val = parseInt(setting.value, 10);
            if (!isNaN(val) && val >= 10 && val <= 3600) {
                return val;
            }
        }
    } catch { }
    return DEFAULT_INTERVAL_SECONDS;
}

async function pollCycle() {
    if (isRunning) return;
    isRunning = true;

    try {
        const pollUrl = `${APP_URL}/api/settings/watch-folder/poll`;
        const res = await fetch(pollUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'MTC-Ingest-Daemon/1.0',
            },
        });

        if (res.ok) {
            const data = await res.json().catch(() => ({}));
            consecutiveErrors = 0;

            if (data.newImported && data.newImported > 0) {
                console.log(`[MTC Ingest Daemon] 🎉 Auto-ingested ${data.newImported} new asset(s) (${data.durationMs}ms):`);
                for (const asset of (data.importedAssets || [])) {
                    console.log(`  🎬 [${asset.type.toUpperCase()}] "${asset.title}" — Resolution: ${asset.resolution || 'N/A'}, FPS: ${asset.framerate || 'N/A'} (ID: ${asset.id})`);
                }
            } else {
                // Heartbeat log every 10 minutes so admin knows daemon is healthy
                const now = Date.now();
                if (now - lastHeartbeatTime > 10 * 60 * 1000) {
                    console.log(`[MTC Ingest Daemon] 💓 Active & watching drop folder (status: IDLE, checked files: ${data.totalFound || 0})`);
                    lastHeartbeatTime = now;
                }
            }
        } else {
            consecutiveErrors++;
            const text = await res.text().catch(() => '');
            console.warn(`[MTC Ingest Daemon] Poll returned HTTP ${res.status}: ${text.slice(0, 120)}`);
        }
    } catch (err) {
        consecutiveErrors++;
        console.error(`[MTC Ingest Daemon] Network / fetch error during poll:`, err?.message || err);
    } finally {
        isRunning = false;
    }
}

async function startDaemon() {
    // Initial warmup delay to allow Next.js and Prisma migrations to complete
    await sleep(6000);
    await waitForAppReady();

    console.log('[MTC Ingest Daemon] ⚡ Camera card watch folder monitoring active.');

    while (true) {
        const intervalSec = await getIntervalSeconds();
        await pollCycle();

        // If consecutive errors occur, back off gracefully
        const actualWait = consecutiveErrors > 3 ? Math.min(intervalSec * 2, 300) : intervalSec;
        await sleep(actualWait * 1000);
    }
}

process.on('SIGINT', () => {
    console.log('[MTC Ingest Daemon] Received SIGINT, shutting down cleanly.');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('[MTC Ingest Daemon] Received SIGTERM, shutting down cleanly.');
    process.exit(0);
});

startDaemon().catch((err) => {
    console.error('[MTC Ingest Daemon] Fatal crash:', err);
    process.exit(1);
});
