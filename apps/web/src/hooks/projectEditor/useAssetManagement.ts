import { useState } from 'react';
import { AssetCategory } from '../../types/projectEditor';

interface AssetManagement {
  assetCategories: AssetCategory[];
  selectedTool: string;
  setSelectedTool: (tool: string) => void;
  selectedAsset: number | null;
  setSelectedAsset: (assetId: number | null) => void;
}

export const useAssetManagement = (categories: AssetCategory[]): AssetManagement => {
  const [selectedTool, setSelectedTool] = useState("models");
  const [selectedAsset, setSelectedAsset] = useState<number | null>(null);

  return {
    assetCategories: categories,
    selectedTool,
    setSelectedTool,
    selectedAsset,
    setSelectedAsset
  };
};