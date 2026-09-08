# MTC DAM - Complete Hosting & Deployment Guide

This guide covers all options to host your MTC Digital Asset Management (DAM) system **without Render**, with zero subscription fees, full performance, and maximum security:

1. [Option 1: Self-Host on Your Windows System (Local / Office Network)](#option-1-self-host-on-your-windows-system)
2. [Option 2: Expose Securely via Cloudflare (Free Domain & SSL)](#option-2-expose-securely-via-cloudflare-recommended)
3. [Option 3: Host on a Linux VPS / Cloud Server (Docker)](#option-3-host-on-a-linux-vps-or-cloud-server)

---

## Technical Note: Why Cloudflare Tunnel instead of Cloudflare Pages?
MTC DAM relies on native backend capabilities:
- **FFmpeg** for automatic video transcoding & thumbnail generation
- **Sharp** for high-performance image compression
- **SQLite / Prisma** for file metadata & user accounts
- **WebDAV streaming** for multi-gigabyte Nextcloud asset uploads

Cloudflare Pages/Workers runs strictly on an isolated V8 edge environment without a Node filesystem or binary execution. 
**Cloudflare Tunnel (`cloudflared`)** gives you the best of both worlds: your machine or server processes the assets, while Cloudflare handles your **custom domain, free SSL, global CDN, and DDoS protection** with **zero router port forwarding**.

---

## Option 1: Self-Host on Your Windows System

You can run the production server directly on your Windows workstation or office server.

### Method A: One-Click Startup (No Docker Needed)
1. Double-click **`start-windows.bat`** (or right-click **`start-windows.ps1`** -> **Run with PowerShell**).
2. The script will:
   - Check and push the SQLite database schema
   - Ensure the Admin account exists (`admin@mtc.com` / `admin123`)
   - Start the high-performance Next.js production server on port **3000**
3. Open your browser:
   - **This PC**: [http://localhost:3000](http://localhost:3000)
   - **Other computers on your Office/Home WiFi**: `http://<YOUR-LOCAL-IP>:3000` (the PowerShell script will automatically print your local IP address).

### Method B: Run 24/7 as a Background Service (PM2)
If you want the DAM to run continuously in the background and restart automatically on reboot:
1. Open PowerShell and install PM2 globally:
   ```powershell
   npm install -g pm2
   npm install -g pm2-windows-startup
   ```
2. Start the DAM application:
   ```powershell
   pm2 start npm --name "mtc-dam" -- run start -- -p 3000
   ```
3. Save the process list and register it to boot with Windows:
   ```powershell
   pm2 save
   pm2-startup install
   ```
4. Useful PM2 commands:
   - View status: `pm2 status`
   - View logs: `pm2 logs mtc-dam`
   - Restart: `pm2 restart mtc-dam`
   - Stop: `pm2 stop mtc-dam`

---

## Option 2: Expose Securely via Cloudflare (Recommended)

Cloudflare Tunnel lets you publish your locally hosted DAM to the internet with a custom domain (e.g. `https://dam.yourdomain.com`) **without opening any ports on your router or revealing your home/office IP**.

### Step 1: Quick 10-Second Test (No domain required)
If you want an instant public HTTPS link right now to test or share with colleagues:
1. Install Cloudflare's CLI tool via Windows package manager:
   ```powershell
   winget install Cloudflare.cloudflared
   ```
2. Start your DAM server (`start-windows.bat` or `npm run start`).
3. In a new PowerShell window, run:
   ```powershell
   cloudflared tunnel --url http://localhost:3000
   ```
4. Cloudflare will output a temporary public link like:
   ```
   https://random-words.trycloudflare.com
   ```
   Anyone in the world can open this link to access your DAM with full HTTPS.

---

### Step 2: Permanent Setup with Your Custom Domain
To connect your own domain (e.g., `dam.yourdomain.com` or `dam.mtc.com`):

1. **Log in to Cloudflare Zero Trust**:
   - Go to [https://one.dash.cloudflare.com/](https://one.dash.cloudflare.com/) (Free plan).
2. **Create a Tunnel**:
   - Navigate to **Networks** -> **Tunnels** -> Click **Add a tunnel**.
   - Choose **Cloudflared** connector -> Click **Next**.
   - Give it a name (e.g. `mtc-dam`) -> Click **Save tunnel**.
3. **Install the Connector**:
   - **If using Docker Desktop**:
     - Copy the `TUNNEL_TOKEN` from the Docker command shown on the screen.
     - Add it to your `.env` file:
       ```env
       CLOUDFLARE_TUNNEL_TOKEN="your_token_here"
       ```
     - Run:
       ```powershell
       docker compose --profile tunnel up -d
       ```
   - **If running directly on Windows**:
     - Select **Windows** on the Cloudflare dashboard.
     - Copy the command provided and run it in an Administrator PowerShell window. Cloudflare will install as an automatic Windows service!
4. **Route Your Public Hostname**:
   - In the Cloudflare Tunnel configuration, go to the **Public Hostname** tab.
   - Click **Add a public hostname**.
   - **Subdomain**: `dam` (or whatever you prefer)
   - **Domain**: Select your domain from the dropdown (e.g. `yourdomain.com`)
   - **Service Type**: `HTTP`
   - **URL**: `localhost:3000` (or `mtc-dam:3000` if using Docker)
   - Click **Save Hostname**.

Done! Your DAM is now accessible worldwide at `https://dam.yourdomain.com` with enterprise-grade SSL and DDoS shielding.

---

## Option 3: Host on a Linux VPS or Cloud Server

If you want an always-on remote server (e.g., Hetzner €4/mo, DigitalOcean $6/mo, or a local Linux server):

### 1. Requirements
- Any Linux server (Ubuntu 22.04 / 24.04 LTS recommended)
- Docker & Docker Compose installed:
  ```bash
  curl -fsSL https://get.docker.com | sh
  ```

### 2. Deploy in 4 Commands
```bash
# 1. Clone your repository
git clone https://github.com/EbenezerGasonoo/DAM-for-MTC.git
cd DAM-for-MTC

# 2. Set up environment
cp .env.example .env
nano .env   # Update JWT_SECRET and NEXT_PUBLIC_APP_URL

# 3. Launch the container
docker compose up -d --build
```

### 3. Verify
- The container sets up SQLite persistent storage in a Docker volume (`dam_db_data`).
- Check container logs:
  ```bash
  docker logs -f mtc-dam
  ```
- Your application will be live at `http://YOUR-SERVER-IP:3000`.
- You can pair it with Cloudflare Tunnel (Option 2) or standard Nginx/Caddy reverse proxy with Let's Encrypt.

---

## Environment Variables Reference

| Variable | Description | Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | SQLite database connection string | `file:./dev.db` (local) or `file:/app/data/prod.db` (docker) |
| `JWT_SECRET` | Secret key for signing session tokens | Auto-generated or custom string |
| `NEXT_PUBLIC_APP_URL`| Base URL used for public share links | `http://localhost:3000` or `https://dam.yourdomain.com` |
| `NEXTCLOUD_URL` | WebDAV endpoint of your Nextcloud server | Empty (uses local disk fallback) |
| `NEXTCLOUD_USERNAME` | WebDAV username or app password user | Empty |
| `NEXTCLOUD_PASSWORD` | WebDAV app password | Empty |
| `CLOUDFLARE_TUNNEL_TOKEN`| Cloudflare Zero Trust tunnel token | Empty |
