# Deploying MTC DAM on TrueNAS

TrueNAS (especially **TrueNAS SCALE**) is the absolute best environment for MTC DAM. Your data benefits from **ZFS data integrity, automatic snapshots, and multi-gigabit local network speeds**.

---

## 🚀 Fast Track: 3-Minute SSH Deployment (Recommended)

This is the fastest, cleanest way to get MTC DAM running on TrueNAS SCALE.

### Step 1: SSH into your TrueNAS
Open your terminal (PowerShell on Windows, or macOS/Linux terminal):
```bash
ssh admin@<YOUR-TRUENAS-IP>
# or ssh root@<YOUR-TRUENAS-IP>
```

### Step 2: Navigate to your Storage Pool
Find your ZFS storage pool (replace `tank` or `pool1` with your actual pool name):
```bash
# Example: Create an apps directory if you haven't already
cd /mnt/YOUR_POOL_NAME/
mkdir -p apps/mtc-dam
cd apps/mtc-dam
```

### Step 3: Clone the Repository & Configure
```bash
git clone https://github.com/EbenezerGasonoo/DAM-for-MTC.git .
cp .env.example .env
nano .env
```
*(In nano, set your `JWT_SECRET`, and optionally your Nextcloud URL or Cloudflare Tunnel Token. Press `Ctrl+O` then `Enter` to save, `Ctrl+X` to exit).*

### Step 4: Build & Launch
```bash
docker compose up -d --build
```
Your DAM is now live at:
👉 **`http://<YOUR-TRUENAS-IP>:3000`**

---

## 🖥️ Alternative: TrueNAS SCALE Web GUI Deployment

If you prefer using the TrueNAS Web Interface instead of SSH:

### If on TrueNAS SCALE 24.10+ (Electric Eel - Native Docker Compose)
1. Go to **Apps** in the TrueNAS navigation menu.
2. Click **Discover Apps** -> **Custom App** (top right).
3. **Application Name**: `mtc-dam`.
4. **Compose YAML**: Click *Upload or Paste* and paste the contents of `docker-compose.yml`.
5. Set port mapping to `3000:3000`.
6. Click **Install**. TrueNAS will pull, build, and run the container automatically.

### If on TrueNAS SCALE 24.04 (Dragonfish) or with Dockge / Portainer
If you use **Dockge** or **Portainer** (popular TrueNAS apps for managing Docker):
1. Open Dockge/Portainer on your TrueNAS.
2. Click **Create Stack** / **Add Stack**.
3. Name it `mtc-dam`.
4. Paste the `docker-compose.yml` into the editor.
5. Click **Deploy**.

---

## 🔒 Connecting Cloudflare Tunnel on TrueNAS (Free Domain & SSL)

To give team members outside the office secure access (e.g. `https://dam.yourcompany.com`) without exposing TrueNAS to the internet:

### Method A: Built-in to Docker Compose
1. In your TrueNAS `apps/mtc-dam/.env` file, add your Cloudflare Tunnel token:
   ```env
   CLOUDFLARE_TUNNEL_TOKEN="your_token_from_cloudflare_zero_trust"
   ```
2. Start the tunnel profile:
   ```bash
   docker compose --profile tunnel up -d
   ```

### Method B: Using TrueNAS Official Cloudflare App
1. TrueNAS Apps catalog has an official **Cloudflare** app.
2. Install it from the App Catalog, paste your Cloudflare Tunnel token.
3. In Cloudflare Zero Trust dashboard, route `dam.yourdomain.com` -> `http://<TRUENAS-IP>:3000`.

---

## 🛡️ ZFS Host Path Storage (Optional Advanced Setup)

If you want your DAM database and assets stored directly inside TrueNAS datasets (for easy snapshotting and SMB browsing):

1. In TrueNAS **Datasets**, create two child datasets:
   - `YOUR_POOL/dam-data`
   - `YOUR_POOL/dam-storage`
2. Update the `volumes` section of `docker-compose.yml`:
   ```yaml
   volumes:
     - /mnt/YOUR_POOL/dam-data:/app/data
     - /mnt/YOUR_POOL/dam-storage:/app/public/storage
   ```
3. Set dataset permissions to allow writing (e.g. ACL Preset: `POSIX Open` or user `root` / `apps`).
