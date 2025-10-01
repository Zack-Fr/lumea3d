import React, { useState } from 'react';
import { Button } from "../ui/Button";
import { 
  Plus,
  X,
  Package
} from "lucide-react";
import { AssetCategory } from '../../types/projectEditor';
import { useSceneContext } from '../../contexts/SceneContext';
import AssetCard from './AssetCard';
import CategoryFilter from './CategoryFilter';
import AssetList from './AssetList';
import LayersPanel from './LayersPanel';
import styles from '../../pages/projectEditor/ProjectEditor.module.css';

interface TabbedLeftPanelProps {
  // Panel state
  show: boolean;
  onClose: () => void;
  
  // Asset-related props
  assetCategories: AssetCategory[];
  selectedTool: string;
  onToolChange: (tool: string) => void;
  selectedAsset: number | null;
  onAssetSelect: (assetId: number) => void;
  onAssetAdd: (assetName: string) => void;
  onImportAsset?: () => void;
  
  // Properties panel props
  selectedItemId?: string | null;
  onItemSelect?: (itemId: string) => void;
  showProperties: boolean;
  onPropertiesClose: () => void;
  
  // Camera controls props
  cameraMode: string;
  onCameraModeChange: (mode: string) => void;
  minDistance?: number;
  maxDistance?: number;
  moveSpeed?: number;
  onZoomLimitsChange?: (min: number, max: number) => void;
  onMoveSpeedChange?: (speed: number) => void;
  onCameraPreset?: (preset: string) => void;
  enablePan?: boolean;
  enableZoom?: boolean;
  enableRotate?: boolean;
  onControlsToggle?: (control: string, enabled: boolean) => void;
}



const TabbedLeftPanel: React.FC<TabbedLeftPanelProps> = ({
  // Panel state
  show,
  onClose,
  
  // Asset props
  assetCategories,
  selectedTool,
  selectedAsset,
  onAssetSelect,
  onAssetAdd,
  onImportAsset,
  
  // Properties props
  selectedItemId,
  onItemSelect,
}) => {
  const { 
    sceneId, 
    categories: sceneCategories, 
    enabledCategories, 
    toggleCategory,
    manifest
  } = useSceneContext();

  // Tab state - always assets for left panel (no state needed)
  
  // Local state for filtering (assets tab)
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // No tab switching needed for left panel

  // Calculate category counts for filtering
  const categoryCounts = React.useMemo(() => {
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

  // Always render assets content
  const renderTabContent = () => {
    return renderAssetsTab();
  };

  const renderAssetsTab = () => {
    // If scene is loaded, show category filters and uploaded assets
    if (sceneId && sceneCategories && Array.isArray(sceneCategories) && sceneCategories.length > 0) {
      const uploadedAssets = manifest?.items || [];
      const availableCategories = [...new Set(sceneCategories.map((cat: any) => 
        typeof cat === 'string' ? cat : cat?.categoryKey || ''
      ))];
      
      return (
        <div>
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
                
                console.log('📦 TabbedLeftPanel: Started dragging asset:', dragData);
              }}
            />
        </div>
      );
    }

    // Fallback to original asset categories when no scene is loaded
    const currentCategory = assetCategories.find(cat => cat.id === selectedTool) || assetCategories[0];

    return (
      <div>
        <div className={styles.tabContent}>
          <div className={styles.assetList}>
            {currentCategory.items.map((item: any) => (
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
    );
  };

  // Return null if panel should be hidden
  if (!show) return null;

  return (
    <aside className={styles.leftSidebar}>
      {/* Header with close button - matching right panel pattern */}
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarTitleRow}>
          <h2 className={styles.sidebarTitle}>Assets & Layers</h2>
          <button 
            onClick={onClose}
            className={styles.closeButton}
            title="Close assets panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Content Area - same pattern as rightPanelContent */}
      <div className="flex-1" style={{ minHeight: 0, overflowY: 'auto' }}>
        <div className="space-y-0">
          {/* Scene Assets Section */}
          <div className={styles.sidebarSection}>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-4 h-4" />
                <h3 className={styles.sidebarTitle} style={{ fontSize: '0.875rem' }}>Assets</h3>
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
              {renderTabContent()}
            </div>
          </div>

          {/* Layers Section */}
          <LayersPanel className={styles.sidebarSection} />
        </div>
      </div>
    </aside>
  );
};

export default TabbedLeftPanel;
