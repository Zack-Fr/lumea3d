import { useState, useRef, useCallback } from 'react';
import { X, Upload, Package, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { AssetStatus, AssetLicense } from '@/api/sdk';
import { useAssetProcessing } from '@/hooks/useAssetProcessing';
import AssetProcessingStatusCard from '@/components/asset/AssetProcessingStatusCard';
import { assetsApi } from '@/services/assetsApi';

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
  { key: 'furniture', label: 'Furniture', description: 'Chairs, tables, sofas, etc.' },
  { key: 'decoration', label: 'Decoration', description: 'Art, plants, ornaments' },
  { key: 'lighting', label: 'Lighting', description: 'Lamps, chandeliers, fixtures' },
  { key: 'electronics', label: 'Electronics', description: 'TVs, computers, appliances' },
  { key: 'architecture', label: 'Architecture', description: 'Doors, windows, structural elements' },
  { key: 'misc', label: 'Miscellaneous', description: 'Other 3D objects' },
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
      alert('Please select a GLB file (.glb extension)');
      return;
    }

    // Validate file size (100MB max)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      alert('File size must be less than 100MB');
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
      alert('Please drop a GLB file (.glb extension)');
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

  const validateForm = useCallback((): string | null => {
    if (!formData.file) return 'Please select a GLB file';
    if (!formData.category) return 'Please select a category';
    return null;
  }, [formData]);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      alert(validationError);
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

      // Step 1: Request upload URL using authenticated API service
      const uploadData = await assetsApi.getUploadUrl({
        filename: formData.file.name,
        contentType: formData.file.type || 'model/gltf-binary',
        fileSize: formData.file.size,
        category: formData.category,
        metadata: formData.metadata,
      });

      console.log('📡 AssetImport: Upload URL received:', uploadData.assetId);

      setUploadProgress({
        stage: 'uploading',
        progress: 25,
        message: 'Uploading file...',
        assetId: uploadData.assetId,
      });

      // Step 2: Upload file to the presigned URL
      // For now, we'll simulate the upload and trigger completion
      const uploadResponse = await fetch(uploadData.uploadUrl, {
        method: 'PUT',
        body: formData.file,
        headers: {
          'Content-Type': formData.file.type || 'model/gltf-binary',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
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
          setUploadProgress({
            stage: 'complete',
            progress: 100,
            message: 'Import completed successfully!',
            assetId: status.assetId,
          });
          // Pass asset name (derived from file name) and category to callback
          const assetName = formData.file?.name.replace('.glb', '') || 'Unnamed Asset';
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
            <label className="block text-sm font-medium mb-2">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a category...</option>
              {AVAILABLE_CATEGORIES.map(cat => (
                <option key={cat.key} value={cat.key}>
                  {cat.label} - {cat.description}
                </option>
              ))}
            </select>
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