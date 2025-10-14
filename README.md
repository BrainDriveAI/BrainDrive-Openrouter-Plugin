# BrainDrive OpenRouter Plugin

[![License](https://img.shields.io/badge/License-MIT%20License-green.svg)](LICENSE)
[![BrainDrive](https://img.shields.io/badge/BrainDrive-Plugin-purple.svg)](https://github.com/BrainDriveAI/BrainDrive-Core)

A [BrainDrive](https://braindrive.ai) plugin that allows users to configure their OpenRouter API key for accessing various AI models from multiple providers.

## Overview

OpenRouter is a unified API that provides access to hundreds of AI models from various providers including OpenAI, Anthropic, Google, Meta, and many others. With a single API key, you can access models like GPT-4, Claude 3.5, Gemini Pro, and more.

## Features

- 🔐 **Secure API Key Management**: Store your OpenRouter API key securely with encryption
- ✅ **Automatic Validation**: Validates API key format before saving
- 👁️ **Masked Display**: Shows only masked version of stored keys for security
- 🗑️ **Easy Removal**: Remove API keys with confirmation dialog
- 🔄 **User Scoped**: Each user has their own isolated API key storage
- 🎨 **Theme Support**: Automatically adapts to light/dark themes
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Available Models

With OpenRouter, you can access models from:

- **OpenAI**: GPT-4, GPT-4o, GPT-3.5-turbo
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Haiku
- **Google**: Gemini Pro, Gemini Flash
- **Meta**: Llama 3.1, Code Llama
- **And many more** from various providers

## Installation

### Prerequisites

1. Get your OpenRouter API key from [OpenRouter Platform](https://openrouter.ai/keys)
2. Ensure you have BrainDrive installed and running

### Plugin Installation

1. Navigate to the BrainDrive plugin manager
2. Install the "BrainDrive OpenRouter" plugin
3. The plugin will be available in your settings

## Usage

1. **Configure API Key**:

   - Go to Settings → OpenRouter API Keys
   - Enter your OpenRouter API key (starts with `sk-or-`)
   - Click "Save API Key"

2. **Verify Installation**:

   - The plugin will show a masked version of your key
   - Status will indicate if the key is valid

3. **Use in Chat**:

   - Once configured, OpenRouter models will be available in the chat module
   - Select from various providers and models

4. **Manage Keys**:
   - Update your API key anytime
   - Remove the key with confirmation dialog

## API Key Format

OpenRouter API keys follow this format:

- Start with `sk-or-`
- Minimum length: 26 characters
- No spaces or special characters

## Security Features

- **Encryption**: API keys are encrypted before storage
- **Masking**: Only masked versions are sent to frontend
- **Validation**: Format validation before saving
- **User Isolation**: Each user's keys are isolated
- **Easy Removal**: Quick and secure key removal

## Development

### Building the Plugin

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Development mode with hot reload
npm start
```

### Project Structure

```
BrainDriveOpenRouter/
├── src/
│   ├── ComponentOpenRouterKeys.tsx    # Main component
│   ├── ComponentOpenRouterKeys.css    # Styles
│   ├── types.ts                       # TypeScript types
│   ├── index.tsx                      # Entry point
│   ├── components/                    # Reusable components
│   ├── services/                      # Service integrations
│   └── utils/                         # Utility functions
├── public/
│   └── index.html                     # Plugin info page
├── lifecycle_manager.py               # Backend lifecycle management
├── api_endpoints.py                   # API endpoints
├── package.json                       # Dependencies and metadata
├── webpack.config.js                  # Build configuration
└── tsconfig.json                      # TypeScript configuration
```

### Backend Integration

The plugin integrates with BrainDrive's backend through:

- **Settings System**: Uses BrainDrive's settings framework for API key storage
- **Lifecycle Management**: Proper install/uninstall/update handling
- **API Endpoints**: RESTful endpoints for plugin management
- **Database Integration**: User-scoped plugin and settings storage

## Configuration

The plugin supports the following configuration options:

- `showAdvancedOptions`: Show advanced configuration options
- `enableKeyValidation`: Enable API key validation on save

## Troubleshooting

### Common Issues

1. **"API key must start with 'sk-or-'"**

   - Ensure you're using an OpenRouter API key, not OpenAI
   - Get your key from [OpenRouter Platform](https://openrouter.ai/keys)

2. **"API key appears to be too short"**

   - OpenRouter keys should be at least 26 characters
   - Check for any accidental truncation

3. **Plugin not appearing in Settings**

   - Ensure the plugin is properly installed
   - Check browser console for errors
   - Verify user permissions

4. **Models not available in chat**
   - Verify API key is saved and valid
   - Check if OpenRouter integration is enabled in chat module

### Debug Mode

Enable debug logging by setting:

```javascript
localStorage.setItem("openrouter-debug", "true");
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This plugin is part of BrainDrive and follows the same licensing terms.

## Support

For support:

1. Check the troubleshooting section above
2. Review BrainDrive documentation
3. Open an issue in the BrainDrive repository

## Changelog

### Version 1.0.0

- Initial release
- OpenRouter API key management
- Secure storage and validation
- Theme support and responsive design
