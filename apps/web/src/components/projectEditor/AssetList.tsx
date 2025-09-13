import React, { useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { 
  Box, 
  Plus, 
  EyeOff,
  MoreHorizontal,
  Move3d
} from 'lucide-react';
import { MESH_CATEGORIES } from './CategoryFilter';

interface AssetItem {
  id: string;
  name?: string;
  category?: string | { categoryKey: string };
  meta?: {
    assetName?: string;
    assetId?: string;
    uploadedAt?: string;
    isImported?: boolean;
  };
  transform?: {
    position?: [number, number, number];
    rotation_euler?: [number, number, number];
    scale?: [number, number, number];
  };
}

interface AssetListProps {
  assets: AssetItem[];
  enabledCategories: string[];
  searchTerm: string;
  viewMode: 'grid' | 'list';
  selectedItemId?: string | null;
  
  // Callbacks
  onAssetSelect: (assetId: string) => void;
  onAssetAdd: (assetName: string) => void;
  onAssetDuplicate?: (asset: AssetItem) => void;
  onAssetDelete?: (assetId: string) => void;
  onAssetEdit?: (assetId: string) => void;
  
  // Drag and drop
  onDragStart?: (e: React.DragEvent, asset: AssetItem, categoryName: string) => void;
  
  className?: string;
}

const AssetList: React.FC<AssetListProps> = ({
  assets,
  enabledCategories,
  searchTerm,
  viewMode,
  selectedItemId,
  onAssetSelect,
  onAssetAdd,
  onAssetDuplicate,
  onAssetDelete,
  onAssetEdit,
  onDragStart,
  className = ''
}) => {
  const [hoveredAssetId, setHoveredAssetId] = useState<string | null>(null);
  // Remove unused variable warning - hoveredAssetId used in future features
  hoveredAssetId;

  // Filter and categorize assets
  const filteredAssets = useMemo(() => {
    let filtered = assets;

    // Filter by enabled categories (if any are specifically enabled)
    if (enabledCategories.length > 0) {
      filtered = filtered.filter(asset => {
        const categoryName = typeof asset.category === 'string' 
          ? asset.category 
          : (asset.category as any)?.categoryKey || '';
        return enabledCategories.includes(categoryName);
      });
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(asset => {
        const assetName = asset.name || asset.meta?.assetName || '';
        const categoryName = typeof asset.category === 'string' 
          ? asset.category 
          : (asset.category as any)?.categoryKey || '';
        
        return assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
               categoryName.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    return filtered;
  }, [assets, enabledCategories, searchTerm]);

  // Group assets by category
  const groupedAssets = useMemo(() => {
    const groups: Record<string, AssetItem[]> = {};
    
    filteredAssets.forEach(asset => {
      const categoryName = typeof asset.category === 'string' 
        ? asset.category 
        : (asset.category as any)?.categoryKey || 'uncategorized';
      
      if (!groups[categoryName]) {
        groups[categoryName] = [];
      }
      groups[categoryName].push(asset);
    });

    return groups;
  }, [filteredAssets]);

  // Get category icon
  const getCategoryIcon = (categoryKey: string) => {
    const lowerKey = categoryKey.toLowerCase();
    
    for (const [, config] of Object.entries(MESH_CATEGORIES)) {
      if (config.subcategories.some(sub => lowerKey.includes(sub))) {
        return config.icon;
      }
    }
    
    return Box;
  };

  // Format asset name
  const formatAssetName = (asset: AssetItem) => {
    return asset.name || asset.meta?.assetName || 'Unnamed Asset';
  };

  // Get asset preview (placeholder for now)
  const getAssetPreview = (_asset: AssetItem) => {
    // In a real implementation, this would return a thumbnail URL
    return null;
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, asset: AssetItem, categoryName: string) => {
    if (onDragStart) {
      onDragStart(e, asset, categoryName);
    } else {
      // Default drag behavior
      const dragData = {
        type: 'asset',
        item: asset,
        categoryName: categoryName
      };
      e.dataTransfer.setData('application/json', JSON.stringify(dragData));
      e.dataTransfer.effectAllowed = 'copy';
    }
  };

  if (filteredAssets.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <Box className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <div className="text-sm font-medium">No assets found</div>
        <div className="text-xs mt-1">
          {searchTerm ? 'Try adjusting your search term' : 'Import 3D assets to get started'}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Assets summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>{filteredAssets.length} asset{filteredAssets.length !== 1 ? 's' : ''} found</span>
        <span>{Object.keys(groupedAssets).length} categor{Object.keys(groupedAssets).length !== 1 ? 'ies' : 'y'}</span>
      </div>

      {/* Grouped assets */}
      {Object.entries(groupedAssets).map(([categoryName, categoryAssets]) => {
        const IconComponent = getCategoryIcon(categoryName);
        const isCategoryEnabled = enabledCategories.includes(categoryName) || enabledCategories.length === 0;

        return (
          <div key={categoryName} className="space-y-2">
            {/* Category header */}
            <div className="flex items-center gap-2 py-2 border-b ">
              <IconComponent className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-sm text-white">
                {categoryName.split('_').map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
              </span>
              <span className="text-xs text-white bg-[var(--glass-maroon)] 0 px-2 py-0.5 rounded-full">
                {categoryAssets.length}
              </span>
              {!isCategoryEnabled && (
                <EyeOff className="w-3 h-3 text-gray-400" />
              )}
            </div>

            {/* Assets grid/list */}
            <div className={`
              ${viewMode === 'grid' 
                ? 'grid grid-cols-1 sm:grid-cols-2 gap-2' 
                : 'space-y-1'
              }
            `}>
              {categoryAssets.map((asset, index) => {
                const isSelected = selectedItemId === asset.id;
                const assetName = formatAssetName(asset);

                return (
                  <div
                    key={`${asset.id}-${index}`}
                    className={`
                      group relative cursor-pointer transition-all duration-200
                      ${viewMode === 'grid' 
                        ? 'p-3 rounded-lg border' 
                        : 'flex items-center gap-3 p-2 rounded-md'
                      }
                      ${isSelected 
                        ? ' border-blue-200 shadow-sm' 
                        : 'bg-[var(--glass-maroon)] border-gray-200 hover:bg-[var(--glass-yellow-dark)] hover:shadow-sm'
                      }
                      ${!isCategoryEnabled ? 'opacity-60' : ''}
                    `}
                    draggable={isCategoryEnabled}
                    onDragStart={(e) => handleDragStart(e, asset, categoryName)}
                    onClick={() => onAssetSelect(asset.id)}
                    onMouseEnter={() => setHoveredAssetId(asset.id)}
                    onMouseLeave={() => setHoveredAssetId(null)}
                  >
                    {/* Asset thumbnail/icon */}
                    <div className={`
                      flex-shrink-0
                      ${viewMode === 'grid' ? 'w-full h-20 mb-2' : 'w-10 h-10'}
                    `}>
                      {getAssetPreview(asset) ? (
                        <img 
                          src={getAssetPreview(asset)!} 
                          alt={assetName}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <div className={`
                          w-full h-full bg-gray-100 rounded flex items-center justify-center
                          ${viewMode === 'grid' ? '' : 'w-10 h-10'}
                        `}>
                          <IconComponent className={`
                            text-gray-400
                            ${viewMode === 'grid' ? 'w-8 h-8' : 'w-4 h-4'}
                          `} />
                        </div>
                      )}
                    </div>

                    {/* Asset info */}
                    <div className={`
                      min-w-0 flex-1
                      ${viewMode === 'grid' ? 'space-y-1' : 'space-y-0'}
                    `}>
                      <div className={`
                        font-medium truncate
                        ${viewMode === 'grid' ? 'text-sm' : 'text-sm'}
                        ${isSelected ? 'text-blue-900' : 'text-gray-900'}
                      `}>
                        {assetName}
                      </div>
                      
                      {viewMode === 'grid' && (
                        <div className="text-xs text-gray-500 truncate">
                          {categoryName.replace('_', ' ')}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className={`
                      flex items-center gap-1
                      ${viewMode === 'grid' 
                        ? 'absolute top-2 right-2 opacity-0 group-hover:opacity-100' 
                        : 'opacity-0 group-hover:opacity-100'
                      }
                      transition-opacity duration-200
                    `}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAssetAdd(assetName);
                        }}
                        title="Add to scene"
                        className="p-1 w-6 h-6"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      
                      {onAssetDuplicate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAssetDuplicate(asset);
                          }}
                          title="Duplicate asset"
                          className="p-1 w-6 h-6"
                        >
                        <Move3d className="w-3 h-3" />
                        </Button>
                      )}

                      {(onAssetEdit || onAssetDelete) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="More actions"
                          className="p-1 w-6 h-6"
                        >
                          <MoreHorizontal className="w-3 h-3" />
                        </Button>
                      )}
                    </div>

                    {/* Drag indicator */}
                    {viewMode === 'grid' && (
                      <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="text-xs text-gray-400 bg-white/80 px-1 py-0.5 rounded">
                          Drag to add
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AssetList;
