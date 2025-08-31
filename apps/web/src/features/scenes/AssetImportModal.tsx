import { useState, useRef, useCallback } from 'react';
import { X, Upload, Package, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { AssetStatus, AssetLicense } from '@lumea/shared';

interface AssetImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportComplete?: (assetId: string) => void;
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
  }, []);

  const handleClose = useCallback(() => {
    if (uploadProgress.stage === 'uploading' || uploadProgress.stage === 'processing') {
      return; // Prevent closing during upload
    }
    resetForm();
    onClose();
  }, [uploadProgress.stage, resetForm, onClose]);

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

      // Step 1: Request upload URL
      const uploadUrlResponse = await fetch('/api/assets/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: formData.file.name,
          contentType: formData.file.type || 'model/gltf-binary',
          fileSize: formData.file.size,
          category: formData.category,
          metadata: formData.metadata,
        }),
      });

      if (!uploadUrlResponse.ok) {
        throw new Error(`Failed to get upload URL: ${uploadUrlResponse.statusText}`);
      }

      const uploadData = await uploadUrlResponse.json();
      console.log('📡 AssetImport: Upload URL received:', uploadData.asset_id);

      setUploadProgress({
        stage: 'uploading',
        progress: 25,
        message: 'Uploading file...',
        assetId: uploadData.asset_id,
      });

      // Step 2: Upload file (this would be to S3 or similar storage)
      // For now, we'll simulate the upload and create the asset record directly
      const createAssetResponse = await fetch('/api/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalName: formData.file.name,
          mimeType: formData.file.type || 'model/gltf-binary',
          fileSize: formData.file.size,
          status: AssetStatus.PROCESSING,
          license: formData.license,
          reportJson: formData.metadata,
        }),
      });

      if (!createAssetResponse.ok) {
        throw new Error(`Failed to create asset: ${createAssetResponse.statusText}`);
      }

      const assetData = await createAssetResponse.json();
      console.log('✅ AssetImport: Asset created:', assetData.id);

      setUploadProgress({
        stage: 'processing',
        progress: 75,
        message: 'Processing 3D model...',
        assetId: assetData.id,
      });

      // Step 3: Poll for processing completion
      await pollAssetProcessing(assetData.id);

    } catch (error) {
      console.error('❌ AssetImport: Upload failed:', error);
      setUploadProgress({
        stage: 'error',
        progress: 0,
        message: 'Upload failed',
        errorDetails: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [formData, validateForm]);

  const pollAssetProcessing = useCallback(async (assetId: string) => {
    const maxAttempts = 30; // 5 minutes with 10-second intervals
    let attempts = 0;

    const poll = async (): Promise<void> => {
      try {
        const response = await fetch(`/api/assets/${assetId}/status`);
        if (!response.ok) {
          throw new Error(`Failed to check asset status: ${response.statusText}`);
        }

        const statusData = await response.json();
        console.log('🔄 AssetImport: Processing status:', statusData.status);

        if (statusData.status === AssetStatus.READY) {
          setUploadProgress({
            stage: 'complete',
            progress: 100,
            message: 'Import completed successfully!',
            assetId,
          });

          // Notify parent component
          onImportComplete?.(assetId);
          return;
        }

        if (statusData.status === AssetStatus.FAILED) {
          throw new Error(statusData.errorMessage || 'Processing failed');
        }

        // Still processing
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error('Processing timeout - please check asset status later');
        }

        setUploadProgress(prev => ({
          ...prev,
          progress: Math.min(75 + (attempts / maxAttempts) * 20, 95),
          message: `Processing 3D model... (${attempts}/${maxAttempts})`,
        }));

        // Continue polling
        setTimeout(poll, 10000); // Poll every 10 seconds
      } catch (error) {
        console.error('❌ AssetImport: Processing check failed:', error);
        setUploadProgress({
          stage: 'error',
          progress: 0,
          message: 'Processing failed',
          errorDetails: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    poll();
  }, [onImportComplete]);

  if (!isOpen) return null;

  const canSubmit = uploadProgress.stage === 'idle' && validateForm() === null;
  const isUploading = uploadProgress.stage === 'uploading' || uploadProgress.stage === 'processing';

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

          {/* Upload Progress */}
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

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
            {!isUploading && (
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
            )}
            
            {uploadProgress.stage === 'complete' ? (
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