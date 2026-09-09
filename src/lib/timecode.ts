/**
 * MTC DAM — Broadcast SMPTE Timecode Engine
 * Converts between seconds and frame-accurate SMPTE Timecode (HH:MM:SS:FF).
 * Supports standard broadcast framerates: 23.976, 24, 25 (PAL), 29.97 (NTSC), 30, 50, 59.94, 60 fps.
 */

export interface ParsedFramerate {
    fps: number;
    isDropFrame: boolean;
}

/**
 * Normalizes framerate from metadata string (e.g., "24 fps", "29.97", "25/1")
 */
export function parseFramerate(rawFps?: string | number | null): ParsedFramerate {
    if (!rawFps) return { fps: 24, isDropFrame: false };

    if (typeof rawFps === 'number') {
        const isDrop = Math.abs(rawFps - 29.97) < 0.05 || Math.abs(rawFps - 59.94) < 0.05;
        return { fps: rawFps, isDropFrame: isDrop };
    }

    const str = rawFps.toString().toLowerCase().replace('fps', '').trim();
    if (str.includes('/')) {
        const parts = str.split('/');
        const num = parseFloat(parts[0]);
        const den = parseFloat(parts[1]);
        if (den > 0) {
            const val = num / den;
            return { fps: val, isDropFrame: Math.abs(val - 29.97) < 0.05 };
        }
    }

    const val = parseFloat(str) || 24;
    return { fps: val, isDropFrame: Math.abs(val - 29.97) < 0.05 };
}

/**
 * Formats seconds into SMPTE Timecode: HH:MM:SS:FF
 */
export function secondsToTimecode(
    totalSeconds: number,
    fps: number = 24,
    startHour: number = 1 // Broadcast timeline default: 01:00:00:00 or 00:00:00:00
): string {
    if (isNaN(totalSeconds) || totalSeconds < 0) totalSeconds = 0;
    const roundedFps = Math.round(fps) || 24;

    const totalFrames = Math.floor(totalSeconds * fps);
    const frames = totalFrames % roundedFps;
    const totalSecs = Math.floor(totalSeconds);

    const hours = (Math.floor(totalSecs / 3600) + startHour) % 24;
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(frames)}`;
}

/**
 * Relative timecode format (starting at 00:00:00:00) for player display
 */
export function formatPlayerTimecode(totalSeconds: number, fps: number = 24): string {
    return secondsToTimecode(totalSeconds, fps, 0);
}

/**
 * Parses SMPTE Timecode HH:MM:SS:FF back into seconds
 */
export function timecodeToSeconds(timecode: string, fps: number = 24, startHour: number = 0): number {
    if (!timecode) return 0;
    const clean = timecode.trim().replace(/[;.]/g, ':');
    const parts = clean.split(':').map(p => parseInt(p, 10) || 0);

    if (parts.length < 4) return 0;

    const [hh, mm, ss, ff] = parts;
    const adjHours = Math.max(0, hh - startHour);
    const totalSecs = (adjHours * 3600) + (mm * 60) + ss;
    const frameFraction = (ff || 0) / (fps || 24);

    return totalSecs + frameFraction;
}

/**
 * Steps playhead forward or backward by a specific number of frames
 */
export function stepFrames(currentSeconds: number, frameDelta: number, fps: number = 24): number {
    const effectiveFps = fps > 0 ? fps : 24;
    const frameDuration = 1 / effectiveFps;
    const newSeconds = currentSeconds + (frameDelta * frameDuration);
    return Math.max(0, newSeconds);
}
