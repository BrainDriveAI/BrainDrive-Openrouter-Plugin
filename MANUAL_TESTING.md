# Manual Testing for OpenRouter Plugin Settings

## SQL Statement to Manually Insert Settings Definition

Use this SQL statement to manually insert a settings definition row for testing:

```sql
-- Manual INSERT statement to add OpenRouter settings definition
INSERT INTO settings_definitions (
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
    false,
    '["openrouter_api_keys_settings","OpenRouter","API Keys","AI Models","settings"]',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
```

## Verification Query

After inserting, verify the entry exists:

```sql
SELECT * FROM settings_definitions WHERE id = 'openrouter_api_keys_settings';
```

## Expected Result

After inserting this settings definition:
1. The Settings page should detect a plugin with the tag "settings" (lowercase)
2. It should appear under the "LLM Servers" category
3. The setting name tag should be "openrouter_api_keys_settings"

## Important Notes

- The `tags` field must include "settings" (lowercase) for the Settings page to detect it
- The `category` is set to "LLM Servers" as requested
- The `default_value` is a properly formatted JSON object with OpenRouter-specific settings
- The `allowed_scopes` includes "user" scope

## Testing Without Full Plugin Installation

This manual insert allows you to test if:
1. The Settings page can find and display the plugin
2. The category grouping works correctly
3. The settings detection logic is working

Even without the full plugin installed, this should make the OpenRouter settings appear in the Settings page if the detection logic is working correctly.

## Cleanup

To remove the test entry:

```sql
DELETE FROM settings_definitions WHERE id = 'openrouter_api_keys_settings';