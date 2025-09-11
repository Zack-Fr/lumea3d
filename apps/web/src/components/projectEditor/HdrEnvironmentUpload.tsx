import React, { useState, useCallback, useRef } from 'react';
import { Button } from "../ui/Button";
import { Upload, X, Image, Check, Loader2 } from "lucide-react";
import styles from '../../pages/projectEditor/ProjectEditor.module.css';
import { assetsApi } from '../../services/assetsApi';
import { scenesApi } from '../../services/scenesApi';

interface HdrEnvironmentUploadProps {
  sceneId?: string;
  currentHdriUrl?: string;
  onHdriUpdate?: (hdriUrl: string | null) => void;
}

interface UploadState {
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  success: boolean;
}

const HdrEnvironmentUpload: React.FC<HdrEnvironmentUploadProps> = ({
  sceneId,
  currentHdriUrl,
  onHdriUpdate
}) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    uploadProgress: 0,
    error: null,
    success: false
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.includes('image/') || !file.name.toLowerCase().endsWith('.hdr')) {
      setUploadState(prev => ({
        ...prev,
        error: 'Please select an HDR image file (.hdr format)',
        success: false
      }));
      return;
    }

    // Validate file size (max 50MB for HDR files)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadState(prev => ({
        ...prev,
        error: 'HDR file is too large. Maximum size is 50MB.',
        success: false
      }));
      return;
    }

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setPreviewUrl(previewUrl);

    // Start upload
    uploadHdrFile(file);
  }, []);

  // Upload HDR file
  const uploadHdrFile = useCallback(async (file: File) => {
    if (!sceneId) {
      setUploadState(prev => ({
        ...prev,
        error: 'No scene selected for HDR upload',
        success: false
      }));
      return;
    }

    setUploadState({
      isUploading: true,
      uploadProgress: 0,
      error: null,
      success: false
    });

    try {
      // Step 1: Get upload URL
      const uploadUrlResponse = await assetsApi.getUploadUrl({
        filename: file.name,
        contentType: file.type,
        fileSize: file.size,
        category: 'environment'
      });

      setUploadState(prev => ({ ...prev, uploadProgress: 25 }));

      // Step 2: Upload file to storage
      const uploadResponse = await fetch(uploadUrlResponse.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status}`);
      }

      setUploadState(prev => ({ ...prev, uploadProgress: 50 }));

      // Step 3: Notify upload completion
      await assetsApi.notifyUploadComplete(uploadUrlResponse.assetId);

      setUploadState(prev => ({ ...prev, uploadProgress: 75 }));

      // Step 4: Get the asset to get the final URL
      const asset = await assetsApi.getAsset(uploadUrlResponse.assetId);
      const hdriUrl = asset.originalUrl || asset.meshoptUrl || asset.dracoUrl;

      if (!hdriUrl) {
        throw new Error('Asset uploaded but no URL available');
      }

      // Step 5: Update scene with new HDR URL
      await scenesApi.updateScene(sceneId, {
        env: {
          hdri_url: hdriUrl
        }
      });

      setUploadState({
        isUploading: false,
        uploadProgress: 100,
        error: null,
        success: true
      });

      // Notify parent component
      if (onHdriUpdate) {
        onHdriUpdate(hdriUrl);
      }

      // Clear success message after 3 seconds
      setTimeout(() => {
        setUploadState(prev => ({ ...prev, success: false }));
      }, 3000);

    } catch (error) {
      console.error('HDR upload failed:', error);
      setUploadState({
        isUploading: false,
        uploadProgress: 0,
        error: error instanceof Error ? error.message : 'Upload failed',
        success: false
      });
    }
  }, [sceneId, onHdriUpdate]);

  // Remove current HDR
  const handleRemoveHdr = useCallback(async () => {
    if (!sceneId) return;

    try {
      setUploadState(prev => ({ ...prev, isUploading: true, error: null }));

      await scenesApi.updateScene(sceneId, {
        env: {
          hdri_url: null
        }
      });

      if (onHdriUpdate) {
        onHdriUpdate(null);
      }

      setUploadState(prev => ({ 
        ...prev, 
        isUploading: false, 
        success: true 
      }));

      // Clear preview
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }

    } catch (error) {
      console.error('Failed to remove HDR:', error);
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        error: 'Failed to remove HDR environment'
      }));
    }
  }, [sceneId, onHdriUpdate, previewUrl]);

  // Trigger file input
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className={styles.sectionContainer}>
      <h3 className={styles.sectionTitle}>
        <Image className={styles.sectionIcon} />
        HDR Environment
      </h3>

      {/* Current HDR Display */}
      {(currentHdriUrl || previewUrl) && (
        <div className={styles.hdrPreviewContainer}>
          <div className={styles.hdrPreview}>
            {currentHdriUrl && (
              <div className={styles.hdrInfo}>
                <span className={styles.hdrLabel}>Current HDR</span>
                <span className={styles.hdrUrl}>
                  {currentHdriUrl.split('/').pop()?.substring(0, 30)}...
                </span>
              </div>
            )}
            {previewUrl && (
              <div className={styles.hdrInfo}>
                <span className={styles.hdrLabel}>Preview</span>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemoveHdr}
            disabled={uploadState.isUploading}
            className={styles.removeHdrButton}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Upload Button */}
      <div className={styles.hdrUploadContainer}>
        <Button
          variant="outline"
          onClick={handleUploadClick}
          disabled={uploadState.isUploading}
          className={styles.hdrUploadButton}
        >
          {uploadState.isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading... {uploadState.uploadProgress}%
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload HDR
            </>
          )}
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".hdr,image/vnd.radiance"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      {/* Status Messages */}
      {uploadState.error && (
        <div className={styles.hdrError}>
          <span>{uploadState.error}</span>
        </div>
      )}

      {uploadState.success && (
        <div className={styles.hdrSuccess}>
          <Check className="w-4 h-4 mr-2" />
          <span>HDR environment updated successfully!</span>
        </div>
      )}

      {/* Help Text */}
      <div className={styles.hdrHelp}>
        <p className={styles.hdrHelpText}>
          Upload an HDR image (.hdr format) to set the scene's environment lighting. 
          HDR images provide realistic lighting and reflections.
        </p>
      </div>
    </div>
  );
};

export default HdrEnvironmentUpload;
