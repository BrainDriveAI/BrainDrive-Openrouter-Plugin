#!/bin/bash

echo "=== OpenRouter Plugin Rebuild and Install Script ==="
echo ""

# Navigate to plugin directory
cd /home/hacker/BrainDriveDev/BrainDrive/PluginBuild/braindrive-openrouter-plugin

echo "Step 1: Cleaning old build..."
rm -rf dist node_modules package-lock.json
rm -rf ../../backend/plugins/shared/BrainDriveOpenRouter/v1.0.0/dist

echo "Step 2: Installing dependencies with correct versions..."
npm install react@18.3.1 react-dom@18.3.1 --save --save-exact
npm install html-webpack-plugin@5.6.3 webpack@5.98.0 webpack-cli@6.0.1 webpack-dev-server@5.2.0 --save --save-exact
npm install @types/react@18.2.0 @types/react-dom@18.2.0 typescript@5.7.3 ts-loader@9.5.2 --save-dev
npm install css-loader@7.1.2 style-loader@4.0.0 postcss@8.5.3 postcss-loader@8.1.1 autoprefixer@10.4.21 --save-dev

echo "Step 3: Building the plugin..."
npm run build

echo "Step 4: Checking if build was successful..."
if [ -f "../../backend/plugins/shared/BrainDriveOpenRouter/v1.0.0/dist/remoteEntry.js" ]; then
    echo "✓ Build successful - remoteEntry.js created"
else
    echo "✗ Build failed - remoteEntry.js not found"
    exit 1
fi

echo "Step 5: Uninstalling old plugin (if exists)..."
python3 lifecycle_manager.py uninstall

echo "Step 6: Installing the plugin..."
python3 lifecycle_manager.py install

echo ""
echo "=== Installation Complete ==="
echo ""
echo "Next steps:"
echo "1. Navigate to the Settings page in BrainDrive"
echo "2. Look for 'OpenRouter API Keys' under 'LLM Servers' category"
echo "3. Enter and save your OpenRouter API key"
echo ""
echo "If you encounter issues, check:"
echo "- Browser console for errors"
echo "- /home/hacker/BrainDriveDev/BrainDrive/Docs/Settings/OpenRouter/issueLog.txt"