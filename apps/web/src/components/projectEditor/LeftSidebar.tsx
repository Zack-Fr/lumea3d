import React, { useState, useMemo } from 'react';
import { Button } from "../ui/Button";
import { ScrollArea } from "../ui/ScrollArea";
import { Plus, Box, Palette, Image, Search } from "lucide-react";
import { AssetCategory } from '../../types/projectEditor';
import { useSceneContext } from '../../contexts/SceneContext';
import AssetCard from './AssetCard';
import CategoryFilter from './CategoryFilter';
import AssetList from './AssetList';
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
    manifest
  } = useSceneContext();

  // Local state for filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const getTabIcon = (categoryId: string) => {
    switch (categoryId) {
      case 'models': return Box;
      case 'materials': return Palette;
      case 'textures': return Image;
      default: return Box;
    }
  };


  // Calculate category counts for filtering
  const categoryCounts = useMemo(() => {
    const uploadedAssets = manifest?.items || [];
    const counts: Record<string, number> = {};
    
    uploadedAssets.forEach(item => {
      const categoryName = typeof item.category === 'string' 
        ? item.category 
        : (item.category as any)?.categoryKey || 'uncategorized';
      counts[categoryName] = (counts[categoryName] || 0) + 1;
    });
    
    return counts;
  }, [manifest?.items]);

  // Category filter actions
  const handleShowAllCategories = () => {
    const uniqueCategoryKeys = [...new Set(sceneCategories.map((cat: any) => 
      typeof cat === 'string' ? cat : cat?.categoryKey || ''
    ))];
    uniqueCategoryKeys.forEach(categoryKey => {
      if (categoryKey && !enabledCategories.includes(categoryKey)) {
        toggleCategory(categoryKey);
      }
    });
  };

  const handleHideAllCategories = () => {
    const uniqueCategoryKeys = [...new Set(sceneCategories.map((cat: any) => 
      typeof cat === 'string' ? cat : cat?.categoryKey || ''
    ))];
    uniqueCategoryKeys.forEach(categoryKey => {
      if (categoryKey && enabledCategories.includes(categoryKey)) {
        toggleCategory(categoryKey);
      }
    });
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    // Reset enabled categories to show all
    enabledCategories.forEach(categoryKey => {
      toggleCategory(categoryKey);
    });
  };

  // If scene is loaded, show category filters and uploaded assets
  if (sceneId && sceneCategories && Array.isArray(sceneCategories) && sceneCategories.length > 0) {
    const uploadedAssets = manifest?.items || [];
    const availableCategories = [...new Set(sceneCategories.map((cat: any) => 
      typeof cat === 'string' ? cat : cat?.categoryKey || ''
    ))];
    
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
        </div>

        <ScrollArea className={styles.assetsScrollArea}>
          <div className={styles.assetsContainer}>
            {/* Enhanced Category Filter */}
            <CategoryFilter
              availableCategories={availableCategories}
              enabledCategories={enabledCategories}
              searchTerm={searchTerm}
              viewMode={viewMode}
              categoryCounts={categoryCounts}
              onToggleCategory={toggleCategory}
              onSearchChange={setSearchTerm}
              onViewModeChange={setViewMode}
              onShowAll={handleShowAllCategories}
              onHideAll={handleHideAllCategories}
              onResetFilters={handleResetFilters}
              className="mb-4"
            />
            
            {/* Enhanced Asset List */}
            <AssetList
              assets={uploadedAssets}
              enabledCategories={enabledCategories}
              searchTerm={searchTerm}
              viewMode={viewMode}
              selectedItemId={selectedItemId}
              onAssetSelect={(assetId) => {
                console.log('Asset selected:', assetId);
                if (onItemSelect) {
                  onItemSelect(assetId);
                }
              }}
              onAssetAdd={(assetName) => {
                console.log('Adding asset:', assetName);
                onAssetAdd(assetName);
              }}
              onDragStart={(e, asset, categoryName) => {
                const isCategoryEnabled = enabledCategories.includes(categoryName) || enabledCategories.length === 0;
                if (!isCategoryEnabled) {
                  e.preventDefault();
                  return;
                }
                
                const dragData = {
                  type: 'asset',
                  item: asset,
                  categoryName: categoryName
                };
                e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                e.dataTransfer.effectAllowed = 'copy';
                
                console.log('📦 LeftSidebar: Started dragging asset:', dragData);
              }}
            />
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