-- Script to fix OpenRouter plugin settings in the database
-- Run this script to update the existing settings definition or create a new one

-- First, check if the settings definition exists
SELECT * FROM settings_definitions WHERE id = 'openrouter_api_keys_settings';

-- Update the existing settings definition if it exists
UPDATE settings_definitions
SET 
    name = 'OpenRouter API Keys Settings',
    description = 'Configure OpenRouter API key for accessing various AI models from multiple providers',
    category = 'LLM Servers',
    type = 'object',
    default_value = '{"apiKey":"","enabled":true,"baseUrl":"https://openrouter.ai/api/v1","defaultModel":"openai/gpt-3.5-turbo","modelPreferences":{},"requestTimeout":30,"maxRetries":3}',
    allowed_scopes = '["user"]',
    validation = '{}',
    is_multiple = false,
    tags = '["openrouter_api_keys_settings","OpenRouter","API Keys","AI Models","settings"]',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'openrouter_api_keys_settings';

-- If the above UPDATE affected 0 rows, insert a new definition
INSERT INTO settings_definitions (
    id, name, description, category, type, default_value, 
    allowed_scopes, validation, is_multiple, tags, created_at, updated_at
)
SELECT 
    'openrouter_api_keys_settings',
    'OpenRouter API Keys Settings',
    'Configure OpenRouter API key for accessing various AI models from multiple providers',
    'LLM Servers',
    'object',
    '{"apiKey":"","enabled":true,"baseUrl":"https://openrouter.ai/api/v1","defaultModel":"openai/gpt-3.5-turbo","modelPreferences":{},"requestTimeout":30,"maxRetries":3}',
    '["user"]',
    '{}',
    false,
    '["openrouter_api_keys_settings","OpenRouter","API Keys","AI Models","settings"]',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM settings_definitions WHERE id = 'openrouter_api_keys_settings'
);

-- Check the component/module table for the plugin
SELECT * FROM component 
WHERE plugin_id IN (
    SELECT id FROM plugin WHERE plugin_slug = 'BrainDriveOpenRouter'
);

-- Update the component tags if needed (lowercase 'settings')
UPDATE component
SET tags = '["openrouter_api_keys_settings","OpenRouter","API Keys","AI Models","settings"]'
WHERE name = 'ComponentOpenRouterKeys'
AND plugin_id IN (
    SELECT id FROM plugin WHERE plugin_slug = 'BrainDriveOpenRouter'
);

-- Update the component category to 'LLM Servers'
UPDATE component
SET category = 'LLM Servers'
WHERE name = 'ComponentOpenRouterKeys'
AND plugin_id IN (
    SELECT id FROM plugin WHERE plugin_slug = 'BrainDriveOpenRouter'
);

-- Verify the changes
SELECT 'Settings Definition:' as info;
SELECT * FROM settings_definitions WHERE id = 'openrouter_api_keys_settings';

SELECT 'Plugin Component:' as info;
SELECT * FROM component 
WHERE plugin_id IN (
    SELECT id FROM plugin WHERE plugin_slug = 'BrainDriveOpenRouter'
);