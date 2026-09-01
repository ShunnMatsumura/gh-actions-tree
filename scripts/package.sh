#!/bin/bash
# Build gh-actions-tree.zip for Chrome Web Store upload.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -f gh-actions-tree.zip
zip -r gh-actions-tree.zip manifest.json src icons -x "*.DS_Store"
echo "Created $(pwd)/gh-actions-tree.zip"
