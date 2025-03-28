#!/bin/bash

# Exit on error
set -e

# Build the frontend
echo "Installing dependencies..."
npm install

# Build the application with environment variables
echo "Building the application..."
npm run build

# Create a server.js file for serving the static files
echo "Creating server.js for serving static files..."
cat > server.js << 'EOF'
const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle all routes by serving the index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Use PORT from environment variable or default to 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
EOF

# Install Express for the static server
echo "Installing Express for static file serving..."
npm install express --save

echo "Build completed successfully!" 