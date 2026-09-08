const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

let WorkflowIntegration = null;
try {
    WorkflowIntegration = require('./WorkflowIntegration.node');
} catch (err) {
    console.warn('[MTC DAM] Could not load WorkflowIntegration.node:', err);
}

const PLUGIN_ID = 'com.mtc.dam.resolve';

window.GetResolveInterface = function GetResolveInterface() {
    if (!WorkflowIntegration) return null;
    try {
        const isResolveInit = WorkflowIntegration.Initialize(PLUGIN_ID);
        if (!isResolveInit) {
            console.warn('[MTC DAM] Failed to initialize Resolve interface.');
            return null;
        }
        return WorkflowIntegration.GetResolve();
    } catch (e) {
        console.warn('[MTC DAM] Exception in GetResolveInterface:', e);
        return null;
    }
};

window.CleanupResolveInterface = function CleanupResolveInterface() {
    if (!WorkflowIntegration) return;
    try {
        WorkflowIntegration.CleanUp();
    } catch (e) {}
};

// Node-based direct downloader with browser User-Agent to bypass Cloudflare bot restrictions
window.DownloadAssetDirect = function DownloadAssetDirect(downloadUrl, targetPath, token) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(downloadUrl);
        const protocol = urlObj.protocol === 'https:' ? https : http;

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 DaVinciResolve/19.0 MTC-DAM/1.0',
            'Accept': '*/*',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const file = fs.createWriteStream(targetPath);

        const request = protocol.get(downloadUrl, { headers }, (response) => {
            // Handle redirects
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                file.close();
                fs.unlink(targetPath, () => {});
                return DownloadAssetDirect(response.headers.location, targetPath, token)
                    .then(resolve)
                    .catch(reject);
            }

            if (response.statusCode !== 200) {
                file.close();
                fs.unlink(targetPath, () => {});
                return reject(new Error(`Download failed with HTTP ${response.statusCode}: ${response.statusMessage}`));
            }

            response.pipe(file);

            file.on('finish', () => {
                file.close(() => resolve(targetPath));
            });
        });

        request.on('error', (err) => {
            file.close();
            fs.unlink(targetPath, () => {});
            reject(err);
        });

        request.setTimeout(60000, () => {
            request.destroy();
            file.close();
            fs.unlink(targetPath, () => {});
            reject(new Error('Download timed out'));
        });
    });
};

window.GetCacheDir = function GetCacheDir() {
    const os = require('os');
    const cacheDir = path.join(os.homedir(), 'Documents', 'MTC_DAM_Cache');
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }
    return cacheDir;
};
