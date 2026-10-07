#!/bin/bash
# Lightpanda Install Script for mawaDao/OpenClaw
# Installs the Lightpanda headless browser binary for web scraping
#
# Usage: bash scripts/install-lightpanda.sh
# Or from skill directory: bash install-lightpanda.sh

set -e

INSTALL_DIR="${LIGHTPANDA_DIR:-$HOME/.local/bin}"
BINARY_NAME="lightpanda"

echo "=== Lightpanda Setup (mawaDao Web Scraper Skill) ==="
echo "Install directory: $INSTALL_DIR"

# Detect OS and architecture
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
    Linux)
        case "$ARCH" in
            x86_64)
                DOWNLOAD_URL="https://github.com/lightpanda-io/browser/releases/download/nightly/lightpanda-x86_64-linux"
                ;;
            aarch64|arm64)
                DOWNLOAD_URL="https://github.com/lightpanda-io/browser/releases/download/nightly/lightpanda-aarch64-linux"
                ;;
            *)
                echo "ERROR: Unsupported architecture: $ARCH"
                exit 1
                ;;
        esac
        ;;
    Darwin)
        case "$ARCH" in
            x86_64)
                DOWNLOAD_URL="https://github.com/lightpanda-io/browser/releases/download/nightly/lightpanda-x86_64-macos"
                ;;
            arm64|aarch64)
                DOWNLOAD_URL="https://github.com/lightpanda-io/browser/releases/download/nightly/lightpanda-aarch64-macos"
                ;;
            *)
                echo "ERROR: Unsupported architecture: $ARCH"
                exit 1
                ;;
        esac
        ;;
    *)
        echo "ERROR: Unsupported OS: $OS"
        echo "For Windows, use WSL2 with Ubuntu and run the Linux version."
        exit 1
        ;;
esac

echo "Detected: $OS $ARCH"
echo "Download URL: $DOWNLOAD_URL"

# Check for required tools
if ! command -v curl &> /dev/null; then
    echo "ERROR: curl not found. Please install curl."
    exit 1
fi

# Create install directory
mkdir -p "$INSTALL_DIR"

# Determine asset name from URL
ASSET_NAME="${DOWNLOAD_URL##*/}"

# Try checksum verification if jq is available
VERIFY_CHECKSUM=false
if command -v jq &> /dev/null; then
    if command -v sha256sum &> /dev/null || command -v shasum &> /dev/null; then
        VERIFY_CHECKSUM=true
    fi
fi

if [ "$VERIFY_CHECKSUM" = true ]; then
    echo "Fetching expected checksum from GitHub API..."
    EXPECTED_DIGEST=$(curl -sL \
        "https://api.github.com/repos/lightpanda-io/browser/releases/tags/nightly" \
        | jq -r --arg name "$ASSET_NAME" '.assets[] | select(.name == $name) | .digest')

    if [ -n "$EXPECTED_DIGEST" ] && [ "$EXPECTED_DIGEST" != "null" ]; then
        EXPECTED_SHA256="${EXPECTED_DIGEST#sha256:}"
        echo "Expected SHA256: $EXPECTED_SHA256"
    else
        echo "WARNING: Could not retrieve checksum, skipping verification."
        VERIFY_CHECKSUM=false
    fi
fi

# Download binary
echo "Downloading Lightpanda..."
curl -L -o "$INSTALL_DIR/$BINARY_NAME" "$DOWNLOAD_URL"

# Verify checksum if possible
if [ "$VERIFY_CHECKSUM" = true ]; then
    echo "Verifying checksum..."
    if command -v sha256sum &> /dev/null; then
        ACTUAL_SHA256=$(sha256sum "$INSTALL_DIR/$BINARY_NAME" | awk '{print $1}')
    else
        ACTUAL_SHA256=$(shasum -a 256 "$INSTALL_DIR/$BINARY_NAME" | awk '{print $1}')
    fi

    if [ "$ACTUAL_SHA256" != "$EXPECTED_SHA256" ]; then
        echo "ERROR: Checksum verification FAILED!"
        echo "  Expected: $EXPECTED_SHA256"
        echo "  Actual:   $ACTUAL_SHA256"
        rm -f "$INSTALL_DIR/$BINARY_NAME"
        exit 1
    fi
    echo "Checksum verified OK."
fi

chmod a+x "$INSTALL_DIR/$BINARY_NAME"

# Check if install directory is in PATH
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
    echo ""
    echo "WARNING: $INSTALL_DIR is not in your PATH"
    echo "Add this to your shell profile (~/.bashrc or ~/.zshrc):"
    echo "  export PATH=\"\$PATH:$INSTALL_DIR\""
fi

# Test installation
echo ""
echo "Testing Lightpanda..."
if "$INSTALL_DIR/$BINARY_NAME" --version 2>/dev/null || "$INSTALL_DIR/$BINARY_NAME" --help 2>/dev/null | head -1; then
    echo "Lightpanda installed successfully!"
else
    echo "Binary installed at: $INSTALL_DIR/$BINARY_NAME"
fi

echo ""
echo "=== Setup Complete ==="
echo "Binary location: $INSTALL_DIR/$BINARY_NAME"
echo ""
echo "Quick test:"
echo "  $INSTALL_DIR/$BINARY_NAME fetch --dump markdown https://example.com"
echo ""
echo "For marketplace scraping:"
echo "  $INSTALL_DIR/$BINARY_NAME fetch --dump markdown --wait-until networkidle --wait-ms 15000 <URL>"
