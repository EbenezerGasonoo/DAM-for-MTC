# MTC Digital Asset Management (DAM)

A centralized, secure digital asset management system for MTC, built with Next.js 16 (App Router), React 19, Prisma, SQLite, WebDAV/Nextcloud, FFmpeg, and Sharp.

---

## Features

- **Asset Management**: Upload, preview, organize, tag, and search images, videos, audio, and documents.
- **Nextcloud Integration**: Direct bidirectional sync and folder scanning via WebDAV.
- **Admin Control**: User role management (Admins, Editors, Viewers), audit logging, and custom brand identity styling.
- **Video Transcoding**: Integrated FFmpeg for automatic video thumbnailing and previews.
- **Zero Cost Self-Hosting**: Built-in SQLite database requiring zero external paid database services.

---

## Quick Start (Run on Your System)

### Windows (One-Click)
Double-click **`start-windows.bat`** or run:
```powershell
.\start-windows.ps1
```
- App URL: [http://localhost:3000](http://localhost:3000)
- Default Admin Login: `admin@mtc.com` / `admin123`

### With Docker Compose
```bash
docker compose up -d --build
```

---

## Deployment & Hosting Options

For complete step-by-step instructions on:
1. **Self-hosting on Windows** (Local & Office Network)
2. **Cloudflare Tunnel** (Publish with custom domain, DDoS protection & free SSL without port forwarding)
3. **Linux VPS / Cloud Server** (Hetzner, DigitalOcean, Coolify, Dokploy)

👉 **Read the full [Hosting Guide](HOSTING_GUIDE.md)**

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Vanilla CSS Design System
- **Database**: SQLite with Prisma ORM
- **Media Processing**: FFmpeg & Sharp
- **Cloud Storage**: Nextcloud / WebDAV
