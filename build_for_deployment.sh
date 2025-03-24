#!/bin/bash
set -e

echo "Building frontend..."
cd rfi-interface
npm install
npm run build
cd ..

echo "Creating deployment directory structure..."
mkdir -p frontend/dist
cp -r rfi-interface/dist/* frontend/dist/

echo "App prepared for deployment."
echo "Push these changes to GitHub and connect with Render.com." 