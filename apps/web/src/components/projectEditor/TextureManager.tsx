import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from "../ui/Button";
import { ScrollArea } from "../ui/ScrollArea";
import { 
  Image as ImageIcon,
  Upload,
  X,
  Download,
  Eye,
  Loader,
  AlertTriangle,
  Check,
  Search,
  Grid,
  List
} from "lucide-react";
import styles from '../../pages/projectEditor/ProjectEditor.module.css';
import { 
  TextureMetadata, 
  TextureMapType, 
} from '../../utils/textureManager';

interface TextureManagerProps {
  show: boolean;
  onClose: () => void;
  onTextureSelected: (url: string, type: TextureMapType) => void;
  currentTextureType: TextureMapType;
  currentTextureUrl?: string;
  currentTextureName?: string;
}

interface TexturePreviewProps {
  texture: TextureMetadata;
  isSelected: boolean;
  onClick: (texture: TextureMetadata) => void;
  onPreview: (texture: TextureMetadata) => void;
  loading?: boolean;
}

const TexturePreview: React.FC<TexturePreviewProps> = ({ 
  texture, 
  isSelected, 
  onClick, 
  onPreview, 
  loading 
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <div 
      className={`${styles.texturePreview} ${isSelected ? styles.texturePreviewSelected : ''}`}
      onClick={() => onClick(texture)}
    >
      <div className={styles.texturePreviewImage}>
        {loading && (
          <div className={styles.texturePreviewLoading}>
            <Loader className="w-4 h-4 animate-spin" />
          </div>
        )}
        
        {!imageError ? (
          <img
            src={texture.previewUrl || texture.url}
            alt={texture.name}
            className={`${styles.textureImage} ${imageLoaded ? styles.textureImageLoaded : ''}`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className={styles.texturePreviewPlaceholder}>
            <ImageIcon className="w-8 h-8 text-gray-500" />
          </div>
        )}
        
        <div className={styles.texturePreviewOverlay}>
          <button 
            className={styles.texturePreviewAction}
            onClick={(e) => {
              e.stopPropagation();
              onPreview(texture);
            }}
            title="Preview texture"
          >
            <Eye className="w-3 h-3" />
          </button>
        </div>
      </div>
      
      <div className={styles.texturePreviewInfo}>
        <div className={styles.texturePreviewName}>{texture.name}</div>
        <div className={styles.texturePreviewMeta}>
          <span className={styles.textureFormat}>{texture.format.toUpperCase()}</span>
          {texture.size && (
            <span className={styles.textureDimensions}>
              {texture.size.width}×{texture.size.height}
            </span>
          )}
        </div>
      </div>
      
      {isSelected && (
        <div className={styles.textureSelectedIndicator}>
          <Check className="w-3 h-3" />
        </div>
      )}
    </div>
  );
};

const TextureManager: React.FC<TextureManagerProps> = ({ 
  show, 
  onClose, 
  onTextureSelected,
  currentTextureType,
  currentTextureUrl,
  currentTextureName
}) => {
  const [textures, setTextures] = useState<TextureMetadata[]>([]);
  const [selectedTexture, setSelectedTexture] = useState<TextureMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<TextureMapType | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [customUrl, setCustomUrl] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize textures
  useEffect(() => {
    if (show) {
      // Sample texture data (in real app, this would come from API/CDN)
      const sampleTextures: TextureMetadata[] = [
        {
          id: 'texture_1',
          name: 'Brick Wall',
          url: 'https://threejs.org/examples/textures/brick_diffuse.jpg',
          format: 'jpg',
          type: 'baseColor',
          size: { width: 512, height: 512 },
          category: 'architectural',
          tags: ['brick', 'wall', 'building']
        },
        {
          id: 'texture_2',
          name: 'Wood Planks',
          url: 'https://threejs.org/examples/textures/hardwood2_diffuse.jpg',
          format: 'jpg',
          type: 'baseColor',
          size: { width: 1024, height: 1024 },
          category: 'wood',
          tags: ['wood', 'planks', 'natural']
        },
        {
          id: 'texture_3',
          name: 'Metal Scratched',
          url: 'https://threejs.org/examples/textures/metal_roof_diff_512x512.jpg',
          format: 'jpg',
          type: 'baseColor',
          size: { width: 512, height: 512 },
          category: 'metal',
          tags: ['metal', 'scratched', 'industrial']
        },
        {
          id: 'texture_4',
          name: 'Brick Normal',
          url: 'https://threejs.org/examples/textures/brick_bump.jpg',
          format: 'jpg',
          type: 'normal',
          size: { width: 512, height: 512 },
          category: 'architectural',
          tags: ['brick', 'normal', 'bump']
        }
      ];
      
      setTextures(sampleTextures);
    }
  }, [show]);

  // Filter textures based on search and type
  const filteredTextures = textures.filter(texture => {
    const matchesSearch = texture.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         texture.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || texture.type === filterType;
    
    return matchesSearch && matchesType;
  });

  const handleTextureClick = useCallback((texture: TextureMetadata) => {
    setSelectedTexture(texture);
  }, []);

  const handleTexturePreview = useCallback((texture: TextureMetadata) => {
    // TODO: Implement texture preview modal
    console.log('Preview texture:', texture);
  }, []);

  const handleApplyTexture = useCallback(async () => {
    if (!selectedTexture) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await onTextureSelected(selectedTexture.url, currentTextureType);
      console.log(`✅ Applied texture: ${selectedTexture.name} as ${currentTextureType}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to apply texture';
      setError(errorMessage);
      console.error('❌ Failed to apply texture:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedTexture, currentTextureType, onTextureSelected]);

  const handleCustomUrl = useCallback(async () => {
    if (!customUrl.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await onTextureSelected(customUrl.trim(), currentTextureType);
      console.log(`✅ Applied custom texture: ${customUrl} as ${currentTextureType}`);
      setCustomUrl('');
      setShowCustomInput(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load custom texture';
      setError(errorMessage);
      console.error('❌ Failed to apply custom texture:', err);
    } finally {
      setLoading(false);
    }
  }, [customUrl, currentTextureType, onTextureSelected]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create object URL for local file
    const objectUrl = URL.createObjectURL(file);
    
    // Create temporary texture metadata
    const tempTexture: TextureMetadata = {
      id: `upload_${Date.now()}`,
      name: file.name.replace(/\.[^/.]+$/, ''),
      url: objectUrl,
      format: file.name.split('.').pop()?.toLowerCase() as any || 'unknown',
      type: currentTextureType,
      fileSize: file.size
    };

    // Add to textures list and select it
    setTextures(prev => [tempTexture, ...prev]);
    setSelectedTexture(tempTexture);
    
    console.log('📁 File uploaded:', file.name);
  }, [currentTextureType]);

  const textureTypeOptions: { value: TextureMapType | 'all'; label: string }[] = [
    { value: 'all', label: 'All Types' },
    { value: 'baseColor', label: 'Base Color' },
    { value: 'normal', label: 'Normal Map' },
    { value: 'metallicRoughness', label: 'Metallic Roughness' },
    { value: 'metallic', label: 'Metallic' },
    { value: 'roughness', label: 'Roughness' },
    { value: 'emissive', label: 'Emissive' },
    { value: 'occlusion', label: 'Occlusion' },
    { value: 'opacity', label: 'Opacity' }
  ];

  if (!show) return null;

  return (
    <div className={styles.textureManager}>
      <div className={styles.textureManagerOverlay} onClick={onClose} />
      
      <div className={styles.textureManagerPanel}>
        <div className={styles.textureManagerHeader}>
          <div className={styles.textureManagerTitle}>
            <ImageIcon className="w-5 h-5 mr-2" />
            Texture Manager
            <span className={styles.textureManagerSubtitle}>
              {currentTextureType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className={styles.textureManagerClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Current Texture Display */}
        {currentTextureUrl && (
          <div className={styles.currentTextureSection}>
            <div className={styles.currentTextureHeader}>
              <span className={styles.currentTextureLabel}>Current Texture:</span>
              <button
                className={styles.currentTextureClear}
                onClick={() => onTextureSelected('', currentTextureType)}
                title="Remove current texture"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className={styles.currentTexturePreview}>
              {(() => {
                // Helper function to get a user-friendly texture name
                const getTextureName = (url: string, type: string, providedName?: string): string => {
                  // If we have a provided name, use it with cleanup
                  if (providedName) {
                    return providedName
                      .replace(/_/g, ' ')
                      .replace(/([a-z])([A-Z])/g, '$1 $2')
                      .replace(/\b\w/g, l => l.toUpperCase())
                      .trim();
                  }
                  
                  // Safety check for URL
                  if (!url || typeof url !== 'string') {
                    return `${type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} Texture`;
                  }
                  
                  // If it's a data URL (generated placeholder), create a friendly name
                  if (url.startsWith('data:')) {
                    return `${type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} Texture`;
                  }
                  
                  // If it's a blob URL (uploaded file), try to get original name if available
                  if (url.startsWith('blob:')) {
                    return 'Uploaded Texture';
                  }
                  
                  // For regular URLs, extract filename without extension
                  try {
                    const urlParts = url.split('/');
                    const filename = urlParts[urlParts.length - 1];
                    const nameWithoutExt = filename.split('.')[0];
                    
                    // Clean up common texture naming patterns
                    return nameWithoutExt
                      .replace(/_/g, ' ')
                      .replace(/([a-z])([A-Z])/g, '$1 $2')
                      .replace(/\b\w/g, l => l.toUpperCase())
                      .trim();
                  } catch {
                    return 'Current Texture';
                  }
                };
                
                const textureName = getTextureName(currentTextureUrl, currentTextureType, currentTextureName);
                
                return (
                  <>
                    <img
                      src={currentTextureUrl}
                      alt={`Current ${currentTextureType} texture`}
                      className={styles.currentTextureImage}
                      onError={(e) => {
                        // If image fails to load, show a placeholder
                        const img = e.target as HTMLImageElement;
                        img.style.display = 'none';
                        const placeholder = img.nextElementSibling as HTMLElement;
                        if (placeholder) placeholder.style.display = 'flex';
                      }}
                    />
                    <div 
                      className={styles.currentTexturePlaceholder}
                      style={{ display: 'none' }}
                    >
                      <ImageIcon className="w-6 h-6 text-gray-400" />
                    </div>
                    <div className={styles.currentTextureInfo}>
                      <span className={styles.currentTextureName}>
                        {textureName}
                      </span>
                      <span className={styles.currentTextureType}>
                        {currentTextureType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        <div className={styles.textureManagerControls}>
          <div className={styles.textureManagerSearch}>
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search textures..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.textureSearchInput}
            />
          </div>
          
          <div className={styles.textureManagerFilters}>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as TextureMapType | 'all')}
              className={styles.textureFilterSelect}
            >
              {textureTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            
            <div className={styles.textureViewToggle}>
              <button
                className={`${styles.textureViewButton} ${viewMode === 'grid' ? styles.textureViewButtonActive : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                className={`${styles.textureViewButton} ${viewMode === 'list' ? styles.textureViewButtonActive : ''}`}
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className={styles.textureManagerActions}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCustomInput(!showCustomInput)}
            disabled={loading}
          >
            <Download className="w-4 h-4 mr-2" />
            Load URL
          </Button>
        </div>

        {showCustomInput && (
          <div className={styles.textureCustomInput}>
            <input
              type="url"
              placeholder="https://example.com/texture.jpg"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className={styles.textureUrlInput}
              onKeyDown={(e) => e.key === 'Enter' && handleCustomUrl()}
            />
            <Button
              size="sm"
              onClick={handleCustomUrl}
              disabled={!customUrl.trim() || loading}
            >
              Load
            </Button>
          </div>
        )}

        <ScrollArea className={styles.textureManagerContent}>
          <div className={`${styles.textureGrid} ${viewMode === 'list' ? styles.textureList : ''}`}>
            {filteredTextures.map(texture => (
              <TexturePreview
                key={texture.id}
                texture={texture}
                isSelected={selectedTexture?.id === texture.id}
                onClick={handleTextureClick}
                onPreview={handleTexturePreview}
                loading={loading && selectedTexture?.id === texture.id}
              />
            ))}
            
            {filteredTextures.length === 0 && (
              <div className={styles.textureEmptyState}>
                <ImageIcon className="w-12 h-12 text-gray-400 mb-3" />
                <p className="text-gray-500">No textures found</p>
                {searchTerm && (
                  <p className="text-sm text-gray-400">
                    Try adjusting your search or filters
                  </p>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className={styles.textureManagerFooter}>
          {error && (
            <div className={styles.textureError}>
              <AlertTriangle className="w-4 h-4 mr-2" />
              {error}
            </div>
          )}
          
          {selectedTexture && (
            <div className={styles.textureSelectedInfo}>
              <div className={styles.textureSelectedDetails}>
                <strong>{selectedTexture.name}</strong>
                <span className={styles.textureSelectedMeta}>
                  {selectedTexture.format.toUpperCase()}
                  {selectedTexture.size && (
                    <> • {selectedTexture.size.width}×{selectedTexture.size.height}</>
                  )}
                  {selectedTexture.fileSize && (
                    <> • {(selectedTexture.fileSize / 1024).toFixed(1)}KB</>
                  )}
                </span>
              </div>
              
              <Button
                onClick={handleApplyTexture}
                disabled={loading}
                size="sm"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Apply Texture
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
};

export default TextureManager;