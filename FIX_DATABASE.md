# Fix OpenRouter Plugin in Database

## The Problem
The OpenRouter plugin component in the database has "Settings" (capital S) in the tags, but the Settings page looks for "settings" (lowercase).

## Quick Fix SQL

Run this SQL to fix the existing OpenRouter component in the database:

```sql
-- Fix the tags in the component table for OpenRouter
UPDATE component
SET tags = '["settings", "openrouter_api_keys_settings", "OpenRouter", "API Keys", "AI Models"]'
WHERE id = 'c34bfc30de004813ad5b5d3a4ab9df34_BrainDriveOpenRouter_ComponentOpenRouterKeys';

-- Verify the update
SELECT id, name, tags FROM component 
WHERE id = 'c34bfc30de004813ad5b5d3a4ab9df34_BrainDriveOpenRouter_ComponentOpenRouterKeys';
```

## Why Ollama Works
Ollama has "Settings" (capital S) too, but there's a special case in the Settings.tsx code (lines 250-265) that specifically handles Ollama:

```javascript
if (setting.name.toLowerCase().includes('ollama')) {
    // Special case for Ollama servers settings
    const ollamaPlugin = plugins.find(p => 
        p.displayName.toLowerCase().includes('ollama')
    );
    if (ollamaPlugin) {
        active.push({
            ...ollamaPlugin,
            isActive: true,
        });
    }
}
```

## Permanent Fix
After running the SQL above, the OpenRouter plugin should appear in Settings. For a permanent fix:

1. Run the SQL above to fix the current database entry
2. For future installations, the lifecycle_manager.py already has the correct lowercase "settings" tag
3. Consider doing a full reinstall after backing up any existing settings

## Verification
After running the SQL, refresh the Settings page and check the console. You should see:
- "Available plugin: OpenRouter API Keys" in the console
- The plugin appearing under "LLM Servers" category in the UI