import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '../ui/Button';
import { Select, SelectItem } from '../ui/Select';
import { 
  Filter, 
  Search, 
  X, 
  Sofa, 
  Lightbulb, 
  TreePine, 
  Car,
  Building,
  Package,
  Eye,
  EyeOff,
  Grid,
  List
} from 'lucide-react';

// Common asset categories for architectural visualization
export const MESH_CATEGORIES = {
  architecture: {
    name: 'Architecture',
    icon: Building,
    subcategories: ['buildings', 'structures', 'facades', 'roofing', 'doors', 'windows']
  },
  furniture: {
    name: 'Furniture', 
    icon: Sofa,
    subcategories: ['seating', 'tables', 'storage', 'beds', 'office', 'outdoor']
  },
  lighting: {
    name: 'Lighting',
    icon: Lightbulb,
    subcategories: ['pendant', 'floor_lamps', 'table_lamps', 'ceiling', 'outdoor', 'decorative']
  },
  nature: {
    name: 'Nature',
    icon: TreePine,
    subcategories: ['trees', 'plants', 'flowers', 'grass', 'rocks', 'water']
  },
  vehicles: {
    name: 'Vehicles',
    icon: Car,
    subcategories: ['cars', 'motorcycles', 'bicycles', 'trucks', 'boats', 'aircraft']
  },
  decoration: {
    name: 'Decoration',
    icon: Package,
    subcategories: ['artwork', 'sculptures', 'vases', 'books', 'accessories', 'textiles']
  },
  imported_assets: {
    name: 'Imported Assets',
    icon: Package,
    subcategories: ['recent', 'user_uploads', 'custom', 'uncategorized']
  }
} as const;

export type CategoryKey = keyof typeof MESH_CATEGORIES;
export type CategoryWithSubcategories = typeof MESH_CATEGORIES[CategoryKey];

interface CategoryFilterProps {
  // Available categories from the scene
  availableCategories: string[];
  // Currently enabled/visible categories
  enabledCategories: string[];
  // Search term for filtering
  searchTerm: string;
  // Display mode (grid/list)
  viewMode: 'grid' | 'list';
  // Asset count per category
  categoryCounts: Record<string, number>;
  
  // Callbacks
  onToggleCategory: (categoryKey: string) => void;
  onSearchChange: (term: string) => void;
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onShowAll: () => void;
  onHideAll: () => void;
  onResetFilters: () => void;
  
  className?: string;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  availableCategories,
  enabledCategories,
  searchTerm,
  viewMode,
  categoryCounts,
  onToggleCategory,
  onSearchChange,
  onViewModeChange,
  onShowAll,
  onHideAll,
  onResetFilters,
  className = ''
}) => {
  const [selectedMainCategory, setSelectedMainCategory] = useState<CategoryKey | 'all'>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Categorize available categories based on naming patterns
  const categorizedAssets = useMemo(() => {
    const result: Record<CategoryKey, string[]> = {
      architecture: [],
      furniture: [],
      lighting: [],
      nature: [],
      vehicles: [],
      decoration: [],
      imported_assets: []
    };

    availableCategories.forEach(categoryKey => {
      const lowerKey = categoryKey.toLowerCase();
      let assigned = false;

      // Check each main category and its subcategories
      Object.entries(MESH_CATEGORIES).forEach(([mainKey, config]) => {
        if (!assigned && config.subcategories.some(sub => lowerKey.includes(sub))) {
          result[mainKey as CategoryKey].push(categoryKey);
          assigned = true;
        }
      });

      // If not assigned to any specific category, put in imported_assets
      if (!assigned) {
        result.imported_assets.push(categoryKey);
      }
    });

    return result;
  }, [availableCategories]);

  // Filter categories based on search and selected main category
  const filteredCategories = useMemo(() => {
    let categories = availableCategories;

    // Filter by main category selection
    if (selectedMainCategory !== 'all') {
      categories = categorizedAssets[selectedMainCategory] || [];
    }

    // Filter by search term
    if (searchTerm) {
      categories = categories.filter(cat => 
        cat.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return categories;
  }, [availableCategories, categorizedAssets, selectedMainCategory, searchTerm]);

  // Get category icon based on category key
  const getCategoryIcon = useCallback((categoryKey: string) => {
    const lowerKey = categoryKey.toLowerCase();
    
    // Check each main category for matches
    for (const [, config] of Object.entries(MESH_CATEGORIES)) {
      if (config.subcategories.some(sub => lowerKey.includes(sub))) {
        return config.icon;
      }
    }
    
    return Package; // Default icon
  }, []);

  // Format category name for display
  const formatCategoryName = useCallback((categoryKey: string) => {
    return categoryKey
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with search and view controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-day-500" />
          <span className="font-medium text-sm text-[var(--glass-yellow)]">Filter Assets</span>
          <span className="text-xs text-gray-500 bg-gray-500 px-2 py-0.5 rounded-full">
            {filteredCategories.length}/{availableCategories.length}
          </span>
        </div>
        
        {/* View mode toggle */}
        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('grid')}
            className="p-1.5"
          >
            <Grid className="w-3 h-3" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('list')}
            className="p-1.5"
          >
            <List className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search categories..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md bg-gray text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Main category filter */}
      <div className="space-y-2">
        <label className="text-xs font-medium  text-gray-600">Main Category</label>
        <Select
          value={selectedMainCategory}
          onChange={(e) => setSelectedMainCategory(e.target.value as CategoryKey | 'all')}
          className="w-full"
        >
          <SelectItem value="all ">All Categories</SelectItem>
          {Object.entries(MESH_CATEGORIES).map(([key, config]) => {
            const count = categorizedAssets[key as CategoryKey]?.length || 0;
            return (
              <SelectItem key={key} value={key}>
                {config.name} ({count}) 
              </SelectItem>
            );
          })}
        </Select>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onShowAll}
          className="text-xs"
        >
          <Eye className="w-3 h-3 mr-1" />
          Show All
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onHideAll}
          className="text-xs"
        >
          <EyeOff className="w-3 h-3 mr-1" />
          Hide All
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onResetFilters}
          className="text-xs"
        >
          <X className="w-3 h-3 mr-1" />
          Reset
        </Button>
      </div>

      {/* Advanced filters toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
        className="w-full text-xs"
      >
        Advanced Filters {showAdvancedFilters ? '▲' : '▼'}
      </Button>

      {/* Advanced filters */}
      {showAdvancedFilters && (
        <div className="space-y-3 p-3 bg-gray-50 rounded-md">
          <div className="text-xs font-medium text-gray-600">Filter by Asset Count</div>
          <div className="flex flex-wrap gap-1">
            <Button variant="outline" size="sm" className="text-xs">Empty (0)</Button>
            <Button variant="outline" size="sm" className="text-xs">Few (1-5)</Button>
            <Button variant="outline" size="sm" className="text-xs">Many (6-20)</Button>
            <Button variant="outline" size="sm" className="text-xs">Lots (21+)</Button>
          </div>
        </div>
      )}

      {/* Category list */}
      <div className={`space-y-1 max-h-60 overflow-y-auto ${viewMode === 'grid' ? 'grid grid-cols-1 gap-1' : ''}`}>
        {filteredCategories.map((categoryKey) => {
          const isEnabled = enabledCategories.includes(categoryKey) || enabledCategories.length === 0;
          const count = categoryCounts[categoryKey] || 0;
          const IconComponent = getCategoryIcon(categoryKey);
          
          return (
            <div
              key={categoryKey}
              onClick={() => onToggleCategory(categoryKey)}
              className={`
                flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors
                ${isEnabled 
                  ? 'bg-blue-50 border border-blue-200 text-blue-900' 
                  : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <IconComponent className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm truncate">
                  {formatCategoryName(categoryKey)}
                </span>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs bg-[var(--glass-maroon)] px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
                {isEnabled ? (
                  <Eye className="w-3 h-3 text-green-500" />
                ) : (
                  <EyeOff className="w-3 h-3 text-gray-400" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* No results */}
      {filteredCategories.length === 0 && (
        <div className="text-center py-6 text-gray-500">
          <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <div className="text-sm">No categories match your filters</div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="mt-2 text-xs"
          >
            Reset Filters
          </Button>
        </div>
      )}
    </div>
  );
};

export default CategoryFilter;
