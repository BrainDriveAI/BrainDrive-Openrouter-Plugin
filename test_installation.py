#!/usr/bin/env python3
"""
Test script to verify OpenRouter plugin installation
Run this after installing the plugin to verify all components are correctly set up
"""

import sqlite3
import json
import sys
from pathlib import Path

def check_database_entries(db_path):
    """Check if all required database entries exist"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("=" * 60)
    print("CHECKING DATABASE ENTRIES")
    print("=" * 60)
    
    # Check plugin entry
    cursor.execute("""
        SELECT id, plugin_slug, name, enabled, category 
        FROM plugin 
        WHERE plugin_slug = 'BrainDriveOpenRouter'
    """)
    plugin = cursor.fetchone()
    
    if plugin:
        print("✅ Plugin found:")
        print(f"   ID: {plugin[0]}")
        print(f"   Slug: {plugin[1]}")
        print(f"   Name: {plugin[2]}")
        print(f"   Enabled: {plugin[3]}")
        print(f"   Category: {plugin[4]}")
    else:
        print("❌ Plugin NOT found in database")
        
    # Check module entry
    cursor.execute("""
        SELECT id, name, display_name, category, tags 
        FROM module 
        WHERE name = 'ComponentOpenRouterKeys'
    """)
    module = cursor.fetchone()
    
    if module:
        print("\n✅ Module found:")
        print(f"   ID: {module[0]}")
        print(f"   Name: {module[1]}")
        print(f"   Display Name: {module[2]}")
        print(f"   Category: {module[3]}")
        
        # Check tags
        tags = json.loads(module[4]) if module[4] else []
        print(f"   Tags: {tags}")
        
        # Verify lowercase 'settings' tag
        if 'settings' in tags:
            print("   ✅ Has lowercase 'settings' tag")
        elif 'Settings' in tags:
            print("   ⚠️  Has uppercase 'Settings' tag - needs to be lowercase")
        else:
            print("   ❌ Missing 'settings' tag")
    else:
        print("❌ Module NOT found in database")
    
    # Check settings definition
    cursor.execute("""
        SELECT id, name, category, default_value, tags 
        FROM settings_definitions 
        WHERE id = 'openrouter_api_keys_settings'
    """)
    definition = cursor.fetchone()
    
    if definition:
        print("\n✅ Settings Definition found:")
        print(f"   ID: {definition[0]}")
        print(f"   Name: {definition[1]}")
        print(f"   Category: {definition[2]}")
        
        # Check default_value
        try:
            default_val = json.loads(definition[3]) if definition[3] else {}
            print(f"   Default Value Keys: {list(default_val.keys())}")
        except:
            print(f"   ⚠️  Invalid JSON in default_value")
            
        # Check tags
        tags = json.loads(definition[4]) if definition[4] else []
        print(f"   Tags: {tags}")
    else:
        print("❌ Settings Definition NOT found in database")
    
    # Check settings instance
    cursor.execute("""
        SELECT id, name, definition_id, scope, user_id 
        FROM settings_instances 
        WHERE definition_id = 'openrouter_api_keys_settings'
    """)
    instances = cursor.fetchall()
    
    if instances:
        print(f"\n✅ Found {len(instances)} Settings Instance(s):")
        for inst in instances:
            print(f"   Instance ID: {inst[0]}")
            print(f"   Name: {inst[1]}")
            print(f"   Definition ID: {inst[2]}")
            print(f"   Scope: {inst[3]}")
            print(f"   User ID: {inst[4]}")
            print()
    else:
        print("❌ No Settings Instances found - THIS IS WHY IT WON'T SHOW IN SETTINGS PAGE")
    
    conn.close()
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    all_good = True
    
    if not plugin:
        print("❌ Missing: Plugin entry")
        all_good = False
    if not module:
        print("❌ Missing: Module entry")
        all_good = False
    elif 'settings' not in (json.loads(module[4]) if module[4] else []):
        print("⚠️  Issue: Module missing lowercase 'settings' tag")
        all_good = False
    if not definition:
        print("❌ Missing: Settings definition")
        all_good = False
    if not instances:
        print("❌ Missing: Settings instance (required for Settings page)")
        all_good = False
        
    if all_good:
        print("✅ All database entries look correct!")
        print("The plugin should appear in Settings under 'LLM Servers'")
    else:
        print("\n⚠️  Some issues found - see above for details")
        
    return all_good

if __name__ == "__main__":
    # Default database path
    db_path = "/home/hacker/BrainDriveDev/BrainDrive/backend/braindrive.db"
    
    if len(sys.argv) > 1:
        db_path = sys.argv[1]
    
    if not Path(db_path).exists():
        print(f"❌ Database not found at: {db_path}")
        print(f"Usage: {sys.argv[0]} [path_to_database]")
        sys.exit(1)
    
    print(f"Checking database: {db_path}\n")
    success = check_database_entries(db_path)
    
    sys.exit(0 if success else 1)