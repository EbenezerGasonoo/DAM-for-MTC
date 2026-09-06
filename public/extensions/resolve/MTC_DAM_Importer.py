#!/usr/bin/env python3
"""
MTC DAM — Blackmagic DaVinci Resolve Python Bridge & MediaPool Importer
Compatible with DaVinci Resolve 17, 18, and 19+ (Free & Studio)

Usage:
  1. Direct Script: Workspace -> Scripts -> MTC_DAM_Importer
  2. Background Bridge: Runs on localhost:8765 to receive 1-click imports from MTC DAM panel.
"""

import sys
import os
import json
import urllib.request
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading

# Initialize DaVinci Resolve API
def get_resolve():
    try:
        import DaVinciResolveScript as bmd
        return bmd.scriptapp('Resolve')
    except Exception:
        pass

    try:
        # Fallback to fusionscript
        import fusionscript as bmd
        return bmd.scriptapp('Resolve')
    except Exception:
        pass

    print("[MTC DAM] Could not automatically load DaVinciResolveScript. Ensure Resolve is running.")
    return None

def import_file_to_media_pool(resolve, file_path, bin_name="MTC DAM Assets"):
    if not resolve:
        return {"success": False, "error": "DaVinci Resolve is not running or scripting API is unavailable."}

    project_manager = resolve.GetProjectManager()
    if not project_manager:
        return {"success": False, "error": "Could not access Project Manager."}

    current_project = project_manager.GetCurrentProject()
    if not current_project:
        return {"success": False, "error": "No active project is currently open in DaVinci Resolve."}

    media_pool = current_project.GetMediaPool()
    if not media_pool:
        return {"success": False, "error": "Could not access Media Pool."}

    # Ensure target bin exists
    root_folder = media_pool.GetRootFolder()
    target_folder = None

    sub_folders = root_folder.GetSubFolderList()
    if sub_folders:
        for folder in sub_folders:
            if folder.GetName() == bin_name:
                target_folder = folder
                break

    if not target_folder:
        target_folder = media_pool.AddSubFolder(root_folder, bin_name)

    if target_folder:
        media_pool.SetCurrentFolder(target_folder)

    # Import media files
    items = media_pool.ImportMedia([file_path])
    if items and len(items) > 0:
        return {
            "success": True,
            "message": f"Successfully imported '{os.path.basename(file_path)}' into bin '{bin_name}'",
            "bin": bin_name,
            "itemsCount": len(items)
        }
    else:
        return {"success": False, "error": f"DaVinci Resolve rejected media file: {file_path}"}

# Local scratch directory for downloaded assets
def get_cache_dir():
    cache_dir = os.path.join(os.path.expanduser("~"), "Documents", "MTC_DAM_Cache")
    if not os.path.exists(cache_dir):
        os.makedirs(cache_dir, exist_ok=True)
    return cache_dir

def download_and_import(resolve, download_url, file_name, bin_name="MTC DAM Assets", token=None):
    cache_dir = get_cache_dir()
    clean_name = "".join(c for c in file_name if c.isalnum() or c in "._- ")
    target_path = os.path.join(cache_dir, clean_name)

    req = urllib.request.Request(download_url)
    if token:
        req.add_header("Authorization", f"Bearer {token}")

    print(f"[MTC DAM] Downloading {download_url} to {target_path}...")
    with urllib.request.urlopen(req) as response, open(target_path, 'wb') as out_file:
        out_file.write(response.read())

    print(f"[MTC DAM] Download complete. Importing into DaVinci Resolve Media Pool...")
    return import_file_to_media_pool(resolve, target_path, bin_name)

# Local HTTP bridge server to allow 1-click browser/web-panel imports
class BridgeHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass # Quiet server

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_GET(self):
        resolve = get_resolve()
        is_ready = resolve is not None
        proj_name = "None"
        if resolve and resolve.GetProjectManager() and resolve.GetProjectManager().GetCurrentProject():
            proj_name = resolve.GetProjectManager().GetCurrentProject().GetName()

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({
            "status": "ready" if is_ready else "waiting_for_resolve",
            "activeProject": proj_name,
            "bridgeVersion": "1.0.0"
        }).encode('utf-8'))

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)

        try:
            payload = json.loads(post_data.decode('utf-8'))
            resolve = get_resolve()
            
            if payload.get("localPath"):
                # Direct local file import
                result = import_file_to_media_pool(resolve, payload["localPath"], payload.get("binName", "MTC DAM Assets"))
            elif payload.get("downloadUrl"):
                # Download from MTC DAM and import
                result = download_and_import(
                    resolve,
                    payload["downloadUrl"],
                    payload.get("fileName", "imported_media.mp4"),
                    payload.get("binName", "MTC DAM Assets"),
                    payload.get("token")
                )
            else:
                result = {"success": False, "error": "Neither localPath nor downloadUrl provided."}

            self.send_response(200 if result.get("success") else 400)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode('utf-8'))

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))

def run_bridge_server(port=8765):
    server = HTTPServer(('127.0.0.1', port), BridgeHandler)
    print(f"[MTC DAM] DaVinci Resolve Bridge listening on http://127.0.0.1:{port}")
    server.serve_forever()

if __name__ == "__main__":
    resolve = get_resolve()
    if resolve:
        print("[MTC DAM] Connected to DaVinci Resolve!")
    else:
        print("[MTC DAM] Waiting for DaVinci Resolve to launch...")

    # Start bridge server on localhost
    print("[MTC DAM] Starting background import bridge for 1-click panel imports...")
    run_bridge_server()
