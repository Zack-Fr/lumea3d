import React from 'react';
import { Box, Eye, EyeOff, Hash } from 'lucide-react';

interface ObjectInfo {
  total: number;
  visible: number;
  selected: number;
  byCategory: Record<string, number>;
}

interface ObjectsCounterProps {
  objectInfo: ObjectInfo;
  onToggleVisibility?: (show: boolean) => void;
  className?: string;
}

const ObjectsCounter: React.FC<ObjectsCounterProps> = ({
  objectInfo,
  onToggleVisibility,
  className
}) => {
  const allVisible = objectInfo.visible === objectInfo.total;
  const someVisible = objectInfo.visible > 0 && objectInfo.visible < objectInfo.total;

  return (
    <div className={className}>
      {/* Objects Summary */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-[var(--glass-yellow)]" />
          <span className="text-sm font-medium">Objects</span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {objectInfo.visible}/{objectInfo.total}
          </span>
        </div>
        
        {/* Global Visibility Toggle */}
        <button
          onClick={() => onToggleVisibility?.(!allVisible)}
          className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 transition-colors"
          title={allVisible ? "Hide all objects" : "Show all objects"}
        >
          {allVisible ? (
            <Eye className="w-4 h-4" />
          ) : someVisible ? (
            <Eye className="w-4 h-4 text-yellow-500" />
          ) : (
            <EyeOff className="w-4 h-4" />
          )}
          {allVisible ? 'All' : someVisible ? 'Some' : 'None'}
        </button>
      </div>
      
      {/* Objects Stats */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-gray-50 p-2 rounded text-center">
          <div className="text-lg font-semibold text-gray-900">{objectInfo.total}</div>
          <div className="text-xs text-gray-600">Total</div>
        </div>
        <div className="bg-[var(--glass-yellow)]/10 p-2 rounded text-center">
          <div className="text-lg font-semibold text-[var(--glass-black)]">{objectInfo.visible}</div>
          <div className="text-xs text-[var(--glass-yellow)]">Visible</div>
        </div>
      </div>
      
      {/* Selected Objects */}
      {objectInfo.selected > 0 && (
        <div className="bg-yellow-50 p-2 rounded mb-3 text-center">
          <div className="text-lg font-semibold text-yellow-900">{objectInfo.selected}</div>
          <div className="text-xs text-yellow-600">Selected</div>
        </div>
      )}
      
      {/* Objects by Category */}
      {Object.keys(objectInfo.byCategory).length > 0 && (
        <div>
          <div className="text-xs text-gray-600 mb-2 font-medium">By Category</div>
          <div className="space-y-1">
            {Object.entries(objectInfo.byCategory)
              .sort(([,a], [,b]) => b - a) // Sort by count desc
              .map(([category, count]) => (
                <div key={category} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <Box className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-700 capitalize">
                      {category.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </div>
                  <span className="text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                    {count}
                  </span>
                </div>
              ))
            }
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {objectInfo.total === 0 && (
        <div className="text-center py-6 text-gray-500">
          <Box className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <div className="text-sm">No objects in scene</div>
          <div className="text-xs">Import 3D assets to get started</div>
        </div>
      )}
    </div>
  );
};

export default ObjectsCounter;
