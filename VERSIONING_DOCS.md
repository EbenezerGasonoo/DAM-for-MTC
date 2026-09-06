# Asset Versioning & Proxy Generation Documentation

## Overview
The DAM system now supports comprehensive asset versioning with automatic proxy generation for faster viewing and access.

## Features

### 1. Automatic Proxy Generation
When assets are uploaded or new versions are created, the system automatically generates optimized proxies:

- **Images**: WebP thumbnails (600px width, 80% quality)
- **Videos**: H.264 encoded proxy (1280x720, 1000k bitrate)
- **Audio**: Waveform preview (mono, 22050Hz)
- **Documents**: Stored as-is (no proxy generation)

### 2. Asset Versioning
Each asset maintains a complete version history, allowing users to:
- Upload new versions of assets
- View version history with metadata
- Revert to previous versions (feature ready)
- Keep edit history and change tracking

## API Endpoints

### Upload New Asset
**Endpoint**: `POST /api/upload`

**Request** (FormData):
```
- file: File (required)
- title: string (default: 'Untitled')
- description: string (optional)
- creatorId: string (required)
```

**Response**:
```json
{
  "success": true,
  "asset": {
    "id": "cuid123",
    "title": "My Video",
    "type": "video",
    "mimeType": "video/mp4",
    "size": 52428800,
    "metadata": "{\"duration\": 120, \"width\": 1920, \"height\": 1080, \"codec\": \"h264\", \"bitrate\": 5000000}",
    "versions": [{
      "versionNum": 1,
      "nextcloudUri": "/mtc-dam-uploads/1712577600000_my-video.mp4",
      "proxyUri": "/mtc-dam-proxies/1712577600000_proxy_my-video.mp4"
    }]
  }
}
```

### Get Asset Versions
**Endpoint**: `GET /api/assets/[id]/versions`

**Query Parameters**:
None

**Response**:
```json
{
  "versions": [
    {
      "id": "version-id-1",
      "assetId": "asset-id",
      "versionNum": 2,
      "nextcloudUri": "/mtc-dam-uploads/asset-id/v2_1712577600000_my-video.mp4",
      "proxyUri": "/mtc-dam-proxies/asset-id/v2_proxy_1712577600000.mp4",
      "createdAt": "2026-04-08T10:30:00Z",
      "comments": []
    },
    {
      "id": "version-id-0",
      "assetId": "asset-id",
      "versionNum": 1,
      "nextcloudUri": "/mtc-dam-uploads/asset-id/v1_1712577500000_my-video.mp4",
      "proxyUri": "/mtc-dam-proxies/asset-id/v1_proxy_1712577500000.mp4",
      "createdAt": "2026-04-08T10:00:00Z",
      "comments": []
    }
  ],
  "totalVersions": 2
}
```

### Upload New Version
**Endpoint**: `POST /api/assets/[id]/versions`

**Request** (FormData):
```
- file: File (required) - New version file
- notes: string (optional) - Version notes/changelog
```

**Requirements**:
- User must be authenticated
- User must be the asset creator (for now)

**Response**:
```json
{
  "success": true,
  "version": {
    "id": "version-id-2",
    "assetId": "asset-id",
    "versionNum": 3,
    "nextcloudUri": "/mtc-dam-uploads/asset-id/v3_1712578000000_my-video-v2.mp4",
    "proxyUri": "/mtc-dam-proxies/asset-id/v3_proxy_1712578000000.mp4",
    "createdAt": "2026-04-08T11:00:00Z",
    "comments": []
  }
}
```

### Delete Specific Version
**Endpoint**: `DELETE /api/assets/[id]/versions`

**Request**:
```json
{
  "versionNum": 1
}
```

**Constraints**:
- Cannot delete the only version of an asset
- Only asset creator can delete versions

**Response**:
```json
{
  "success": true
}
```

## Technical Details

### Proxy Storage Structure
Proxies are organized in Nextcloud with clear versioning:
```
/mtc-dam-proxies/
  [asset-id]/
    v1_thumb_1712577500000.webp
    v2_proxy_1712577600000.mp4
    v3_waveform_1712578000000.mp3
```

### Database Schema
- **AssetVersion** model tracks all versions:
  - `versionNum`: Sequential version number
  - `nextcloudUri`: Path to original file
  - `proxyUri`: Path to optimized proxy (if generated)
  - `createdAt`: Timestamp
  - `comments`: Version-specific comments support

### Automatic Activity Logging
All versioning operations are logged:
- Upload new asset
- Create new version
- Delete version
- Includes file size, type, proxy URL for audit trails

## Performance Improvements

### Before (without proxies)
- Waiting for full 4K video to load
- Slow preview rendering
- Poor user experience at high network latency

### After (with proxies)
- Instant proxy loading (typically 5-10% of original size)
- H.264 video compatible with all browsers
- Reduced bandwidth consumption
- Progressive enhancement to original quality

## Future Enhancements

1. **Version Reverts**: Restore previous versions with one click
2. **Version Comments**: Per-version discussion threads
3. **Smart Versioning**: Auto-detect changed assets and prompt for versioning
4. **Batch Proxy Regeneration**: Re-encode all proxies with new settings
5. **Version Comparison**: Visual diff between versions
6. **Access Control**: Per-version permissions
7. **Scheduled Cleanup**: Auto-delete old backups after retention period

## Error Handling

### Common Errors

**400 - No file provided**
```json
{ "error": "No file provided" }
```

**401 - Unauthorized**
```json
{ "error": "Unauthorized" }
```

**403 - Forbidden**
```json
{ "error": "Forbidden - only creator can update versions" }
```

**404 - Asset not found**
```json
{ "error": "Asset not found" }
```

**500 - Proxy generation failed** (logged but doesn't block upload)
```json
{
  "success": true,
  "version": {
    "proxyUri": null,
    "note": "Proxy generation failed but asset uploaded successfully"
  }
}
```

## Usage Example

### Frontend Integration (TypeScript)

```typescript
// Upload new asset with automatic proxies
async function uploadAsset(file: File, title: string, creatorId: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('creatorId', creatorId);

    const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
    });

    return response.json();
}

// Upload new version
async function uploadNewVersion(assetId: string, file: File, notes?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (notes) formData.append('notes', notes);

    const response = await fetch(`/api/assets/${assetId}/versions`, {
        method: 'POST',
        body: formData,
    });

    return response.json();
}

// Get all versions
async function getVersionHistory(assetId: string) {
    const response = await fetch(`/api/assets/${assetId}/versions`);
    const { versions } = await response.json();
    return versions;
}

// Display proxy instead of original
function getPreviewUrl(version: AssetVersion, assetType: string) {
    if (assetType === 'video') {
        return version.proxyUri || version.nextcloudUri;  // proxy if available
    }
    return version.nextcloudUri;
}
```

## Troubleshooting

### Proxy generation takes too long
- FFmpeg processing time depends on file size and system resources
- Consider doing proxy generation asynchronously in background
- Current implementation is synchronous—upgrade to job queue if needed

### Out of disk space
- Proxies significantly reduce storage (typically 90% reduction for video)
- Monitor `/mtc-dam-proxies/` directory
- Implement cleanup policies for old versions

### Proxy file corrupted
- Re-upload new version to regenerate
- Manual Nextcloud cleanup if needed
