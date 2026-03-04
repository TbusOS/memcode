#!/bin/bash

# memcode install script
# Usage: ./install.sh

set -e

echo "Installing memcode dependencies..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "Error: Node.js not found. Please install Node.js first."
    exit 1
fi

echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Install dependencies
echo "Installing npm dependencies..."
npm install

# Build project
echo "Building project..."
npm run build

echo ""
echo "Installation complete!"
echo ""
echo "Usage:"
echo "  node dist/index.js --path /your/code/path"
echo ""
