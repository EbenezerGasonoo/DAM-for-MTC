/**
 * MTC DAM — Adobe Premiere Pro ExtendScript Host Bridge
 * File: Premiere.jsx
 */

$._mtc_dam = {
    // Health check
    ping: function() {
        if (!app.project) {
            return JSON.stringify({ status: "error", message: "No active project open in Premiere Pro" });
        }
        return JSON.stringify({
            status: "ok",
            appName: app.name,
            appVersion: app.version,
            projectName: app.project.name || "Untitled Project",
            projectPath: app.project.path || ""
        });
    },

    // Find or create a project bin
    getOrCreateBin: function(binName) {
        if (!app.project || !app.project.rootItem) return null;
        var name = binName || "MTC DAM Assets";
        var root = app.project.rootItem;
        
        for (var i = 0; i < root.children.numItems; i++) {
            var item = root.children[i];
            if (item.type === ProjectItemType.BIN && item.name === name) {
                return item;
            }
        }
        return root.createBin(name);
    },

    // Import a downloaded file directly into the Premiere Pro project bin
    importFileToBin: function(filePath, binName) {
        try {
            if (!app.project) {
                return JSON.stringify({ success: false, error: "Please open or create a project in Premiere Pro first." });
            }

            var f = new File(filePath);
            if (!f.exists) {
                return JSON.stringify({ success: false, error: "File does not exist on local disk: " + filePath });
            }

            var targetBin = this.getOrCreateBin(binName || "MTC DAM Assets");
            var fileArray = [f.fsName];

            // app.project.importFiles(filePathsArray, suppressUI, targetBin, importAsNumberedStills)
            var success = app.project.importFiles(fileArray, true, targetBin, false);

            if (success) {
                return JSON.stringify({
                    success: true,
                    message: "Successfully imported " + f.name + " into bin '" + (binName || "MTC DAM Assets") + "'",
                    fileName: f.name,
                    bin: binName || "MTC DAM Assets"
                });
            } else {
                return JSON.stringify({ success: false, error: "Premiere failed to import file: " + f.name });
            }
        } catch (e) {
            return JSON.stringify({ success: false, error: e.toString() });
        }
    },

    // Import and insert directly onto the active sequence timeline at playhead
    insertToTimeline: function(filePath) {
        try {
            var importRes = JSON.parse(this.importFileToBin(filePath, "MTC DAM Assets"));
            if (!importRes.success) return JSON.stringify(importRes);

            var seq = app.project.activeSequence;
            if (!seq) {
                return JSON.stringify({
                    success: true,
                    importedToBin: true,
                    message: "Imported to Project Bin (no active sequence open to insert onto timeline)."
                });
            }

            // Find the newly imported ProjectItem
            var bin = this.getOrCreateBin("MTC DAM Assets");
            var importedItem = null;
            var f = new File(filePath);

            for (var i = 0; i < bin.children.numItems; i++) {
                if (bin.children[i].name === f.name) {
                    importedItem = bin.children[i];
                    break;
                }
            }

            if (importedItem) {
                var playheadTime = seq.getPlayerPosition();
                // Overwrite onto Track 1 at playhead position
                seq.videoTracks[0].overwriteClip(importedItem, playheadTime);
                return JSON.stringify({
                    success: true,
                    inserted: true,
                    message: "Imported and placed " + f.name + " on timeline at " + playheadTime.seconds + "s"
                });
            }

            return JSON.stringify({ success: true, message: "Imported to project bin." });
        } catch (e) {
            return JSON.stringify({ success: false, error: e.toString() });
        }
    },

    // Get Active Sequence details
    getActiveSequenceInfo: function() {
        try {
            var seq = app.project ? app.project.activeSequence : null;
            if (!seq) {
                return JSON.stringify({ hasSequence: false });
            }

            return JSON.stringify({
                hasSequence: true,
                name: seq.name,
                timecode: seq.getPlaybackTimecode(),
                frameRate: seq.framerate,
                width: seq.frameSizeHorizontal,
                height: seq.frameSizeVertical,
                durationSeconds: seq.end ? seq.end.seconds : 0
            });
        } catch (e) {
            return JSON.stringify({ hasSequence: false, error: e.toString() });
        }
    }
};
