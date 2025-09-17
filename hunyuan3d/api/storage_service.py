"""
Storage service for Hunyuan3D artifacts
Handles S3/MinIO operations for file uploads and presigned downloads
"""

import os
import json
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
from typing import Optional, Dict, Any, BinaryIO
from pathlib import Path
import logging

from .storage_config import storage_settings, get_storage_paths, get_presigned_url_config

logger = logging.getLogger(__name__)


class StorageService:
    """Service for handling artifact storage operations"""

    def __init__(self):
        self.client = None
        self._initialize_client()

    def _initialize_client(self):
        """Initialize S3/MinIO client"""
        try:
            if storage_settings.storage_provider.lower() == "minio":
                # MinIO configuration
                self.client = boto3.client(
                    's3',
                    endpoint_url=storage_settings.storage_endpoint,
                    aws_access_key_id=storage_settings.storage_access_key,
                    aws_secret_access_key=storage_settings.storage_secret_key,
                    config=Config(signature_version='s3v4'),
                    region_name=storage_settings.storage_region
                )
            else:
                # Standard S3 configuration
                self.client = boto3.client(
                    's3',
                    aws_access_key_id=storage_settings.storage_access_key,
                    aws_secret_access_key=storage_settings.storage_secret_key,
                    region_name=storage_settings.storage_region
                )

            logger.info(f"Storage client initialized for {storage_settings.storage_provider}")
        except Exception as e:
            logger.error(f"Failed to initialize storage client: {e}")
            if storage_settings.storage_local_fallback:
                logger.info("Using local storage fallback")
            else:
                raise

    def upload_file(self, file_path: str, storage_path: str, content_type: Optional[str] = None) -> bool:
        """Upload a file to storage

        Args:
            file_path: Local file path
            storage_path: Storage destination path
            content_type: MIME content type

        Returns:
            True if successful, False otherwise
        """
        try:
            if not os.path.exists(file_path):
                logger.error(f"File not found: {file_path}")
                return False

            # Use local fallback if client not available
            if not self.client and storage_settings.storage_local_fallback:
                return self._upload_local(file_path, storage_path)

            # Upload to S3/MinIO
            extra_args = {}
            if content_type:
                extra_args['ContentType'] = content_type

            self.client.upload_file(
                file_path,
                storage_settings.storage_bucket,
                storage_path,
                ExtraArgs=extra_args
            )

            logger.info(f"File uploaded: {storage_path}")
            return True

        except ClientError as e:
            logger.error(f"Failed to upload file {file_path}: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error uploading file: {e}")
            return False

    def _upload_local(self, file_path: str, storage_path: str) -> bool:
        """Upload to local storage (fallback)"""
        try:
            local_base = Path(storage_settings.storage_local_path)
            local_base.mkdir(exist_ok=True)

            local_path = local_base / storage_path
            local_path.parent.mkdir(parents=True, exist_ok=True)

            # Copy file
            import shutil
            shutil.copy2(file_path, local_path)

            logger.info(f"File copied to local storage: {local_path}")
            return True

        except Exception as e:
            logger.error(f"Failed to copy to local storage: {e}")
            return False

    def generate_presigned_url(self, storage_path: str, content_type: Optional[str] = None) -> Optional[str]:
        """Generate a presigned URL for file download

        Args:
            storage_path: Storage path of the file
            content_type: Expected content type for the download

        Returns:
            Presigned URL or None if failed
        """
        try:
            if not self.client:
                if storage_settings.storage_local_fallback:
                    return self._generate_local_url(storage_path)
                return None

            url_config = get_presigned_url_config()

            # Generate presigned URL
            response = self.client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': storage_settings.storage_bucket,
                    'Key': storage_path,
                    'ResponseContentType': content_type
                },
                ExpiresIn=url_config['expiry']
            )

            logger.info(f"Presigned URL generated for: {storage_path}")
            return response

        except ClientError as e:
            logger.error(f"Failed to generate presigned URL for {storage_path}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error generating presigned URL: {e}")
            return None

    def _generate_local_url(self, storage_path: str) -> str:
        """Generate local file URL (fallback)"""
        local_path = Path(storage_settings.storage_local_path) / storage_path
        return f"file://{local_path.absolute()}"

    def file_exists(self, storage_path: str) -> bool:
        """Check if a file exists in storage

        Args:
            storage_path: Storage path to check

        Returns:
            True if file exists, False otherwise
        """
        try:
            if not self.client:
                if storage_settings.storage_local_fallback:
                    local_path = Path(storage_settings.storage_local_path) / storage_path
                    return local_path.exists()
                return False

            self.client.head_object(
                Bucket=storage_settings.storage_bucket,
                Key=storage_path
            )
            return True

        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return False
            logger.error(f"Error checking file existence: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error checking file: {e}")
            return False

    def upload_job_artifacts(self, job_id: str, artifacts: Dict[str, str]) -> Dict[str, Any]:
        """Upload all artifacts for a generation job

        Args:
            artifacts: Dictionary mapping artifact types to local file paths

        Returns:
            Dictionary with upload results and URLs
        """
        results = {
            "job_id": job_id,
            "uploads": {},
            "urls": {},
            "success": True
        }

        storage_paths = get_storage_paths(job_id)
        url_config = get_presigned_url_config()

        for artifact_type, local_path in artifacts.items():
            if artifact_type in storage_paths:
                storage_path = storage_paths[artifact_type]
                content_type = url_config['content_types'].get(
                    artifact_type,
                    'application/octet-stream'
                )

                # Upload file
                success = self.upload_file(local_path, storage_path, content_type)
                results["uploads"][artifact_type] = {
                    "success": success,
                    "storage_path": storage_path
                }

                # Generate presigned URL if upload successful
                if success:
                    url = self.generate_presigned_url(storage_path, content_type)
                    results["urls"][artifact_type] = url

                if not success:
                    results["success"] = False

        return results


# Global storage service instance
storage_service = StorageService()