#!/bin/bash

# Exit on error
set -e

EXT_ID="regexe@unsubble"
XPI_NAME="${EXT_ID}.xpi"

echo "======================================"
echo "  RegExe - Zen Browser Installer"
echo "======================================"
echo ""

# 1. Check dependencies
if ! command -v zip &> /dev/null; then
    echo "Error: 'zip' command is required but not found."
    echo "Please install zip (e.g., sudo apt install zip) and try again."
    exit 1
fi

# 2. Build the extension package (.xpi)
echo "Packaging extension..."
rm -f "$XPI_NAME"
zip -q -r "$XPI_NAME" manifest.json background/ content/ icons/ LICENSE README.md
echo "Built $XPI_NAME successfully."

# 3. Locate Zen Browser profile directories
ZEN_DIRS=()
[ -d "$HOME/.zen" ] && ZEN_DIRS+=("$HOME/.zen")
[ -d "$HOME/.config/zen" ] && ZEN_DIRS+=("$HOME/.config/zen")
[ -d "$HOME/.var/app/app.zen_browser.zen/.zen" ] && ZEN_DIRS+=("$HOME/.var/app/app.zen_browser.zen/.zen")
[ -d "$HOME/.var/app/app.zen_browser.zen/config/zen" ] && ZEN_DIRS+=("$HOME/.var/app/app.zen_browser.zen/config/zen")
[ -d "$HOME/.var/app/io.zen_browser.zen/.zen" ] && ZEN_DIRS+=("$HOME/.var/app/io.zen_browser.zen/.zen")
[ -d "$HOME/.var/app/io.zen_browser.zen/config/zen" ] && ZEN_DIRS+=("$HOME/.var/app/io.zen_browser.zen/config/zen")

if [ ${#ZEN_DIRS[@]} -eq 0 ]; then
    echo ""
    echo "  Could not automatically find Zen Browser profile directories."
    echo "You can still install the extension manually:"
    echo "  1. Open Zen Browser"
    echo "  2. Go to about:addons"
    echo "  3. Click the gear icon ⚙️  > 'Install Add-on From File...'"
    echo "  4. Select $XPI_NAME"
    exit 0
fi

# 4. Install into profiles
echo ""
echo "🔍 Searching for Zen profiles..."
INSTALLED=0

for DIR in "${ZEN_DIRS[@]}"; do
    for PROFILE in "$DIR"/*; do
        if [ -d "$PROFILE" ] && [ -f "$PROFILE/prefs.js" ]; then
            EXT_DIR="$PROFILE/extensions"
            mkdir -p "$EXT_DIR"
            cp "$XPI_NAME" "$EXT_DIR/"
            echo "  Copied to profile: $(basename "$PROFILE")"
            INSTALLED=1
        fi
    done
done

echo ""
if [ $INSTALLED -eq 1 ]; then
    echo "  Installation complete!"
    echo "Please restart Zen Browser. On the next launch, Zen should prompt you to approve the extension installation."
else
    echo " Found Zen directory but no active profiles with a prefs.js file."
    echo "You can install manually by going to about:addons in Zen and selecting 'Install Add-on From File...' to load $XPI_NAME."
fi
