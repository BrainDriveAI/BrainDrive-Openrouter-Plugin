#!/bin/bash

# Remove existing node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Install exact versions to match BrainDriveSettings
npm install --save react@18.3.1 react-dom@18.3.1
npm install --save html-webpack-plugin@5.6.3
npm install --save webpack@5.98.0 webpack-cli@6.0.1 webpack-dev-server@5.2.0

# Install dev dependencies
npm install --save-dev @types/react@18.2.0 @types/react-dom@18.2.0
npm install --save-dev typescript@5.7.3 ts-loader@9.5.2
npm install --save-dev css-loader@7.1.2 style-loader@4.0.0
npm install --save-dev postcss@8.5.3 postcss-loader@8.1.1 autoprefixer@10.4.21

echo "Dependencies installed successfully!"