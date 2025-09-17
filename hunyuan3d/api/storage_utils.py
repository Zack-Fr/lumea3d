"""
Storage utilities for Hunyuan3D service
Helper functions for storage operations and path management
"""

import os
import json
from typing import Dict, Any, Optional
from pathlib import Path
import hashlib
import time

from .storage_config import get_storage_paths, storage_settings


def generate_job_id(prompt: str, seed: Optional[int] = None, user_id: Optional[str] = None) -> str:
    """Generate a unique job ID based on prompt and parameters

    Args:
        prompt: Text prompt for generation
        seed: Random seed (optional)
        user_id: User identifier (optional)

    Returns:
        Unique job identifier
    """
    # Create hash input
    hash_input = f"{prompt}_{seed or 0}_{user_id or 'anonymous'}_{int(time.time())}"

    # Generate SHA256 hash
    job_hash = hashlib.sha256(hash_input.encode()).hexdigest()[:16]

    return f"job_{job_hash}"


def create_job_metadata(job_id: str, prompt: str, seed: Optional[int],
                       user_id: str, model_version: str = "hunyuan3d-2.1") -> Dict[str, Any]:
    """Create metadata for a generation job

    Args:
        job_id: Unique job identifier
        prompt: Text prompt used
        seed: Random seed used
        user_id: User who initiated the job
        model_version: Version of the model used

    Returns:
        Metadata dictionary
    """
    return {
        "job_id": job_id,
        "prompt": prompt,
        "seed": seed,
        "user_id": user_id,
        "model_version": model_version,
        "created_at": time.time(),
        "storage_paths": get_storage_paths(job_id),
        "status": "created"
    }


def save_job_metadata(metadata: Dict[str, Any], local_path: Optional[str] = None) -> bool:
    """Save job metadata to file

    Args:
        metadata: Metadata dictionary
        local_path: Optional local path to save to

    Returns:
        True if successful, False otherwise
    """
    try:
        if local_path:
            save_path = Path(local_path)
        else:
            # Use local fallback path
            job_id = metadata["job_id"]
            save_path = Path(storage_settings.storage_local_path) / f"{job_id}/metadata.json"

        save_path.parent.mkdir(parents=True, exist_ok=True)

        with open(save_path, 'w') as f:
            json.dump(metadata, f, indent=2, default=str)

        return True

    except Exception as e:
        print(f"Failed to save metadata: {e}")
        return False


def load_job_metadata(job_id: str, local_path: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Load job metadata from file

    Args:
        job_id: Job identifier
        local_path: Optional local path to load from

    Returns:
        Metadata dictionary or None if not found
    """
    try:
        if local_path:
            load_path = Path(local_path)
        else:
            # Use local fallback path
            load_path = Path(storage_settings.storage_local_path) / f"{job_id}/metadata.json"

        if not load_path.exists():
            return None

        with open(load_path, 'r') as f:
            return json.load(f)

    except Exception as e:
        print(f"Failed to load metadata: {e}")
        return None


def validate_storage_config() -> Dict[str, Any]:
    """Validate storage configuration

    Returns:
        Dictionary with validation results
    """
    results = {
        "valid": True,
        "issues": [],
        "recommendations": []
    }

    # Check required settings
    if not storage_settings.storage_access_key:
        results["issues"].append("STORAGE_ACCESS_KEY not configured")
        results["valid"] = False

    if not storage_settings.storage_secret_key:
        results["issues"].append("STORAGE_SECRET_KEY not configured")
        results["valid"] = False

    # Check bucket accessibility
    if storage_settings.storage_local_fallback:
        local_path = Path(storage_settings.storage_local_path)
        if not local_path.exists():
            results["recommendations"].append(f"Local storage path {local_path} does not exist")
        elif not os.access(local_path, os.W_OK):
            results["issues"].append(f"Local storage path {local_path} is not writable")
            results["valid"] = False

    return results


def cleanup_old_files(max_age_days: int = 7) -> Dict[str, Any]:
    """Clean up old files from local storage

    Args:
        max_age_days: Maximum age of files to keep

    Returns:
        Cleanup results
    """
    results = {
        "files_removed": 0,
        "total_size_cleaned": 0,
        "errors": []
    }

    try:
        if not storage_settings.storage_local_fallback:
            return results

        local_path = Path(storage_settings.storage_local_path)
        if not local_path.exists():
            return results

        cutoff_time = time.time() - (max_age_days * 24 * 60 * 60)

        for file_path in local_path.rglob("*"):
            if file_path.is_file():
                try:
                    if file_path.stat().st_mtime < cutoff_time:
                        size = file_path.stat().st_size
                        file_path.unlink()
                        results["files_removed"] += 1
                        results["total_size_cleaned"] += size
                except Exception as e:
                    results["errors"].append(f"Failed to remove {file_path}: {e}")

    except Exception as e:
        results["errors"].append(f"Cleanup failed: {e}")

    return results