import React from 'react';
import { Button } from "../ui/Button";
import { ScrollArea } from "../ui/ScrollArea";
import { Plus, Search, Box, Palette, Image, Eye, EyeOff, Filter } from "lucide-react";
import { AssetCategory } from '../../types/projectEditor';
import { useSceneContext } from '../../contexts/SceneContext';
import AssetCard from './AssetCard';
import styles from '../../pages/projectEditor/ProjectEditor.module.css';

interface LeftSidebarProps {
  assetCategories: AssetCategory[];
  selectedTool: string;
  onToolChange: (tool: string) => void;
  selectedAsset: number | null;
  onAssetSelect: (assetId: number) => void;
  onAssetAdd: (assetName: string) => void;
  onImportAsset?: () => void;
  selectedItemId?: string | null; // For properties panel integration
  onItemSelect?: (itemId: string) => void; // For properties panel integration
}

const LeftSidebar: React.FC<LeftSidebarProps> = React.memo(({
  assetCategories,
  selectedTool,
  onToolChange,
  selectedAsset,
  onAssetSelect,
  onAssetAdd,
  onImportAsset,
  selectedItemId,
  onItemSelect
}) => {
  const { 
    sceneId, 
    categories: sceneCategories, 
    enabledCategories, 
    toggleCategory,
    isLoading,
    manifest
  } = useSceneContext();

  const getTabIcon = (categoryId: string) => {
    switch (categoryId) {
      case 'models': return Box;
      case 'materials': return Palette;
      case 'textures': return Image;
      default: return Box;
    }
  };

  const getCategoryIcon = (category: any) => {
    // Handle both string and object formats
    const categoryName = typeof category === 'string' ? category : category?.categoryKey || '';
    if (!categoryName || typeof categoryName !== 'string') {
      return Filter; // Default icon for invalid categories
    }
    
    const lowerName = categoryName.toLowerCase();
    if (lowerName.includes('shell') || lowerName.includes('structure')) return Box;
    if (lowerName.includes('lighting') || lowerName.includes('light')) return Palette;
    if (lowerName.includes('furniture') || lowerName.includes('seating')) return Box;
    if (lowerName.includes('decoration') || lowerName.includes('accessory')) return Image;
    return Filter;
  };

  // If scene is loaded, show category filters and uploaded assets
  if (sceneId && sceneCategories && Array.isArray(sceneCategories) && sceneCategories.length > 0) {
    const uploadedAssets = manifest?.items || [];
    
    console.log('🎯 LeftSidebar: Scene mode active', {
      sceneId,
      sceneCategoriesCount: sceneCategories.length,
      sceneCategories: sceneCategories,
      uniqueCategories: [...new Set(sceneCategories.map((cat: any) => typeof cat === 'string' ? cat : cat?.categoryKey || ''))],
      uploadedAssetsCount: uploadedAssets.length,
      uploadedAssets: uploadedAssets,
      manifestStructure: {
        hasManifest: !!manifest,
        hasItems: !!manifest?.items,
        itemsLength: manifest?.items?.length || 0,
        firstItem: uploadedAssets[0] || null
      }
    });
    
    return (
      <aside className={styles.leftSidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarTitleRow}>
            <h2 className={styles.sidebarTitle}>Scene Assets</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              className={styles.addButton}
              onClick={onImportAsset}
              title="Import new 3D asset"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          <div className={styles.searchContainer}>
            <Search className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search assets..."
              className={styles.searchInput}
            />
          </div>
        </div>

        <ScrollArea className={styles.assetsScrollArea}>
          <div className={styles.assetsContainer}>
            {/* Uploaded Assets Section */}
            {uploadedAssets.length > 0 && (
              <div className={styles.uploadedAssetsSection}>
                <div className={styles.sectionHeader}>
                  <Box className="w-4 h-4" />
                  <span className={styles.sectionTitle}>
                    Uploaded Assets ({uploadedAssets.length})
                  </span>
                </div>
                
                <div className={styles.assetList}>
                  {uploadedAssets.map((item, index) => {
                    // Handle both string and object category formats
                    const categoryName = typeof item.category === 'string' ? item.category : (item.category as any)?.categoryKey || '';
                    const isCategoryEnabled = enabledCategories.includes(categoryName) || enabledCategories.length === 0;
                    
                    // Create unique key using combination of sceneId, id and index to prevent duplicates
                    const uniqueKey = `${sceneId}-${item.id || 'item'}-${index}`;
                    
                    const isSelected = selectedItemId === item.id;
                    
                    return (
                      <div
                        key={uniqueKey}
                        className={`${styles.assetItem} ${isCategoryEnabled ? styles.assetEnabled : styles.assetDisabled} ${isSelected ? styles.assetSelected : ''}`}
                        draggable={isCategoryEnabled}
                        onDragStart={(e) => {
                          if (!isCategoryEnabled) {
                            e.preventDefault();
                            return;
                          }
                          
                          // Store the item data for drop handling
                          const dragData = {
                            type: 'asset',
                            item: item,
                            categoryName: categoryName
                          };
                          e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                          e.dataTransfer.effectAllowed = 'copy';
                          
                          console.log('📦 LeftSidebar: Started dragging asset:', dragData);
                        }}
                        onClick={() => {
                          // Handle asset selection for properties panel
                          console.log('Asset selected:', item);
                          if (onItemSelect && item.id) {
                            onItemSelect(item.id);
                          }
                        }}
                        style={{ cursor: isCategoryEnabled ? 'grab' : 'not-allowed' }}
                      >
                        <div className={styles.assetIcon}>
                          <Box className="w-4 h-4" />
                        </div>
                        <div className={styles.assetInfo}>
                          <span className={styles.assetName}>
                            {item.name || item.meta?.assetName || `Item ${index + 1}`}
                          </span>
                          <span className={styles.assetCategory}>
                            {categoryName || 'Unknown'}
                          </span>
                        </div>
                        <div className={styles.assetActions}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle adding asset to scene
                              onAssetAdd?.(item.name);
                            }}
                            title="Add to scene"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Category Filters Section */}
            <div className={styles.categoryFilters}>
              <div className={styles.categoryFiltersHeader}>
                <Filter className="w-4 h-4" />
                <span className={styles.categoryFiltersTitle}>
                  Filter Categories ({sceneCategories.length} available)
                </span>
              </div>
              
              {isLoading && (
                <div className={styles.categoryLoadingState}>
                  <span>Loading categories...</span>
                </div>
              )}
              
              <div className={styles.categoryList}>
                {[...new Set(sceneCategories.map((category: any) => typeof category === 'string' ? category : category?.categoryKey || ''))].map((categoryKey: string, index: number) => {
                  const originalCategory = sceneCategories.find((cat: any) => 
                    (typeof cat === 'string' ? cat : cat?.categoryKey || '') === categoryKey
                  );
                  const isEnabled = enabledCategories.includes(categoryKey) || enabledCategories.length === 0;
                  const IconComponent = getCategoryIcon(originalCategory);
                  
                  // Create unique key using combination of sceneId, categoryKey and index
                  const uniqueKey = `${sceneId}-${categoryKey}-${index}`;
                  
                  return (
                    <div
                      key={uniqueKey}
                      className={`${styles.categoryFilterItem} ${isEnabled ? styles.categoryFilterEnabled : styles.categoryFilterDisabled}`}
                      onClick={() => toggleCategory(categoryKey)}
                    >
                      <div className={styles.categoryFilterLeft}>
                        <IconComponent className="w-4 h-4" />
                        <span className={styles.categoryFilterName}>
                          {categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1)}
                        </span>
                      </div>
                      <div className={styles.categoryFilterToggle}>
                        {isEnabled ? (
                          <Eye className="w-4 h-4 text-green-500" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className={styles.categoryFiltersFooter}>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    // Enable all categories
                    const uniqueCategoryKeys = [...new Set(sceneCategories.map((cat: any) => typeof cat === 'string' ? cat : cat?.categoryKey || ''))];
                    uniqueCategoryKeys.forEach(categoryKey => {
                      if (categoryKey && !enabledCategories.includes(categoryKey)) {
                        toggleCategory(categoryKey);
                      }
                    });
                  }}
                  className={styles.categoryFilterButton}
                >
                  Show All
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    // Disable all categories
                    const uniqueCategoryKeys = [...new Set(sceneCategories.map((cat: any) => typeof cat === 'string' ? cat : cat?.categoryKey || ''))];
                    uniqueCategoryKeys.forEach(categoryKey => {
                      if (categoryKey && enabledCategories.includes(categoryKey)) {
                        toggleCategory(categoryKey);
                      }
                    });
                  }}
                  className={styles.categoryFilterButton}
                >
                  Hide All
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </aside>
    );
  }

  // Fallback to original asset categories when no scene is loaded
  const currentCategory = assetCategories.find(cat => cat.id === selectedTool) || assetCategories[0];

  console.log('🔄 LeftSidebar: Fallback mode active', {
    sceneId,
    sceneCategoriesCount: sceneCategories.length,
    sceneCategories: sceneCategories,
    currentCategory: currentCategory?.id,
    assetCategoriesCount: assetCategories.length
  });

  return (
    <aside className={styles.leftSidebar}>
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarTitleRow}>
          <h2 className={styles.sidebarTitle}>Assets & Materials</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            className={styles.addButton}
            onClick={onImportAsset}
            title="Import new 3D asset"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        
        <div className={styles.searchContainer}>
          <Search className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search assets..."
            className={styles.searchInput}
          />
        </div>
      </div>

      <div className={styles.tabsContainer}>
        <div className={styles.tabsWrapper}>
          <div className={styles.tabsList}>
            {assetCategories.map((category) => {
              const IconComponent = getTabIcon(category.id);
              return (
                <button
                  key={category.id}
                  onClick={() => onToolChange(category.id)}
                  className={`${styles.tabTrigger} ${selectedTool === category.id ? 'active' : ''}`}
                >
                  <IconComponent className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        </div>

        <ScrollArea className={styles.assetsScrollArea}>
          <div className={styles.assetsContainer}>
            <div className={styles.tabContent}>
              <div className={styles.assetList}>
                {currentCategory.items.map((item) => (
                  <AssetCard
                    key={item.id}
                    asset={item}
                    categoryIcon={currentCategory.icon}
                    isSelected={selectedAsset === item.id}
                    onSelect={onAssetSelect}
                    onAdd={onAssetAdd}
                  />
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
});

LeftSidebar.displayName = 'LeftSidebar';

export default LeftSidebar;