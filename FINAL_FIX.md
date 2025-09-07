# Final Fix for OpenRouter Plugin in Settings

## The Real Issue
The OpenRouter plugin IS being detected (line 11 in log), but it's not being activated because there's no `settings_instances` entry in the database for it.

## The Solution - Create Settings Instance

You need to create a settings instance for OpenRouter. Run this SQL:

```sql
-- First, ensure the settings definition exists
INSERT OR REPLACE INTO settings_definitions (
    id, 
    name, 
    description, 
    category, 
    type, 
    default_value, 
    allowed_scopes, 
    validation, 
    is_multiple, 
    tags, 
    created_at, 
    updated_at
) VALUES (
    'openrouter_api_keys_settings',
    'OpenRouter API Keys Settings',
    'Configure OpenRouter API key for accessing various AI models from multiple providers',
    'LLM Servers',
    'object',
    '{"apiKey":"","enabled":true,"baseUrl":"https://openrouter.ai/api/v1","defaultModel":"openai/gpt-3.5-turbo","modelPreferences":{},"requestTimeout":30,"maxRetries":3}',
    '["user"]',
    '{}',
    0,
    '["openrouter_api_keys_settings","OpenRouter","API Keys","AI Models","settings"]',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Now create the settings instance (THIS IS THE MISSING PIECE!)
INSERT OR REPLACE INTO settings_instances (
    id,
    definition_id,
    name,
    value,
    scope,
    user_id,
    created_at,
    updated_at
) VALUES (
    'openrouter_settings_c34bfc30de004813ad5b5d3a4ab9df34',
    'openrouter_api_keys_settings',
    'OpenRouter API Keys Settings',  -- Changed to match what Ollama uses
    '{"apiKey":"","enabled":true,"baseUrl":"https://openrouter.ai/api/v1","defaultModel":"openai/gpt-3.5-turbo","modelPreferences":{},"requestTimeout":30,"maxRetries":3}',
    'user',
    'c34bfc30de004813ad5b5d3a4ab9df34',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Also fix the module tags (use lowercase 'settings')
UPDATE module
SET tags = '["settings", "openrouter_api_keys_settings", "OpenRouter", "API Keys", "AI Models"]'
WHERE id = 'c34bfc30de004813ad5b5d3a4ab9df34_BrainDriveOpenRouter_ComponentOpenRouterKeys';
```

## Why Ollama Works
Looking at the log, Ollama has:
1. A module with tags (even with capital "Settings")
2. A settings_instances entry with `definition_id: ollama_servers_settings`
3. Special handling in the code (lines 17-19)

## What OpenRouter Needs
1. ✅ Module exists (already there)
2. ❌ Settings instance (MISSING - this is why it's not activated)
3. ✅ Plugin is detected as available

## After Running the SQL
The Settings page should show:
- "Checking setting: OpenRouter API Keys Settings, definition_id: openrouter_api_keys_settings"
- "Activating plugin: OpenRouter API Keys for setting: OpenRouter API Keys Settings"
- The plugin will appear under "LLM Servers" category

## Verification
After running the SQL, check:
```sql
-- Verify settings instance exists
SELECT * FROM settings_instances WHERE definition_id = 'openrouter_api_keys_settings';

-- Verify module tags are lowercase
SELECT id, tags FROM module WHERE id = 'c34bfc30de004813ad5b5d3a4ab9df34_BrainDriveOpenRouter_ComponentOpenRouterKeys';