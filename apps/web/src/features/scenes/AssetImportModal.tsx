import { useState, useRef, useCallback } from 'react';
import { X, Upload, Package, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { AssetStatus, AssetLicense } from '@/api/sdk';
import { useAssetProcessing } from '@/hooks/useAssetProcessing';
import AssetProcessingStatusCard from '@/components/asset/AssetProcessingStatusCard';
import { assetsApi } from '@/services/assetsApi';
import { toast } from 'react-toastify';
import CustomSelect from '../../components/ui/CustomSelect';

interface AssetImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportComplete?: (assetId: string, assetName: string, category: string) => void;
}

interface ImportFormData {
    file: File | null;
    category: string;
    license: AssetLicense;
    metadata: Record<string, string>;
}

interface UploadProgress {
    stage: 'idle' | 'uploading' | 'processing' | 'complete' | 'error';
    progress: number;
    message: string;
    assetId?: string;
    errorDetails?: string;
}

const AVAILABLE_CATEGORIES = [
  { value: 'furniture', label: 'Furniture', description: 'Chairs, tables, sofas, etc.' },
  { value: 'decoration', label: 'Decoration', description: 'Art, plants, ornaments' },
  { value: 'lighting', label: 'Lighting', description: 'Lamps, chandeliers, fixtures' },
  { value: 'electronics', label: 'Electronics', description: 'TVs, computers, appliances' },
  { value: 'architecture', label: 'Architecture', description: 'Doors, windows, structural elements' },
  { value: 'misc', label: 'Miscellaneous', description: 'Other 3D objects' },
];

const LICENSE_OPTIONS = [
  { 
    value: AssetLicense.CC0, 
    label: 'CC0 (Public Domain)', 
    description: 'No rights reserved, free for any use' 
  },
  { 
    value: AssetLicense.ROYALTY_FREE, 
    label: 'Royalty Free', 
    description: 'Licensed for commercial use without ongoing fees' 
  },
  { 
    value: AssetLicense.PROPRIETARY, 
    label: 'Proprietary', 
    description: 'Custom license terms or restricted use' 
  },
];

export function AssetImportModal({ isOpen, onClose, onImportComplete }: AssetImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<ImportFormData>({
    file: null,
    category: '',
    license: AssetLicense.CC0,
    metadata: {},
  });
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    stage: 'idle',
    progress: 0,
    message: '',
  });

  // Enhanced asset processing hook
  const {
    status: processingStatus,
    isPolling,
    isRetrying,
    startPolling,
    stopPolling,
    retryProcessing,
    refreshStatus,
  } = useAssetProcessing();

  const resetForm = useCallback(() => {
    setFormData({
      file: null,
      category: '',
      license: AssetLicense.CC0,
      metadata: {},
    });
    setUploadProgress({
      stage: 'idle',
      progress: 0,
      message: '',
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    stopPolling(); // Stop any active polling
  }, [stopPolling]);

  const handleClose = useCallback(() => {
    if (uploadProgress.stage === 'uploading' || isPolling) {
      return; // Prevent closing during upload or processing
    }
    resetForm();
    onClose();
  }, [uploadProgress.stage, isPolling, resetForm, onClose]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.glb')) {
      toast.error('Please select a GLB file (.glb extension)');
      return;
    }

    // Validate file size (100MB max)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 100MB');
      return;
    }

    console.log('📦 AssetImport: File selected:', {
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + 'MB',
      type: file.type,
    });

    setFormData(prev => ({ ...prev, file }));
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const files = Array.from(event.dataTransfer.files);
    const glbFile = files.find(file => file.name.toLowerCase().endsWith('.glb'));

    if (!glbFile) {
      toast.error('Please drop a GLB file (.glb extension)');
      return;
    }

    // Simulate file input change
    const fileEvent = {
      target: { files: [glbFile] }
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    
    handleFileSelect(fileEvent);
  }, [handleFileSelect]);

  // Future: Metadata management functions
  // const updateMetadata = useCallback((key: string, value: string) => {
  //   setFormData(prev => ({
  //     ...prev,
  //     metadata: { ...prev.metadata, [key]: value },
  //   }));
  // }, []);

  // const removeMetadata = useCallback((key: string) => {
  //   setFormData(prev => {
  //     const newMetadata = { ...prev.metadata };
  //     delete newMetadata[key];
  //     return { ...prev, metadata: newMetadata };
  //   });
  // }, []);

  // Local fallback when API is unavailable
  const handleLocalFallback = useCallback(async (file: File) => {
    console.log('🔄 AssetImport: Using local fallback processing...');
    
    setUploadProgress({
      stage: 'processing',
      progress: 50,
      message: 'Processing locally (API unavailable)...',
    });

    // Simulate local processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate a local asset ID
    const localAssetId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create local URL for the file
    const localUrl = URL.createObjectURL(file);
    
    // Store in localStorage for persistence
    const localAsset = {
      id: localAssetId,
      name: file.name.replace('.glb', ''),
      category: formData.category,
      url: localUrl,
      size: file.size,
      createdAt: new Date().toISOString(),
      isLocal: true
    };
    
    try {
      const existingAssets = JSON.parse(localStorage.getItem('lumea-local-assets') || '[]');
      existingAssets.push(localAsset);
      localStorage.setItem('lumea-local-assets', JSON.stringify(existingAssets));
    } catch (storageError) {
      console.warn('Failed to store asset locally:', storageError);
    }
    
    setUploadProgress({
      stage: 'complete',
      progress: 100,
      message: 'Local processing completed!',
      assetId: localAssetId,
    });
    
    console.log('✅ AssetImport: Local fallback completed:', localAssetId);
    console.log('🚨 DEBUG: LOCAL FALLBACK calling onImportComplete with:', { localAssetId, name: localAsset.name, category: formData.category });
    console.log('🚨 DEBUG: Local asset stored in localStorage as blob URL - this needs special handling!');
    onImportComplete?.(localAssetId, localAsset.name, formData.category);
  }, [formData.category, onImportComplete]);

  const validateForm = useCallback((): string | null => {
    if (!formData.file) return 'Please select a GLB file';
    if (!formData.category) return 'Please select a category';
    return null;
  }, [formData]);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (!formData.file) return;

    try {
      setUploadProgress({
        stage: 'uploading',
        progress: 0,
        message: 'Preparing upload...',
      });

      console.log('🚀 AssetImport: Starting upload process for:', formData.file.name);

      // Step 1: Request upload URL using authenticated API service with retry logic
      let uploadData;
      try {
        uploadData = await assetsApi.getUploadUrl({
          filename: formData.file.name,
          contentType: formData.file.type || 'model/gltf-binary',
          fileSize: formData.file.size,
          category: formData.category,
          metadata: formData.metadata,
        });
      } catch (apiError: any) {
        console.error('❌ AssetImport: API call failed:', apiError);
        console.log('🔍 DEBUG: API Error details:', {
          message: apiError.message,
          status: apiError.status || apiError.statusCode,
          stack: apiError.stack
        });
        
        // Handle specific error cases
        if (apiError.message?.includes('400')) {
          throw new Error('Invalid file or metadata. Please check the file format and try again.');
        } else if (apiError.message?.includes('401') || apiError.message?.includes('Unauthorized')) {
          throw new Error('Authentication required. Please log in and try again.');
        } else if (apiError.message?.includes('413') || apiError.message?.includes('too large')) {
          throw new Error('File is too large. Please select a file smaller than 100MB.');
        } else if (apiError.message?.includes('415') || apiError.message?.includes('Unsupported')) {
          throw new Error('Unsupported file format. Please select a valid GLB file.');
        } else if (apiError.message?.includes('503') || apiError.message?.includes('Service Unavailable')) {
          throw new Error('Service temporarily unavailable. Please try again in a few minutes.');
        } else {
          // Fallback: Try local processing if API is unavailable
          console.warn('🚨 DEBUG: API unavailable, using LOCAL FALLBACK processing...');
          console.log('🚨 DEBUG: This creates blob URLs and localStorage assets - NOT proper scene items!');
          await handleLocalFallback(formData.file);
          return;
        }
      }

      console.log('📡 AssetImport: Upload URL received:', uploadData.assetId);

      setUploadProgress({
        stage: 'uploading',
        progress: 25,
        message: 'Uploading file...',
        assetId: uploadData.assetId,
      });

      // Step 2: Upload file to the presigned URL with proper error handling
      let uploadResponse;
      try {
        uploadResponse = await fetch(uploadData.uploadUrl, {
          method: 'PUT',
          body: formData.file,
          headers: {
            'Content-Type': formData.file.type || 'model/gltf-binary',
          },
        });

        if (!uploadResponse.ok) {
          if (uploadResponse.status === 403) {
            throw new Error('Upload URL has expired. Please try importing again.');
          } else if (uploadResponse.status === 413) {
            throw new Error('File is too large for upload. Please select a smaller file.');
          } else {
            throw new Error(`Upload failed: ${uploadResponse.statusText}`);
          }
        }
      } catch (uploadError: any) {
        console.error('❌ AssetImport: Upload failed:', uploadError);
        if (uploadError.name === 'TypeError' && uploadError.message.includes('fetch')) {
          throw new Error('Network error during upload. Please check your connection and try again.');
        }
        throw uploadError;
      }

      console.log('📤 AssetImport: File uploaded to storage');

      // Step 3: Notify upload completion to trigger processing
      await assetsApi.notifyUploadComplete(uploadData.assetId);

      console.log('✅ AssetImport: Upload completion notified');

      setUploadProgress({
        stage: 'processing',
        progress: 75,
        message: 'Processing 3D model...',
        assetId: uploadData.assetId,
      });

      // Step 4: Start enhanced polling with the new hook
      startPolling(uploadData.assetId, {
        pollInterval: 5000,
        maxPollAttempts: 60,
        onStatusUpdate: (status) => {
          console.log('🔄 AssetImport: Processing status update:', status);
        },
        onComplete: (status) => {
          console.log('✅ AssetImport: Processing completed:', status);
          console.log('🔍 DEBUG: Using NORMAL API PATH - this should create proper scene items');
          setUploadProgress({
            stage: 'complete',
            progress: 100,
            message: 'Import completed successfully!',
            assetId: status.assetId,
          });
          // Pass asset name (derived from file name) and category to callback
          const assetName = formData.file?.name.replace('.glb', '') || 'Unnamed Asset';
          console.log('🔍 DEBUG: Calling onImportComplete with:', { assetId: status.assetId, assetName, category: formData.category });
          onImportComplete?.(status.assetId, assetName, formData.category);
        },
        onError: (status) => {
          console.error('❌ AssetImport: Processing failed:', status);
          setUploadProgress({
            stage: 'error',
            progress: 0,
            message: 'Processing failed',
            errorDetails: status.errorMessage || 'Unknown processing error',
            assetId: status.assetId,
          });
        },
      });

    } catch (error) {
      console.error('❌ AssetImport: Upload failed:', error);
      setUploadProgress({
        stage: 'error',
        progress: 0,
        message: 'Upload failed',
        errorDetails: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [formData, validateForm, startPolling, onImportComplete]);

  if (!isOpen) return null;

  const canSubmit = uploadProgress.stage === 'idle' && validateForm() === null;
  const isUploading = uploadProgress.stage === 'uploading' || isPolling;
  const isProcessing = isPolling || uploadProgress.stage === 'processing';
  const showEnhancedStatus = processingStatus && (isProcessing || processingStatus.status !== AssetStatus.READY);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 text-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Package className="text-blue-400" size={24} />
            <h2 className="text-xl font-semibold">Import 3D Asset</h2>
          </div>
          {!isUploading && (
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* File Upload Area */}
          <div>
            <label className="block text-sm font-medium mb-2">GLB File</label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                formData.file 
                  ? 'border-green-500 bg-green-500/10' 
                  : 'border-gray-600 hover:border-gray-500'
              }`}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {formData.file ? (
                <div className="space-y-2">
                  <CheckCircle className="mx-auto text-green-400" size={48} />
                  <div className="font-medium">{formData.file.name}</div>
                  <div className="text-sm text-gray-400">
                    {(formData.file.size / (1024 * 1024)).toFixed(2)} MB
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    Choose different file
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="mx-auto text-gray-400" size={48} />
                  <div className="font-medium">Drop GLB file here or click to browse</div>
                  <div className="text-sm text-gray-400">
                    Maximum file size: 100MB
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded transition-colors"
                  >
                    Browse Files
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".glb"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Category</label>
            <CustomSelect
              options={AVAILABLE_CATEGORIES}
              value={formData.category}
              onChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              placeholder="Select a category..."
              required
            />
          </div>

          {/* License Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">License</label>
            <div className="space-y-2">
              {LICENSE_OPTIONS.map(option => (
                <label key={option.value} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="license"
                    value={option.value}
                    checked={formData.license === option.value}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      license: e.target.value as AssetLicense 
                    }))}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-gray-400">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Upload Progress - Enhanced with Processing Status */}
          {uploadProgress.stage !== 'idle' && (
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                {uploadProgress.stage === 'uploading' || uploadProgress.stage === 'processing' ? (
                  <Loader2 className="text-blue-400 animate-spin" size={20} />
                ) : uploadProgress.stage === 'complete' ? (
                  <CheckCircle className="text-green-400" size={20} />
                ) : (
                  <AlertCircle className="text-red-400" size={20} />
                )}
                <span className="font-medium">{uploadProgress.message}</span>
              </div>
              
              {uploadProgress.stage !== 'error' && (
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress.progress}%` }}
                  />
                </div>
              )}

              {uploadProgress.errorDetails && (
                <div className="mt-3 p-3 bg-red-900/50 rounded text-sm">
                  <strong>Error:</strong> {uploadProgress.errorDetails}
                </div>
              )}

              {uploadProgress.assetId && (
                <div className="mt-2 text-xs text-gray-400">
                  Asset ID: {uploadProgress.assetId}
                </div>
              )}
            </div>
          )}

          {/* Enhanced Processing Status Card */}
          {showEnhancedStatus && (
            <AssetProcessingStatusCard
              status={processingStatus}
              isRetrying={isRetrying}
              onRetry={retryProcessing}
              onRefresh={refreshStatus}
              className="mt-4"
            />
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
            {!isUploading && !isPolling && (
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
            )}
            
            {uploadProgress.stage === 'complete' || (processingStatus?.status === AssetStatus.READY) ? (
              <button
                type="button"
                onClick={handleClose}
                className="bg-green-500 hover:bg-green-600 px-6 py-2 rounded font-medium transition-colors"
              >
                Done
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canSubmit || isUploading}
                className={`px-6 py-2 rounded font-medium transition-colors ${
                  canSubmit && !isUploading
                    ? 'bg-blue-500 hover:bg-blue-600'
                    : 'bg-gray-600 cursor-not-allowed'
                }`}
              >
                {isUploading ? 'Importing...' : 'Import Asset'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}