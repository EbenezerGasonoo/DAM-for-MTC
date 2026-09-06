#!/bin/bash
echo "========================================================="
echo "   MTC DAM — Adobe Premiere Pro Extension Installer (Mac)"
echo "========================================================="
echo ""

TARGET_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions/com.mtc.dam.premiere"

echo "1. Creating Adobe CEP directory..."
mkdir -p "$HOME/Library/Application Support/Adobe/CEP/extensions"
mkdir -p "$TARGET_DIR"

echo "2. Copying extension files..."
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cp -R "$DIR/"* "$TARGET_DIR/"

echo "3. Enabling Adobe Developer Debug Mode..."
defaults write com.adobe.CSXS.10 PlayerDebugMode 1 2>/dev/null
defaults write com.adobe.CSXS.11 PlayerDebugMode 1 2>/dev/null
defaults write com.adobe.CSXS.12 PlayerDebugMode 1 2>/dev/null
defaults write com.adobe.CSXS.13 PlayerDebugMode 1 2>/dev/null
defaults write com.adobe.CSXS.14 PlayerDebugMode 1 2>/dev/null
defaults write com.adobe.CSXS.15 PlayerDebugMode 1 2>/dev/null
defaults write com.adobe.CSXS.16 PlayerDebugMode 1 2>/dev/null

echo ""
echo "========================================================="
echo "   SUCCESS! MTC DAM Extension Installed for Premiere Pro!"
echo "========================================================="
echo ""
echo "To use inside Premiere Pro:"
echo "   1. Launch or Restart Adobe Premiere Pro."
echo "   2. Open any project."
echo "   3. Click: Window -> Extensions -> MTC DAM Media Hub."
echo ""
