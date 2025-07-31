"""
BrainDrive OpenRouter Plugin API Endpoints

Provides installation and management endpoints for the BrainDrive OpenRouter plugin.
"""

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.user import User
from .lifecycle_manager import lifecycle_manager
import structlog

logger = structlog.get_logger()

router = APIRouter(prefix="/api/plugins/brain-drive-openrouter", tags=["BrainDrive OpenRouter Plugin"])


@router.post("/install")
async def install_plugin(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Install BrainDrive OpenRouter plugin for the current user

    This endpoint installs the plugin only for the requesting user,
    ensuring proper plugin scoping and isolation.
    """
    try:
        logger.info(f"BrainDrive OpenRouter plugin installation requested by user {current_user.id}")

        result = await lifecycle_manager.install_plugin(current_user.id, db)

        if result['success']:
            return {
                "status": "success",
                "message": "BrainDrive OpenRouter plugin installed successfully",
                "data": {
                    "plugin_id": result['plugin_id'],
                    "plugin_slug": result['plugin_slug'],
                    "modules_created": result['modules_created'],
                    "plugin_directory": result['plugin_directory'],
                    "settings_created": result['settings_created']
                }
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result['error']
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during BrainDrive OpenRouter plugin installation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during plugin installation"
        )


@router.delete("/uninstall")
async def uninstall_plugin(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Uninstall BrainDrive OpenRouter plugin for the current user

    This endpoint removes the plugin and all associated data for the requesting user.
    """
    try:
        logger.info(f"BrainDrive OpenRouter plugin uninstallation requested by user {current_user.id}")

        result = await lifecycle_manager.uninstall_plugin(current_user.id, db)

        if result['success']:
            return {
                "status": "success",
                "message": "BrainDrive OpenRouter plugin uninstalled successfully",
                "data": {
                    "plugin_slug": result['plugin_slug'],
                    "modules_removed": result['modules_removed'],
                    "settings_removed": result['settings_removed']
                }
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result['error']
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during BrainDrive OpenRouter plugin uninstallation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during plugin uninstallation"
        )


@router.get("/status")
async def get_plugin_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get the installation status of BrainDrive OpenRouter plugin for the current user
    """
    try:
        logger.info(f"BrainDrive OpenRouter plugin status requested by user {current_user.id}")

        # Check if plugin exists
        existing_check = await lifecycle_manager._check_existing_plugin(current_user.id, db)

        return {
            "status": "success",
            "data": {
                "plugin_slug": "BrainDriveOpenRouter",
                "plugin_name": "BrainDrive OpenRouter",
                "installed": existing_check['exists'],
                "plugin_id": existing_check['plugin_id']
            }
        }

    except Exception as e:
        logger.error(f"Error getting BrainDrive OpenRouter plugin status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error while getting plugin status"
        ) 