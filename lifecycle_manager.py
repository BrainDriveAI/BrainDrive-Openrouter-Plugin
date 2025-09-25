#!/usr/bin/env python3
"""
BrainDrive OpenRouter Plugin Lifecycle Manager (New Architecture)

This script handles install/update/delete operations for the BrainDrive OpenRouter plugin
using the new multi-user plugin lifecycle management architecture.
"""

import asyncio
import datetime
import json
import os
import shutil
from pathlib import Path
from typing import Dict, Any, List

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

logger = structlog.get_logger()

# Import the new base lifecycle manager
try:
    # Try to import from the BrainDrive system first (when running in production)
    from app.plugins.base_lifecycle_manager import BaseLifecycleManager
    logger.info("Using new architecture: BaseLifecycleManager imported from app.plugins")
except ImportError:
    try:
        # Try local import for development
        import sys
        current_dir = os.path.dirname(os.path.abspath(__file__))
        backend_path = os.path.join(current_dir, "..", "..", "backend", "app", "plugins")
        backend_path = os.path.abspath(backend_path)

        if os.path.exists(backend_path):
            if backend_path not in sys.path:
                sys.path.insert(0, backend_path)
            from base_lifecycle_manager import BaseLifecycleManager
            logger.info(f"Using new architecture: BaseLifecycleManager imported from local backend: {backend_path}")
        else:
            # For remote installation, the base class might not be available
            # In this case, we'll create a minimal implementation
            logger.warning(f"BaseLifecycleManager not found at {backend_path}, using minimal implementation")
            from abc import ABC, abstractmethod
            from typing import Set

            class BaseLifecycleManager(ABC):
                """Minimal base class for remote installations"""
                def __init__(self, plugin_slug: str, version: str, shared_storage_path: Path):
                    self.plugin_slug = plugin_slug
                    self.version = version
                    self.shared_path = shared_storage_path
                    self.active_users: Set[str] = set()
                    self.instance_id = f"{plugin_slug}_{version}"
                    self.created_at = datetime.datetime.now()
                    self.last_used = datetime.datetime.now()

                async def install_for_user(self, user_id: str, db, shared_plugin_path: Path):
                    if user_id in self.active_users:
                        return {'success': False, 'error': 'Plugin already installed for user'}
                    result = await self._perform_user_installation(user_id, db, shared_plugin_path)
                    if result['success']:
                        self.active_users.add(user_id)
                        self.last_used = datetime.datetime.now()
                    return result

                async def uninstall_for_user(self, user_id: str, db):
                    if user_id not in self.active_users:
                        return {'success': False, 'error': 'Plugin not installed for user'}
                    result = await self._perform_user_uninstallation(user_id, db)
                    if result['success']:
                        self.active_users.discard(user_id)
                        self.last_used = datetime.datetime.now()
                    return result

                @abstractmethod
                async def get_plugin_metadata(self):
                    pass

                @abstractmethod
                async def get_module_metadata(self):
                    pass

                @abstractmethod
                async def _perform_user_installation(self, user_id, db, shared_plugin_path):
                    pass

                @abstractmethod
                async def _perform_user_uninstallation(self, user_id, db):
                    pass

            logger.info("Using minimal BaseLifecycleManager implementation for remote installation")

    except ImportError as e:
        logger.error(f"Failed to import BaseLifecycleManager: {e}")
        raise ImportError("BrainDrive OpenRouter plugin requires the new architecture BaseLifecycleManager")


class BrainDriveOpenRouterLifecycleManager(BaseLifecycleManager):
    """Lifecycle manager for BrainDrive OpenRouter plugin using new architecture"""

    def __init__(self, plugins_base_dir: str = None):
        """Initialize the lifecycle manager"""
        # Define plugin-specific data
        self.plugin_data = {
            "name": "BrainDrive OpenRouter",
            "description": "OpenRouter API Key Management Plugin for accessing various AI models from multiple providers",
            "version": "1.0.1",
            "type": "frontend",
            "icon": "Key",
            "category": "LLM Servers",
            "official": True,
            "author": "BrainDrive Team",
            "compatibility": "1.0.0",
            "scope": "BrainDriveOpenRouter",
            "bundle_method": "webpack",
            "bundle_location": "dist/remoteEntry.js",
            "is_local": False,
            "long_description": "A comprehensive plugin for managing OpenRouter API keys and accessing AI models from multiple providers. Provides secure storage and management of API keys with easy integration for AI-powered features.",
            "plugin_slug": "BrainDriveOpenRouter",
            # Update tracking fields (matching plugin model)
            "source_type": "github",
            "source_url": "https://github.com/BrainDriveAI/BrainDrive-Openrouter-Plugin",
            "update_check_url": "https://github.com/BrainDriveAI/BrainDrive-Openrouter-Plugin/releases/latest",
            "last_update_check": None,
            "update_available": False,
            "latest_version": None,
            "installation_type": "remote",
            "permissions": ["storage.read", "storage.write", "api.access", "settings.read", "settings.write"]
        }

        # Define module data
        self.module_data = [
            {
                "name": "ComponentOpenRouterKeys",
                "display_name": "OpenRouter API Keys",
                "description": "Configure OpenRouter API key for accessing various AI models from multiple providers",
                "icon": "Key",
                "category": "LLM Servers",
                "priority": 1,
                "props": {
                    "title": "OpenRouter API Keys",
                    "description": "Manage your OpenRouter API keys securely",
                    "config": {
                        "showAdvancedOptions": False,
                        "enableKeyValidation": True
                    }
                },
                "config_fields": {
                    "title": {
                        "type": "text",
                        "description": "Component title",
                        "default": "OpenRouter API Keys"
                    },
                    "description": {
                        "type": "text",
                        "description": "Component description",
                        "default": "Manage your OpenRouter API keys securely"
                    },
                    "show_advanced_options": {
                        "type": "boolean",
                        "description": "Show advanced configuration options",
                        "default": False
                    },
                    "enable_key_validation": {
                        "type": "boolean",
                        "description": "Enable API key validation on save",
                        "default": True
                    }
                },
                "messages": {
                    "sends": ["openrouter_key_updated", "openrouter_key_validated"],
                    "receives": ["settings_changed", "theme_changed"]
                },
                "required_services": {
                    "api": {"methods": ["get", "post", "put", "delete"], "version": "1.0.0"},
                    "theme": {"methods": ["getCurrentTheme", "addThemeChangeListener", "removeThemeChangeListener"], "version": "1.0.0"},
                    "settings": {"methods": ["getSetting", "setSetting", "getSettingDefinitions"], "version": "1.0.0"},
                    "event": {"methods": ["sendMessage", "subscribeToMessages", "unsubscribeFromMessages"], "version": "1.0.0"}
                },
                "dependencies": [],
                "layout": {
                    "minWidth": 6,
                    "minHeight": 3,
                    "defaultWidth": 8,
                    "defaultHeight": 4
                },
                "tags": ["settings","openrouter_api_keys_settings", "OpenRouter", "API Keys", "AI Models"]
            }
        ]

        # Initialize base class with required parameters
        logger.info(f"BrainDrive OpenRouter: plugins_base_dir - {plugins_base_dir}")
        if plugins_base_dir:
            # When instantiated by the remote installer, plugins_base_dir points to the plugins directory
            # Shared plugins are stored under plugins_base_dir/shared/plugin_slug/version
            shared_path = Path(plugins_base_dir) / "shared" / self.plugin_data['plugin_slug'] / f"v{self.plugin_data['version']}"
        else:
            # When running from the BrainDriveOpenRouter directory during development,
            # resolve the path to backend/plugins/shared
            # Fix: Use absolute path resolution to avoid double nesting
            current_file = Path(__file__).resolve()
            # Navigate up to find the backend directory
            backend_dir = current_file
            while backend_dir.name != 'backend' and backend_dir.parent != backend_dir:
                backend_dir = backend_dir.parent
                if backend_dir.name == 'BrainDrive':
                    backend_dir = backend_dir / 'backend'
                    break
            
            if backend_dir.name == 'backend':
                shared_path = backend_dir / "plugins" / "shared" / self.plugin_data['plugin_slug'] / f"v{self.plugin_data['version']}"
            else:
                # Fallback to relative path from current file
                shared_path = Path(__file__).parent.parent.parent / "backend" / "plugins" / "shared" / self.plugin_data['plugin_slug'] / f"v{self.plugin_data['version']}"
        
        logger.info(f"BrainDrive OpenRouter: shared_path - {shared_path}")
        super().__init__(
            plugin_slug=self.plugin_data['plugin_slug'],
            version=self.plugin_data['version'],
            shared_storage_path=shared_path
        )

    @property
    def PLUGIN_DATA(self):
        """Compatibility property for remote installer validation"""
        return self.plugin_data

    async def get_plugin_metadata(self) -> Dict[str, Any]:
        """Return plugin metadata and configuration"""
        return self.plugin_data

    async def get_module_metadata(self) -> List[Dict[str, Any]]:
        """Return module definitions for this plugin"""
        return self.module_data

    async def _perform_user_installation(self, user_id: str, db: AsyncSession, shared_plugin_path: Path) -> Dict[str, Any]:
        """Perform user-specific installation using shared plugin path"""
        try:
            # Create database records for this user
            db_result = await self._create_database_records(user_id, db)
            if not db_result['success']:
                return db_result

            # Create settings definition and instance
            settings_result = await self._create_settings(user_id, db)
            if not settings_result['success']:
                return settings_result

            # Commit all database changes
            try:
                await db.commit()
                logger.info(f"BrainDrive OpenRouter: Database changes committed successfully")
            except Exception as commit_error:
                logger.error(f"BrainDrive OpenRouter: Failed to commit database changes: {commit_error}")
                await db.rollback()
                return {'success': False, 'error': f'Failed to commit database changes: {str(commit_error)}'}

            logger.info(f"BrainDrive OpenRouter: User installation completed for {user_id}")
            return {
                'success': True,
                'plugin_id': db_result['plugin_id'],
                'plugin_slug': self.plugin_data['plugin_slug'],
                'plugin_name': self.plugin_data['name'],
                'modules_created': db_result['modules_created'],
                'settings_created': settings_result['settings_created']
            }

        except Exception as e:
            logger.error(f"BrainDrive OpenRouter: User installation failed for {user_id}: {e}")
            return {'success': False, 'error': str(e)}

    async def _perform_user_uninstallation(self, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Perform user-specific uninstallation"""
        try:
            # Check if plugin exists for user
            existing_check = await self._check_existing_plugin(user_id, db)
            if not existing_check['exists']:
                return {'success': False, 'error': 'Plugin not found for user'}

            plugin_id = existing_check['plugin_id']

            # Delete database records
            delete_result = await self._delete_database_records(user_id, plugin_id, db)
            if not delete_result['success']:
                return delete_result

            # Remove settings instance
            settings_result = await self._remove_settings(user_id, db)

            # Commit all database changes
            try:
                await db.commit()
                logger.info(f"BrainDrive OpenRouter: Uninstall changes committed successfully")
            except Exception as commit_error:
                logger.error(f"BrainDrive OpenRouter: Failed to commit uninstall changes: {commit_error}")
                await db.rollback()
                return {'success': False, 'error': f'Failed to commit uninstall changes: {str(commit_error)}'}

            logger.info(f"BrainDrive OpenRouter: User uninstallation completed for {user_id}")
            return {
                'success': True,
                'plugin_id': plugin_id,
                'deleted_modules': delete_result['deleted_modules'],
                'settings_removed': settings_result.get('settings_removed', 0)
            }

        except Exception as e:
            logger.error(f"BrainDrive OpenRouter: User uninstallation failed for {user_id}: {e}")
            return {'success': False, 'error': str(e)}

    async def _copy_plugin_files_impl(self, user_id: str, target_dir: Path, update: bool = False) -> Dict[str, Any]:
        """
        BrainDrive OpenRouter-specific implementation of file copying.
        This method is called by the base class during installation.
        """
        try:
            source_dir = Path(__file__).parent
            copied_files = []

            # Define files and directories to exclude
            exclude_patterns = {
                'node_modules',
                'package-lock.json',
                '.git',
                '.gitignore',
                '__pycache__',
                '*.pyc',
                '.DS_Store',
                'Thumbs.db'
            }

            def should_copy(path: Path) -> bool:
                """Check if a file/directory should be copied"""
                for part in path.parts:
                    if part in exclude_patterns:
                        return False
                for pattern in exclude_patterns:
                    if '*' in pattern and path.name.endswith(pattern.replace('*', '')):
                        return False
                return True

            # Copy all files and directories recursively
            for item in source_dir.rglob('*'):
                if item.name == 'lifecycle_manager.py' and item == Path(__file__):
                    continue
                    
                relative_path = item.relative_to(source_dir)
                
                if not should_copy(relative_path):
                    continue
                
                target_path = target_dir / relative_path
                
                try:
                    if item.is_file():
                        target_path.parent.mkdir(parents=True, exist_ok=True)
                        
                        if update and target_path.exists():
                            target_path.unlink()
                        shutil.copy2(item, target_path)
                        copied_files.append(str(relative_path))
                        logger.debug(f"Copied file: {relative_path}")
                        
                    elif item.is_dir():
                        target_path.mkdir(parents=True, exist_ok=True)
                        logger.debug(f"Created directory: {relative_path}")
                        
                except Exception as e:
                    logger.warning(f"Failed to copy {relative_path}: {e}")
                    continue
            
            # Copy the lifecycle_manager.py file itself
            lifecycle_manager_source = source_dir / 'lifecycle_manager.py'
            lifecycle_manager_target = target_dir / 'lifecycle_manager.py'
            if lifecycle_manager_source.exists():
                lifecycle_manager_target.parent.mkdir(parents=True, exist_ok=True)
                if update and lifecycle_manager_target.exists():
                    lifecycle_manager_target.unlink()
                shutil.copy2(lifecycle_manager_source, lifecycle_manager_target)
                copied_files.append('lifecycle_manager.py')
                logger.info(f"Copied lifecycle_manager.py")
            
            logger.info(f"BrainDrive OpenRouter: Copied {len(copied_files)} files/directories to {target_dir}")
            return {'success': True, 'copied_files': copied_files}

        except Exception as e:
            logger.error(f"BrainDrive OpenRouter: Error copying plugin files: {e}")
            return {'success': False, 'error': str(e)}

    async def _validate_installation_impl(self, user_id: str, plugin_dir: Path) -> Dict[str, Any]:
        """
        BrainDrive OpenRouter-specific validation logic.
        """
        try:
            # Check for required files
            required_files = ["package.json", "dist/remoteEntry.js"]
            missing_files = []
            
            for file_path in required_files:
                if not (plugin_dir / file_path).exists():
                    missing_files.append(file_path)
            
            if missing_files:
                return {
                    'valid': False,
                    'error': f"BrainDrive OpenRouter: Missing required files: {', '.join(missing_files)}"
                }
            
            # Validate package.json structure
            package_json_path = plugin_dir / "package.json"
            try:
                with open(package_json_path, 'r') as f:
                    package_data = json.load(f)
                
                required_fields = ["name", "version"]
                for field in required_fields:
                    if field not in package_data:
                        return {
                            'valid': False,
                            'error': f'BrainDrive OpenRouter: package.json missing required field: {field}'
                        }
                        
            except (json.JSONDecodeError, FileNotFoundError) as e:
                return {
                    'valid': False,
                    'error': f'BrainDrive OpenRouter: Invalid or missing package.json: {e}'
                }
            
            # Validate bundle file exists and is not empty
            bundle_path = plugin_dir / "dist" / "remoteEntry.js"
            if bundle_path.stat().st_size == 0:
                return {
                    'valid': False,
                    'error': 'BrainDrive OpenRouter: Bundle file (remoteEntry.js) is empty'
                }
            
            logger.info(f"BrainDrive OpenRouter: Installation validation passed for user {user_id}")
            return {'valid': True}
            
        except Exception as e:
            logger.error(f"BrainDrive OpenRouter: Error validating installation: {e}")
            return {'valid': False, 'error': str(e)}

    async def _get_plugin_health_impl(self, user_id: str, plugin_dir: Path) -> Dict[str, Any]:
        """
        BrainDrive OpenRouter-specific health check logic.
        """
        try:
            health_info = {
                'bundle_exists': False,
                'bundle_size': 0,
                'package_json_valid': False,
                'assets_present': False
            }
            
            # Check bundle file
            bundle_path = plugin_dir / "dist" / "remoteEntry.js"
            if bundle_path.exists():
                health_info['bundle_exists'] = True
                health_info['bundle_size'] = bundle_path.stat().st_size
            
            # Check package.json
            package_json_path = plugin_dir / "package.json"
            if package_json_path.exists():
                try:
                    with open(package_json_path, 'r') as f:
                        json.load(f)
                    health_info['package_json_valid'] = True
                except json.JSONDecodeError:
                    pass
            
            # Check for assets directory
            assets_path = plugin_dir / "assets"
            if assets_path.exists() and assets_path.is_dir():
                health_info['assets_present'] = True
            
            # Determine overall health
            is_healthy = (
                health_info['bundle_exists'] and 
                health_info['bundle_size'] > 0 and
                health_info['package_json_valid']
            )

            return {
                'healthy': is_healthy,
                'details': health_info
            }

        except Exception as e:
            logger.error(f"BrainDrive OpenRouter: Error checking plugin health: {e}")
            return {
                'healthy': False,
                'details': {'error': str(e)}
            }

    async def _check_existing_plugin(self, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Check if plugin already exists for user"""
        try:
            plugin_slug = self.plugin_data['plugin_slug']
            logger.info(f"BrainDrive OpenRouter: Checking for existing plugin - user_id: {user_id}, plugin_slug: {plugin_slug}")
            
            plugin_query = text("""
            SELECT id, name, version, enabled, created_at, updated_at, plugin_slug
            FROM plugin
            WHERE user_id = :user_id AND plugin_slug = :plugin_slug
            """)
            
            query_params = {
                'user_id': user_id,
                'plugin_slug': plugin_slug
            }
            
            result = await db.execute(plugin_query, query_params)
            plugin_row = result.fetchone()
            
            if plugin_row:
                logger.info(f"BrainDrive OpenRouter: Found existing plugin - id: {plugin_row.id}, name: {plugin_row.name}")
                return {
                    'exists': True,
                    'plugin_id': plugin_row.id,
                    'plugin_info': {
                        'id': plugin_row.id,
                        'name': plugin_row.name,
                        'version': plugin_row.version,
                        'enabled': plugin_row.enabled,
                        'created_at': plugin_row.created_at,
                        'updated_at': plugin_row.updated_at
                    }
                }
            else:
                logger.info(f"BrainDrive OpenRouter: No plugin found for user_id: {user_id}, plugin_slug: {plugin_slug}")
                return {'exists': False}

        except Exception as e:
            logger.error(f"BrainDrive OpenRouter: Error checking existing plugin: {e}")
            return {'exists': False, 'error': str(e)}

    async def _create_database_records(self, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Create plugin and module records in database"""
        try:
            current_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            plugin_slug = self.plugin_data['plugin_slug']
            plugin_id = f"{user_id}_{plugin_slug}"
            
            logger.info(f"BrainDrive OpenRouter: Creating database records - user_id: {user_id}, plugin_slug: {plugin_slug}, plugin_id: {plugin_id}")
            
            plugin_stmt = text("""
            INSERT INTO plugin
            (id, name, description, version, type, enabled, icon, category, status,
            official, author, last_updated, compatibility, downloads, scope,
            bundle_method, bundle_location, is_local, long_description,
            config_fields, messages, dependencies, created_at, updated_at, user_id,
            plugin_slug, source_type, source_url, update_check_url, last_update_check,
            update_available, latest_version, installation_type, permissions)
            VALUES
            (:id, :name, :description, :version, :type, :enabled, :icon, :category,
            :status, :official, :author, :last_updated, :compatibility, :downloads,
            :scope, :bundle_method, :bundle_location, :is_local, :long_description,
            :config_fields, :messages, :dependencies, :created_at, :updated_at, :user_id,
            :plugin_slug, :source_type, :source_url, :update_check_url, :last_update_check,
            :update_available, :latest_version, :installation_type, :permissions)
            """)

            await db.execute(plugin_stmt, {
                'id': plugin_id,
                'name': self.plugin_data['name'],
                'description': self.plugin_data['description'],
                'version': self.plugin_data['version'],
                'type': self.plugin_data['type'],
                'enabled': True,
                'icon': self.plugin_data['icon'],
                'category': self.plugin_data['category'],
                'status': 'activated',
                'official': self.plugin_data['official'],
                'author': self.plugin_data['author'],
                'last_updated': current_time,
                'compatibility': self.plugin_data['compatibility'],
                'downloads': 0,
                'scope': self.plugin_data['scope'],
                'bundle_method': self.plugin_data['bundle_method'],
                'bundle_location': self.plugin_data['bundle_location'],
                'is_local': self.plugin_data['is_local'],
                'long_description': self.plugin_data['long_description'],
                'config_fields': json.dumps({}),
                'messages': None,
                'dependencies': None,
                'created_at': current_time,
                'updated_at': current_time,
                'user_id': user_id,
                'plugin_slug': plugin_slug,
                'source_type': self.plugin_data['source_type'],
                'source_url': self.plugin_data['source_url'],
                'update_check_url': self.plugin_data['update_check_url'],
                'last_update_check': self.plugin_data['last_update_check'],
                'update_available': self.plugin_data['update_available'],
                'latest_version': self.plugin_data['latest_version'],
                'installation_type': self.plugin_data['installation_type'],
                'permissions': json.dumps(self.plugin_data['permissions'])
            })

            modules_created = []
            for module_data in self.module_data:
                module_id = f"{user_id}_{plugin_slug}_{module_data['name']}"
                
                module_stmt = text("""
                INSERT INTO module
                (id, plugin_id, name, display_name, description, icon, category,
                enabled, priority, props, config_fields, messages, required_services,
                dependencies, layout, tags, created_at, updated_at, user_id)
                VALUES
                (:id, :plugin_id, :name, :display_name, :description, :icon, :category,
                :enabled, :priority, :props, :config_fields, :messages, :required_services,
                :dependencies, :layout, :tags, :created_at, :updated_at, :user_id)
                """)

                await db.execute(module_stmt, {
                    'id': module_id,
                    'plugin_id': plugin_id,
                    'name': module_data['name'],
                    'display_name': module_data['display_name'],
                    'description': module_data['description'],
                    'icon': module_data['icon'],
                    'category': module_data['category'],
                    'enabled': True,
                    'priority': module_data['priority'],
                    'props': json.dumps(module_data['props']),
                    'config_fields': json.dumps(module_data['config_fields']),
                    'messages': json.dumps(module_data['messages']),
                    'required_services': json.dumps(module_data['required_services']),
                    'dependencies': json.dumps(module_data['dependencies']),
                    'layout': json.dumps(module_data['layout']),
                    'tags': json.dumps(module_data['tags']),
                    'created_at': current_time,
                    'updated_at': current_time,
                    'user_id': user_id
                })
                
                modules_created.append(module_id)
            
            await db.commit()
            logger.info(f"BrainDrive OpenRouter: Database transaction committed successfully")

            return {'success': True, 'plugin_id': plugin_id, 'modules_created': modules_created}

        except Exception as e:
            logger.error(f"Error creating database records: {e}")
            await db.rollback()
            return {'success': False, 'error': str(e)}

    async def _delete_database_records(self, user_id: str, plugin_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Delete plugin and module records from database"""
        try:
            # Delete modules first (foreign key constraint)
            module_delete_stmt = text("""
            DELETE FROM module 
            WHERE plugin_id = :plugin_id AND user_id = :user_id
            """)
            
            module_result = await db.execute(module_delete_stmt, {
                'plugin_id': plugin_id,
                'user_id': user_id
            })
            
            deleted_modules = module_result.rowcount

            # Delete plugin
            plugin_delete_stmt = text("""
            DELETE FROM plugin 
            WHERE id = :plugin_id AND user_id = :user_id
            """)
            
            plugin_result = await db.execute(plugin_delete_stmt, {
                'plugin_id': plugin_id,
                'user_id': user_id
            })
            
            if plugin_result.rowcount == 0:
                await db.rollback()
                return {'success': False, 'error': 'Plugin not found or not owned by user'}
            
            await db.commit()
            
            logger.info(f"Deleted database records for plugin {plugin_id} ({deleted_modules} modules)")
            return {'success': True, 'deleted_modules': deleted_modules}

        except Exception as e:
            logger.error(f"Error deleting database records: {e}")
            await db.rollback()
            return {'success': False, 'error': str(e)}

    async def _create_settings(self, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Create settings definition and instance"""
        try:
            logger.info(f"Starting settings creation for user {user_id}")
            
            # Check if settings definition exists
            definition = await db.execute(
                text("SELECT id FROM settings_definitions WHERE id = :definition_id"),
                {"definition_id": "openrouter_api_keys_settings"}
            )
            definition = definition.scalar_one_or_none()

            # Create settings definition if it doesn't exist
            if not definition:
                logger.info("Settings definition not found, creating new one")
                definition_data = {
                    'id': 'openrouter_api_keys_settings',
                    'name': 'OpenRouter API Keys Settings',
                    'description': 'Configure OpenRouter API key for accessing various AI models from multiple providers',
                    'category': 'LLM Servers',
                    'type': 'object',
                    'default_value': json.dumps({
                        "apiKey": "",
                        "enabled": True,
                        "baseUrl": "https://openrouter.ai/api/v1",
                        "defaultModel": "openai/gpt-3.5-turbo",
                        "modelPreferences": {},
                        "requestTimeout": 30,
                        "maxRetries": 3
                    }),
                    'allowed_scopes': json.dumps(['user']),
                    'validation': json.dumps({}),
                    'is_multiple': False,
                    'tags': json.dumps(['openrouter_api_keys_settings', 'OpenRouter', 'API Keys', 'AI Models', 'settings']),
                    'created_at': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    'updated_at': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
                
                definition_stmt = text("""
                INSERT INTO settings_definitions
                (id, name, description, category, type, default_value, allowed_scopes, validation, is_multiple, tags, created_at, updated_at)
                VALUES
                (:id, :name, :description, :category, :type, :default_value, :allowed_scopes, :validation, :is_multiple, :tags, :created_at, :updated_at)
                """)
                
                try:
                    await db.execute(definition_stmt, definition_data)
                    logger.info("Successfully created settings definition")
                except Exception as def_error:
                    logger.error(f"Failed to create settings definition: {def_error}")
                    # Try to continue anyway in case it's a duplicate key error
            else:
                logger.info("Settings definition already exists")

            # Create settings instance for user
            # Check if instance already exists
            existing_instance = await db.execute(
                text("SELECT id FROM settings_instances WHERE definition_id = :definition_id AND user_id = :user_id"),
                {"definition_id": "openrouter_api_keys_settings", "user_id": user_id}
            )
            existing_instance = existing_instance.scalar_one_or_none()
            
            if not existing_instance:
                instance_data = {
                    'id': f"openrouter_settings_{user_id}",
                    'name': 'OpenRouter API Keys Settings',  # Match the name format that Settings page expects
                    'definition_id': 'openrouter_api_keys_settings',
                    'scope': 'user',
                    'user_id': user_id,
                    'value': json.dumps({
                        "apiKey": "",
                        "enabled": True,
                        "baseUrl": "https://openrouter.ai/api/v1",
                        "defaultModel": "openai/gpt-3.5-turbo",
                        "modelPreferences": {},
                        "requestTimeout": 30,
                        "maxRetries": 3
                    }),
                    'created_at': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    'updated_at': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
                
                instance_stmt = text("""
                INSERT INTO settings_instances
                (id, name, definition_id, scope, user_id, value, created_at, updated_at)
                VALUES
                (:id, :name, :definition_id, :scope, :user_id, :value, :created_at, :updated_at)
                """)
                
                try:
                    await db.execute(instance_stmt, instance_data)
                    logger.info(f"Successfully created settings instance for user {user_id}")
                except Exception as inst_error:
                    logger.error(f"Failed to create settings instance: {inst_error}")
                    return {'success': False, 'error': f'Failed to create settings instance: {str(inst_error)}'}
            else:
                logger.info(f"Settings instance already exists for user {user_id}")

            logger.info(f"Settings creation completed successfully for user {user_id}")
            return {
                'success': True,
                'settings_created': ['openrouter_api_keys_settings', f"openrouter_settings_{user_id}"]
            }

        except Exception as e:
            logger.error(f"Failed to create settings: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {'success': False, 'error': str(e)}

    async def _remove_settings(self, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Remove settings instance for user"""
        try:
            # Remove settings instance
            settings_instance = await db.execute(
                text("SELECT id FROM settings_instances WHERE definition_id = :definition_id AND user_id = :user_id"),
                {"definition_id": "openrouter_api_keys_settings", "user_id": user_id}
            )
            settings_instance = settings_instance.scalar_one_or_none()
            
            if settings_instance:
                delete_stmt = text("""
                DELETE FROM settings_instances 
                WHERE definition_id = :definition_id AND user_id = :user_id
                """)
                
                await db.execute(delete_stmt, {
                    'definition_id': 'openrouter_api_keys_settings',
                    'user_id': user_id
                })
                
                return {'success': True, 'settings_removed': 1}
            
            return {'success': True, 'settings_removed': 0}

        except Exception as e:
            logger.error(f"Failed to remove settings: {e}")
            return {'success': False, 'error': str(e)}

    # Compatibility methods for old interface
    async def install_plugin(self, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Install BrainDrive OpenRouter plugin for specific user (compatibility method)"""
        try:
            logger.info(f"BrainDrive OpenRouter: Starting installation for user {user_id}")

            # Check if plugin is already installed for this user
            existing_check = await self._check_existing_plugin(user_id, db)
            if existing_check['exists']:
                logger.warning(f"BrainDrive OpenRouter: Plugin already installed for user {user_id}")
                return {
                    'success': False,
                    'error': 'Plugin already installed for user',
                    'plugin_id': existing_check['plugin_id']
                }

            shared_path = self.shared_path
            shared_path.mkdir(parents=True, exist_ok=True)
            logger.info(f"BrainDrive OpenRouter: Created shared directory: {shared_path}")

            # Copy plugin files to the shared directory first
            copy_result = await self._copy_plugin_files_impl(user_id, shared_path)
            if not copy_result['success']:
                logger.error(f"BrainDrive OpenRouter: File copying failed: {copy_result.get('error')}")
                return copy_result

            logger.info(f"BrainDrive OpenRouter: Files copied successfully, proceeding with database installation")
            
            # Ensure we're in a transaction
            try:
                result = await self.install_for_user(user_id, db, shared_path)

                if result.get('success'):
                    # Verify the installation was successful
                    verify_check = await self._check_existing_plugin(user_id, db)
                    if not verify_check['exists']:
                        logger.error(f"BrainDrive OpenRouter: Installation appeared successful but verification failed")
                        return {'success': False, 'error': 'Installation verification failed'}
                    
                    logger.info(f"BrainDrive OpenRouter: Installation verified successfully for user {user_id}")
                    result.update({
                        'plugin_slug': self.plugin_data['plugin_slug'],
                        'plugin_name': self.plugin_data['name']
                    })
                else:
                    logger.error(f"BrainDrive OpenRouter: Database installation failed: {result.get('error')}")
                
                return result
                
            except Exception as db_error:
                logger.error(f"BrainDrive OpenRouter: Database operation failed: {db_error}")
                try:
                    await db.rollback()
                except:
                    pass
                return {'success': False, 'error': f'Database operation failed: {str(db_error)}'}

        except Exception as e:
            logger.error(f"BrainDrive OpenRouter: Install plugin failed: {e}")
            return {'success': False, 'error': str(e)}

    async def uninstall_plugin(self, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Uninstall BrainDrive OpenRouter plugin for user (compatibility method)"""
        try:
            logger.info(f"BrainDrive OpenRouter: Starting deletion for user {user_id}")

            result = await self.uninstall_for_user(user_id, db)

            if result.get('success'):
                logger.info(f"BrainDrive OpenRouter: Successfully deleted plugin for user {user_id}")
            else:
                logger.error(f"BrainDrive OpenRouter: Deletion failed: {result.get('error')}")
            
            return result
            
        except Exception as e:
            logger.error(f"BrainDrive OpenRouter: Delete plugin failed: {e}")
            return {'success': False, 'error': str(e)}

    async def get_plugin_status(self, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Get current status of BrainDrive OpenRouter plugin installation (compatibility method)"""
        try:
            existing_check = await self._check_existing_plugin(user_id, db)
            if not existing_check['exists']:
                return {'exists': False, 'status': 'not_installed'}
            
            # Check if shared plugin files exist
            plugin_health = await self._get_plugin_health_impl(user_id, self.shared_path)

            return {
                'exists': True,
                'status': 'healthy' if plugin_health['healthy'] else 'unhealthy',
                'plugin_id': existing_check['plugin_id'],
                'plugin_info': existing_check['plugin_info'],
                'health_details': plugin_health['details']
            }

        except Exception as e:
            logger.error(f"BrainDrive OpenRouter: Error checking plugin status: {e}")
            return {'exists': False, 'status': 'error', 'error': str(e)}

    @property
    def MODULE_DATA(self):
        """Compatibility property for accessing module data"""
        return self.module_data
    @property
    def PLUGIN_DATA(self):
        """Compatibility property for remote installer validation"""
        return self.plugin_data
    
    async def delete_plugin(self, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """
        Delete/uninstall plugin for a specific user.
        This method is expected by the universal lifecycle manager.
        """
        logger.info(f"BrainDrive OpenRouter: delete_plugin called for user {user_id}")
        # Use the existing uninstall method
        return await self.uninstall_for_user(user_id, db)


# Standalone functions for compatibility with remote installer
async def install_plugin(user_id: str, db: AsyncSession, plugins_base_dir: str = None) -> Dict[str, Any]:
    manager = BrainDriveOpenRouterLifecycleManager(plugins_base_dir)
    return await manager.install_plugin(user_id, db)

async def uninstall_plugin(user_id: str, db: AsyncSession, plugins_base_dir: str = None) -> Dict[str, Any]:
    manager = BrainDriveOpenRouterLifecycleManager(plugins_base_dir)
    return await manager.uninstall_plugin(user_id, db)

async def get_plugin_status(user_id: str, db: AsyncSession, plugins_base_dir: str = None) -> Dict[str, Any]:
    manager = BrainDriveOpenRouterLifecycleManager(plugins_base_dir)
    return await manager.get_plugin_status(user_id, db)


# Create global instance for backward compatibility
lifecycle_manager = BrainDriveOpenRouterLifecycleManager() 


# Test script for development
if __name__ == "__main__":
    async def main():
        print("BrainDrive OpenRouter Plugin Lifecycle Manager - Test Mode")
        print("=" * 50)
        
        # Test manager initialization
        manager = BrainDriveOpenRouterLifecycleManager()
        print(f"Plugin: {manager.plugin_data['name']}")
        print(f"Version: {manager.plugin_data['version']}")
        print(f"Slug: {manager.plugin_data['plugin_slug']}")
        print(f"Modules: {len(manager.module_data)}")
        
        for module in manager.module_data:
            print(f"  - {module['display_name']} ({module['name']})")

    asyncio.run(main())
