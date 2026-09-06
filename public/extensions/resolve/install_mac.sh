#!/bin/bash
echo "========================================================="
echo "   MTC DAM — DaVinci Resolve Integration Installer (Mac)"
echo "========================================================="
echo ""

PLUGIN_DIR="/Library/Application Support/Blackmagic Design/DaVinci Resolve/Workflow Integration Plugins/com.mtc.dam.resolve"
SCRIPT_DIR="$HOME/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Utility"

echo "1. Creating DaVinci Resolve directories..."
sudo mkdir -p "$PLUGIN_DIR" 2>/dev/null || mkdir -p "$PLUGIN_DIR" 2>/dev/null
mkdir -p "$SCRIPT_DIR"

echo "2. Installing Workflow Integration Plugin..."
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cp "$DIR/workflow_integration.json" "$PLUGIN_DIR/" 2>/dev/null
cp "$DIR/index.html" "$PLUGIN_DIR/" 2>/dev/null

echo "3. Installing Python MediaPool Importer Script..."
cp "$DIR/MTC_DAM_Importer.py" "$SCRIPT_DIR/"
chmod +x "$SCRIPT_DIR/MTC_DAM_Importer.py"

echo ""
echo "========================================================="
echo "   SUCCESS! MTC DAM Installed for DaVinci Resolve!"
echo "========================================================="
echo ""
echo "To use inside DaVinci Resolve:"
echo "   Method A (Workflow Integration):"
echo "     Workspace -> Workflow Integrations -> MTC DAM Media Hub"
echo ""
echo "   Method B (Script Utility):"
echo "     Workspace -> Scripts -> MTC_DAM_Importer"
echo ""
