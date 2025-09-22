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
  onSceneRefresh?: () => void; // Add scene refresh callback
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
  onHdriUpdate,
  onSceneRefresh
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
    console.log('🌄 HDR Upload: File selection started');
    const file = event.target.files?.[0];
    if (!file) {
      console.log('⚠️ HDR Upload: No file selected');
      return;
    }

    console.log('🌄 HDR Upload: File selected:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    });

    // Validate file type - HDR files often don't have MIME types, so check extension
    const isValidHdr = file.name.toLowerCase().endsWith('.hdr') || 
                      file.name.toLowerCase().endsWith('.exr') ||
                      file.type.includes('image/vnd.radiance') ||
                      file.type.includes('image/x-exr');
    
    if (!isValidHdr) {
      console.error('❌ HDR Upload: Invalid file type:', {
        fileName: file.name,
        fileType: file.type,
        fileExtension: file.name.toLowerCase().split('.').pop()
      });
      setUploadState(prev => ({
        ...prev,
        error: 'Please select an HDR image file (.hdr or .exr format)',
        success: false
      }));
      return;
    }
    
    console.log('✅ HDR Upload: File type validation passed for HDR file:', {
      fileName: file.name,
      detectedExtension: file.name.toLowerCase().split('.').pop(),
      mimeType: file.type || 'none'
    });

    // Validate file size (max 100MB for HDR files - they tend to be large)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      console.error('❌ HDR Upload: File too large:', file.size, 'bytes (max:', maxSize, ')');
      setUploadState(prev => ({
        ...prev,
        error: 'HDR file is too large. Maximum size is 100MB.',
        success: false
      }));
      return;
    }
    
    console.log('✅ HDR Upload: File size validation passed:', {
      fileSize: file.size,
      fileSizeMB: Math.round(file.size / 1024 / 1024 * 100) / 100,
      maxSizeMB: 100
    });

    console.log('✅ HDR Upload: File validation passed');

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setPreviewUrl(previewUrl);
    console.log('🌄 HDR Upload: Preview URL created:', previewUrl);

    // Start upload
    console.log('🌄 HDR Upload: Starting upload process...');
    uploadHdrFile(file);
  }, []);

  // Upload HDR file
  const uploadHdrFile = useCallback(async (file: File) => {
    console.log('🌄 HDR Upload: uploadHdrFile called with:', {
      fileName: file.name,
      fileSize: file.size,
      sceneId: sceneId
    });
    
    if (!sceneId) {
      console.error('❌ HDR Upload: No sceneId available');
      setUploadState(prev => ({
        ...prev,
        error: 'No scene selected for HDR upload',
        success: false
      }));
      return;
    }
    
    console.log('✅ HDR Upload: sceneId validation passed:', sceneId);

    setUploadState({
      isUploading: true,
      uploadProgress: 0,
      error: null,
      success: false
    });
    console.log('🌄 HDR Upload: Upload state set to uploading');

    try {
      // Step 1: Get upload URL
      // HDR files often don't have a proper MIME type, so provide a fallback
      const contentType = file.type || 
        (file.name.toLowerCase().endsWith('.hdr') ? 'image/vnd.radiance' : 
         file.name.toLowerCase().endsWith('.exr') ? 'image/x-exr' : 'application/octet-stream');
      
      console.log('🌄 HDR Upload: Step 1 - Getting upload URL with:', {
        filename: file.name,
        originalContentType: file.type,
        finalContentType: contentType,
        fileSize: file.size,
        category: 'environment'
      });
      
      // Try multiple payload approaches to debug backend validation
      const uploadPayload = {
        filename: file.name,
        contentType: contentType,
        fileSize: file.size,
        category: 'lighting'
        // Remove metadata temporarily to see if that's causing the issue
      };
      
      // Fallback 1: Try with the exact same structure as AssetImportModal
      const fallbackPayload = {
        filename: file.name,
        contentType: contentType || 'model/gltf-binary',
        fileSize: file.size,
        category: 'furniture', // Try a known working category
        metadata: {}
      };
      
      // Fallback 2: Minimal payload with only required fields
      const minimalPayload = {
        filename: file.name,
        contentType: 'model/gltf-binary', // Use exactly what works for GLB
        fileSize: file.size,
        category: 'furniture'
      };
      
      console.log('🌄 HDR Upload: Trying primary payload:', JSON.stringify(uploadPayload, null, 2));
      
      let uploadUrlResponse;
      try {
        // Try approach 1: HDR-specific payload
        uploadUrlResponse = await assetsApi.getUploadUrl(uploadPayload);
        console.log('✅ HDR Upload: Primary payload succeeded!');
      } catch (primaryError) {
        console.warn('⚠️ HDR Upload: Primary payload failed, trying fallback 1:', JSON.stringify(fallbackPayload, null, 2));
        console.error('🌄 HDR Upload: Primary error was:', primaryError);
        
        try {
          // Try approach 2: AssetImportModal structure
          uploadUrlResponse = await assetsApi.getUploadUrl(fallbackPayload);
          console.log('✅ HDR Upload: Fallback payload 1 succeeded!');
        } catch (fallbackError) {
          console.warn('⚠️ HDR Upload: Fallback 1 failed, trying minimal payload:', JSON.stringify(minimalPayload, null, 2));
          console.error('🌄 HDR Upload: Fallback 1 error was:', fallbackError);
          
          try {
            // Try approach 3: Minimal required fields only
            uploadUrlResponse = await assetsApi.getUploadUrl(minimalPayload);
            console.log('✅ HDR Upload: Minimal payload succeeded!');
          } catch (minimalError) {
            console.error('❌ HDR Upload: All three payloads failed!');
            console.error('🌄 HDR Upload: Primary error:', primaryError);
            console.error('🌄 HDR Upload: Fallback 1 error:', fallbackError);
            console.error('🌄 HDR Upload: Minimal error:', minimalError);
            throw primaryError; // Throw the original error
          }
        }
      }
      
      console.log('✅ HDR Upload: Got upload URL response:', uploadUrlResponse);

      setUploadState(prev => ({ ...prev, uploadProgress: 25 }));
      console.log('🌄 HDR Upload: Progress updated to 25%');

      // Step 2: Upload file to storage
      console.log('🌄 HDR Upload: Step 2 - Uploading file to storage URL:', uploadUrlResponse.uploadUrl);
      const uploadResponse = await fetch(uploadUrlResponse.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': contentType,
        },
      });
      
      console.log('🌄 HDR Upload: Storage upload response status:', uploadResponse.status, uploadResponse.statusText);

      if (!uploadResponse.ok) {
        console.error('❌ HDR Upload: Storage upload failed:', uploadResponse.status, uploadResponse.statusText);
        throw new Error(`Upload failed: ${uploadResponse.status}`);
      }
      
      console.log('✅ HDR Upload: File uploaded to storage successfully');

      setUploadState(prev => ({ ...prev, uploadProgress: 50 }));
      console.log('🌄 HDR Upload: Progress updated to 50%');

      // Step 3: Notify upload completion
      console.log('🌄 HDR Upload: Step 3 - Notifying upload completion for assetId:', uploadUrlResponse.assetId);
      await assetsApi.notifyUploadComplete(uploadUrlResponse.assetId);
      console.log('✅ HDR Upload: Upload completion notified');

      setUploadState(prev => ({ ...prev, uploadProgress: 75 }));
      console.log('🌄 HDR Upload: Progress updated to 75%');

      // Step 4: Get the asset to get the final URL
      console.log('🌄 HDR Upload: Step 4 - Getting asset details for assetId:', uploadUrlResponse.assetId);
      const asset = await assetsApi.getAsset(uploadUrlResponse.assetId);
      console.log('✅ HDR Upload: Got asset details:', asset);
      
      const hdriUrl = asset.originalUrl || asset.meshoptUrl || asset.dracoUrl;
      console.log('🌄 HDR Upload: Extracted HDR URL:', hdriUrl);
      
      // Try to construct full URL if we have a relative path
      let fullHdriUrl = hdriUrl;
      if (hdriUrl && !hdriUrl.startsWith('http')) {
        // Construct full URL - use the storage base URL from upload response
        const storageBaseUrl = uploadUrlResponse.uploadUrl.split('/lumea-assets/')[0] + '/lumea-assets/';
        fullHdriUrl = storageBaseUrl + hdriUrl;
        console.log('🌄 HDR Upload: Constructed full HDR URL:', fullHdriUrl);
      }

      if (!hdriUrl) {
        console.error('❌ HDR Upload: No URL available from asset:', asset);
        throw new Error('Asset uploaded but no URL available');
      }

      // Step 5: Update scene with new HDR URL (need to get current version first)
      console.log('🌄 HDR Upload: Getting scene version for update');
      const sceneVersion = await scenesApi.getVersion(sceneId);
      console.log('🌄 HDR Upload: Current scene version:', sceneVersion);
      
      const updatePayload = {
        envHdriUrl: fullHdriUrl // Backend expects 'envHdriUrl' field name
      };
      console.log('🌄 HDR Upload: Sending update payload:', updatePayload);
      console.log('🌄 HDR Upload: Using HDR URL:', fullHdriUrl);
      
      const updateResult = await scenesApi.updateScene(sceneId, updatePayload, sceneVersion.version);
      console.log('🌄 HDR Upload: Update result:', updateResult);

      setUploadState({
        isUploading: false,
        uploadProgress: 100,
        error: null,
        success: true
      });

      // Notify parent component
      if (onHdriUpdate) {
        onHdriUpdate(fullHdriUrl || null);
      }
      
      // Refresh scene to update environment
      if (onSceneRefresh) {
        onSceneRefresh();
      }

      // Clear success message after 3 seconds
      setTimeout(() => {
        setUploadState(prev => ({ ...prev, success: false }));
      }, 3000);

    } catch (error) {
      console.error('❌ HDR Upload: Upload process failed with error:', error);
      console.error('❌ HDR Upload: Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      setUploadState({
        isUploading: false,
        uploadProgress: 0,
        error: error instanceof Error ? error.message : 'Upload failed',
        success: false
      });
      
      console.log('🌄 HDR Upload: Upload state set to failed');
    }
  }, [sceneId, onHdriUpdate]);

  // Remove current HDR
  const handleRemoveHdr = useCallback(async () => {
    if (!sceneId) return;

    try {
      setUploadState(prev => ({ ...prev, isUploading: true, error: null }));

      const sceneVersion = await scenesApi.getVersion(sceneId);
      // For removal, send null to explicitly clear the HDR URL
      await scenesApi.updateScene(sceneId, {
        envHdriUrl: null // Explicitly set to null to remove HDR
      }, sceneVersion.version);

      if (onHdriUpdate) {
        onHdriUpdate(null);
      }
      
      // Refresh scene to update environment
      if (onSceneRefresh) {
        onSceneRefresh();
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
    console.log('🌄 HDR Upload: Upload button clicked');
    console.log('🌄 HDR Upload: File input ref:', fileInputRef.current);
    console.log('🌄 HDR Upload: File input element properties:', {
      tagName: fileInputRef.current?.tagName,
      type: fileInputRef.current?.type,
      accept: fileInputRef.current?.accept,
      disabled: fileInputRef.current?.disabled,
      style: fileInputRef.current?.style?.cssText
    });
    
    if (fileInputRef.current) {
      try {
        // Force focus first (sometimes helps with click events)
        fileInputRef.current.focus();
        fileInputRef.current.click();
        console.log('🌄 HDR Upload: File input click completed successfully');
      } catch (error) {
        console.error('❌ HDR Upload: Error clicking file input:', error);
      }
    } else {
      console.error('❌ HDR Upload: File input ref is null');
    }
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
          accept=".hdr,.exr,image/vnd.radiance,image/x-exr,*/*"
          onChange={handleFileSelect}
          style={{ 
            position: 'absolute',
            left: '-9999px',
            width: '1px',
            height: '1px',
            opacity: 0
          }}
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
          Upload an HDR image (.hdr or .exr format) to set the scene's environment lighting. 
          HDR images provide realistic lighting and reflections. Maximum file size: 100MB.
        </p>
      </div>
    </div>
  );
};

export default HdrEnvironmentUpload;
