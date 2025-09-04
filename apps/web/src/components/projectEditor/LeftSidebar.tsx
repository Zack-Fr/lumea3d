import React from 'react';
import { Button } from "../ui/Button";
import { ScrollArea } from "../ui/ScrollArea";
import { Plus, Search, Box, Palette, Image } from "lucide-react";
import { AssetCategory } from '../../types/projectEditor';
import AssetCard from './AssetCard';
import styles from '../../pages/projectEditor/ProjectEditor.module.css';

interface LeftSidebarProps {
  assetCategories: AssetCategory[];
  selectedTool: string;
  onToolChange: (tool: string) => void;
  selectedAsset: number | null;
  onAssetSelect: (assetId: number) => void;
  onAssetAdd: (assetName: string) => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = React.memo(({
  assetCategories,
  selectedTool,
  onToolChange,
  selectedAsset,
  onAssetSelect,
  onAssetAdd
}) => {
  const getTabIcon = (categoryId: string) => {
    switch (categoryId) {
      case 'models': return Box;
      case 'materials': return Palette;
      case 'textures': return Image;
      default: return Box;
    }
  };

  const currentCategory = assetCategories.find(cat => cat.id === selectedTool) || assetCategories[0];

  return (
    <aside className={styles.leftSidebar}>
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarTitleRow}>
          <h2 className={styles.sidebarTitle}>Assets & Materials</h2>
          <Button variant="ghost" size="sm" className={styles.addButton}>
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