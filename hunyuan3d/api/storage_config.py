"""
Storage configuration for Hunyuan3D service
Handles S3/MinIO integration for artifact storage
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings


class StorageSettings(BaseSettings):
    """Storage configuration settings"""

    # Storage provider (s3 or minio)
    storage_provider: str = "minio"

    # S3/MinIO configuration
    storage_endpoint: str = "http://localhost:9000"
    storage_access_key: str = ""
    storage_secret_key: str = ""
    storage_region: str = "us-east-1"

    # Bucket configuration
    storage_bucket: str = "lumea-generations"
    storage_bucket_private: bool = True

    # Path configuration
    storage_base_path: str = "gen"
    storage_presigned_expiry: int = 900  # 15 minutes in seconds

    # Local fallback (for development)
    storage_local_fallback: bool = True
    storage_local_path: str = "./outputs"

    class Config:
        env_prefix = "STORAGE_"
        case_sensitive = False


# Global settings instance
storage_settings = StorageSettings()


def get_storage_paths(job_id: str, candidate_id: Optional[str] = None) -> dict:
    """Generate storage paths for a generation job

    Args:
        job_id: Unique job identifier
        candidate_id: Optional candidate identifier for multiple variants

    Returns:
        Dictionary with storage paths
    """
    base_path = f"{storage_settings.storage_base_path}/{job_id}"

    if candidate_id:
        base_path = f"{base_path}/{candidate_id}"

    return {
        "base": base_path,
        "preview": f"{base_path}/preview.jpg",
        "glb": f"{base_path}/model.glb",
        "textures": f"{base_path}/textures/",
        "metadata": f"{base_path}/metadata.json",
        "logs": f"{base_path}/generation.log"
    }


def get_presigned_url_config() -> dict:
    """Get configuration for presigned URLs

    Returns:
        Dictionary with presigned URL settings
    """
    return {
        "expiry": storage_settings.storage_presigned_expiry,
        "content_types": {
            "glb": "model/gltf-binary",
            "jpg": "image/jpeg",
            "png": "image/png",
            "json": "application/json",
            "log": "text/plain"
        }
    }