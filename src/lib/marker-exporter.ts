/**
 * MTC DAM — NLE Timeline Marker Exporter
 * Generates DaVinci Resolve EDL, DaVinci Resolve CSV, and Adobe Premiere Pro Marker CSV files
 * from frame-accurate review comments.
 */

import { secondsToTimecode, formatPlayerTimecode } from './timecode';

export interface MarkerComment {
    id: string;
    content: string;
    timestampFrame?: number | null;
    authorName?: string;
    createdAt?: string;
    color?: string; // Cyan, Green, Yellow, Red, Blue, Pink, Purple
}

export interface MarkerExportOptions {
    clipTitle: string;
    fps?: number;
    startHour?: number; // default 1 for broadcast 01:00:00:00 or 0 for 00:00:00:00
}

/**
 * Resolve Marker Colors:
 * Blue, Cyan, Green, Yellow, Red, Pink, Purple, Fuchsia, Rose, Lavender, Sky, Mint, Lemon, Sand, Cocoa
 */
const DEFAULT_RESOLVE_COLORS = ['Cyan', 'Blue', 'Green', 'Yellow', 'Purple', 'Pink', 'Rose'];

/**
 * 1. DaVinci Resolve CMX 3600 EDL with Timeline Markers
 */
export function exportToResolveEdl(comments: MarkerComment[], options: MarkerExportOptions): string {
    const fps = options.fps || 24;
    const startHour = options.startHour !== undefined ? options.startHour : 1;
    const clipName = options.clipTitle.replace(/[^a-zA-Z0-9.\-_]/g, '_');

    // Filter comments that have a timestamp
    const timedComments = comments
        .filter(c => c.timestampFrame !== undefined && c.timestampFrame !== null && !isNaN(c.timestampFrame))
        .sort((a, b) => (a.timestampFrame || 0) - (b.timestampFrame || 0));

    const lines: string[] = [
        `TITLE: ${clipName}_MARKERS`,
        `FCM: NON-DROP FRAME`,
        '',
    ];

    timedComments.forEach((comment, idx) => {
        const eventNum = (idx + 1).toString().padStart(3, '0');
        const inSecs = comment.timestampFrame || 0;
        const outSecs = inSecs + (1 / fps); // 1 frame duration

        const inTc = secondsToTimecode(inSecs, fps, startHour);
        const outTc = secondsToTimecode(outSecs, fps, startHour);

        const color = comment.color || DEFAULT_RESOLVE_COLORS[idx % DEFAULT_RESOLVE_COLORS.length];
        const authorPrefix = comment.authorName ? `[${comment.authorName}] ` : '';
        const noteClean = `${authorPrefix}${comment.content}`.replace(/\r?\n/g, ' ').trim();

        // Standard CMX 3600 Event
        lines.push(`${eventNum}  001      V     C        ${inTc} ${outTc} ${inTc} ${outTc}  `);
        lines.push(`* FROM CLIP NAME: ${clipName}`);
        lines.push(`* RESOLVE MARKER: ${color}  ${noteClean}`);
        lines.push('');
    });

    return lines.join('\r\n');
}

/**
 * 2. DaVinci Resolve Timeline Markers CSV
 */
export function exportToResolveCsv(comments: MarkerComment[], options: MarkerExportOptions): string {
    const fps = options.fps || 24;
    const startHour = options.startHour !== undefined ? options.startHour : 1;
    const clipName = options.clipTitle.replace(/[^a-zA-Z0-9.\-_]/g, '_');

    const timedComments = comments
        .filter(c => c.timestampFrame !== undefined && c.timestampFrame !== null && !isNaN(c.timestampFrame))
        .sort((a, b) => (a.timestampFrame || 0) - (b.timestampFrame || 0));

    const header = ['"EDL Clip Name"', '"Timecode"', '"Source In"', '"Source Out"', '"Duration"', '"Marker Name"', '"Color"', '"Notes"'];
    const rows = [header.join(',')];

    timedComments.forEach((comment, idx) => {
        const inSecs = comment.timestampFrame || 0;
        const outSecs = inSecs + (1 / fps);
        const inTc = secondsToTimecode(inSecs, fps, startHour);
        const outTc = secondsToTimecode(outSecs, fps, startHour);
        const color = comment.color || DEFAULT_RESOLVE_COLORS[idx % DEFAULT_RESOLVE_COLORS.length];
        const markerName = comment.authorName ? `${comment.authorName} Note` : `DAM Note ${idx + 1}`;
        const noteClean = comment.content.replace(/"/g, '""').replace(/\r?\n/g, ' ').trim();

        rows.push(`"${clipName}","${inTc}","${inTc}","${outTc}","1","${markerName}","${color}","${noteClean}"`);
    });

    return rows.join('\r\n');
}

/**
 * 3. Adobe Premiere Pro Marker CSV
 */
export function exportToPremiereCsv(comments: MarkerComment[], options: MarkerExportOptions): string {
    const fps = options.fps || 24;
    const timedComments = comments
        .filter(c => c.timestampFrame !== undefined && c.timestampFrame !== null && !isNaN(c.timestampFrame))
        .sort((a, b) => (a.timestampFrame || 0) - (b.timestampFrame || 0));

    const header = ['Marker Name', 'Description', 'In', 'Out', 'Duration', 'Marker Type'];
    const rows = [header.join('\t')]; // Premiere prefers tab-separated or standard CSV

    timedComments.forEach((comment, idx) => {
        const inSecs = comment.timestampFrame || 0;
        const inTc = formatPlayerTimecode(inSecs, fps);
        const name = comment.authorName ? `${comment.authorName} Review Note` : `Review Note ${idx + 1}`;
        const desc = comment.content.replace(/"/g, '""').replace(/\r?\n/g, ' ').trim();

        rows.push([
            `"${name}"`,
            `"${desc}"`,
            inTc,
            inTc,
            '00:00:00:01',
            'Comment'
        ].join('\t'));
    });

    return rows.join('\r\n');
}
