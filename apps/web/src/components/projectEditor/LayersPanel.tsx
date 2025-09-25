import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { 
  Layers,
  Eye,
  EyeOff,
  Hash,
  Box,
  Lightbulb,
  Sun,
  Zap,
  Flashlight
} from "lucide-react";
import { useSceneContext } from '../../contexts/SceneContext';
import { useSelection } from '../../features/scenes/SelectionContext';
import { LightsManager } from './LightsContainer';
import { subscribeToLayerData, type LayerNode } from '../../features/scenes/LayerHierarchyBridge';
import { useSelectionStore } from '../../stores/selectionStore';
import styles from '../../pages/projectEditor/ProjectEditor.module.css';

interface LayersPanelProps {
  className?: string;
}

const LayersPanel: React.FC<LayersPanelProps> = ({ className }) => {
  const { manifest } = useSceneContext();
  const { selection, selectObject } = useSelection();
  const [lights, setLights] = useState<THREE.Light[]>([]);
  
  // Layer hierarchy data from new system
  const [layers, setLayers] = useState<LayerNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const selected = useSelectionStore((s) => s.selected);
  const setSelected = useSelectionStore((s) => s.set);

  // Subscribe to lights changes
  useEffect(() => {
    const lightsManager = LightsManager.getInstance();
    const unsubscribe = lightsManager.subscribe(setLights);
    return unsubscribe;
  }, []);
  
  // Subscribe to LayerHierarchyBridge data
  useEffect(() => {
    return subscribeToLayerData((layerData) => {
          setLayers(layerData);
        });
  }, []);
  
  // Layer node expansion/collapse
  const toggleExpanded = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };
  
  // Layer selection handler
  const handleLayerSelect = (node: LayerNode) => {
    // Validate that the object is still valid and in the scene graph
    if (!node.object || !node.object.parent) {
      return;
    }
    
    // Check if there's already a selection with the same itemId but different object reference
    const currentSelected = useSelectionStore.getState().selected;
    if (currentSelected && currentSelected.itemId === node.itemId && currentSelected.object !== node.object) {
      // Clear the old stale selection first
      useSelectionStore.getState().clear();
    }
    
    const {userData} = node.object;
    setSelected({
      assetId: userData?.meta?.assetId || userData?.itemId || node.itemId,
      itemId: node.itemId,
      object: node.object,
      category: userData?.category,
      originalPosition: node.object.position.clone(),
      originalRotation: node.object.rotation.clone(),
      originalScale: node.object.scale.clone(),
    });
  };
  
  // Subscribe to LayerHierarchyBridge data
  useEffect(() => {
    return subscribeToLayerData((layerData) => {
          setLayers(layerData);
        });
  }, []);
  
  // Light selection handler
  const handleSelectLight = useCallback((light: THREE.Light) => {
    // Try to select the light helper first (it's usually more selectable)
    if (light.userData.helper) {
      selectObject(light.userData.helper);
    } else {
      selectObject(light);
    }
  }, [selectObject]);
  
  // Light visibility toggle handler
  const handleToggleLightVisibility = useCallback((light: THREE.Light, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent selection when clicking eye
    light.visible = !light.visible;
    
    // Also toggle helper visibility if it exists
    if (light.userData.helper) {
      light.userData.helper.visible = light.visible;
    }
    
    // Force re-render by updating the state
    setLights(prev => [...prev]);
  }, []);

  // Calculate object information from scene manifest
  const objectInfo = useMemo(() => {
    const items = manifest?.items || [];
    
    // Count by category
    const byCategory: Record<string, number> = {};
    items.forEach(item => {
      const category = typeof item.category === 'string' ? item.category : (item.category as any)?.categoryKey || 'unknown';
      byCategory[category] = (byCategory[category] || 0) + 1;
    });
    
    return {
      total: items.length,
      visible: items.length, // TODO: Track actual visibility state
      selected: selection.selectedObject ? 1 : 0,
      byCategory
    };
  }, [manifest?.items, selection.selectedObject]);

  // Objects visibility handler
  const handleToggleAllVisibility = useCallback((_show: boolean) => {
    // TODO: Implement global object visibility toggle
  }, []);

  // Light icons mapping
  const getLightIcon = (lightType: string) => {
    switch (lightType) {
      case 'directional':
        return Sun;
      case 'point':
        return Lightbulb;
      case 'spot':
        return Flashlight;
      default:
        return Zap;
    }
  };

  const allVisible = objectInfo.visible === objectInfo.total;
  const someVisible = objectInfo.visible > 0 && objectInfo.visible < objectInfo.total;

  return (
    <div className={className}>
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarTitleRow}>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            <h2 className={styles.sidebarTitle}>Layers</h2>
          </div>
        </div>
      </div>

      {/* Content - parent handles scrolling */}
      <div className="space-y-4 p-4">
          
          {/* Objects Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-[var(--glass-yellow)]" />
                <span className="text-sm font-medium">Objects</span>
                <span className="text-xs text-gray-10 bg-[var(--glass-maroon)] px-2 py-0.5 rounded-full">
                  {objectInfo.visible}/{objectInfo.total}
                </span>
              </div>
              
              {/* Global Visibility Toggle */}
              <button
                onClick={() => handleToggleAllVisibility(!allVisible)}
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
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[var(--glass-maroon)] p-2 rounded text-center">
                <div className="text-lg font-semibold text-yellow-500">{objectInfo.total}</div>
                <div className="text-xs text-gray-600">Total</div>
              </div>
              <div className="bg-[var(--glass-yellow)]/10 p-2 rounded text-center">
                <div className="text-lg font-semibold text-[var(--glass-black)]">{objectInfo.visible}</div>
                <div className="text-xs text-[var(--glass-yellow)]">Visible</div>
              </div>
            </div>
            
            {/* Selected Objects */}
            {objectInfo.selected > 0 && (
              <div className="bg-yellow-50 p-2 rounded text-center">
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
                          <span className="text-gray-10 capitalize">
                            {category.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                        </div>
                        <span className="text-gray-10 bg-[var(--glass-maroon)] px-1.5 py-0.5 rounded">
                          {count}
                        </span>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
            
            {/* Empty Objects State */}
            {objectInfo.total === 0 && (
              <div className="text-center py-4 text-gray-500">
                <Box className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <div className="text-sm">No objects in scene</div>
                <div className="text-xs">Import 3D assets to get started</div>
              </div>
            )}
          </div>

          {/* Active Layers Section */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-500" />
                <span className={styles.sidebarTitle}>Outliner</span>
              </div>
            </div>
            
            {/* Layer Hierarchy */}
            <div className="space-y-1">
              {layers.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <div className="text-sm">No objects loaded</div>
                  <div className="text-xs">Objects will appear here when scene loads</div>
                </div>
              ) : (
                layers.map(parentNode => (
                  <LayerNodeComponent
                    key={parentNode.id}
                    node={parentNode}
                    level={0}
                    expanded={expandedNodes.has(parentNode.id)}
                    onToggleExpanded={toggleExpanded}
                    onSelect={handleLayerSelect}
                    selectedItemId={selected?.itemId}
                  />
                ))
              )}
            </div>
          </div>

          {/* Lights Section */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">Lights</span>
                <span className="text-xs text-gray-500 bg-[var(--glass-maroon)] px-2 py-0.5 rounded-full">
                  {lights.length}
                </span>
              </div>
            </div>

            {/* Lights List */}
            {lights.length > 0 ? (
              <div className="space-y-1">
                {lights.map((light, index) => {
                  const LightIcon = getLightIcon(light.userData?.meta?.lightType || 'point');
                  const isSelected = selection.selectedObject?.itemId === light.name;
                  
                  return (
                    <div 
                      key={light.name || index} 
                      className={`p-2 rounded border transition-colors cursor-pointer ${
                        isSelected 
                          ? 'border-[var(--glass-yellow)] bg-[var(--glass-yellow)]/10' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleSelectLight(light)}
                      title={`Click to select ${light.userData?.meta?.name || light.name}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <LightIcon className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                          <span className="text-xs font-medium truncate">
                            {light.userData?.meta?.name || light.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-500">
                            I: {light.intensity.toFixed(1)}
                          </span>
                          {/* Visibility Toggle */}
                          <button
                            onClick={(e) => handleToggleLightVisibility(light, e)}
                            className="hover:bg-gray-100 p-1 rounded transition-colors"
                            title={light.visible ? 'Hide light' : 'Show light'}
                          >
                            {light.visible ? (
                              <Eye className="w-3 h-3 text-green-500" />
                            ) : (
                              <EyeOff className="w-3 h-3 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="text-xs text-gray-500 capitalize">
                          {light.userData?.meta?.lightType || 'Unknown'} Light
                        </div>
                        {/* Shadow indicator */}
                        {light.castShadow && (
                          <div className="text-xs text-gray-400 flex items-center gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full" />
                            <span>Shadow</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <Lightbulb className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <div className="text-sm">No lights in scene</div>
                <div className="text-xs">Add lights from the Properties panel</div>
              </div>
            )}
          </div>

      </div>
    </div>
  );
};

// Layer Node Component for inline hierarchy
interface LayerNodeComponentProps {
  node: LayerNode;
  level: number;
  expanded: boolean;
  onToggleExpanded: (nodeId: string) => void;
  onSelect: (node: LayerNode) => void;
  selectedItemId?: string;
}

function LayerNodeComponent({
  node,
  level,
  expanded,
  onToggleExpanded,
  onSelect,
  selectedItemId
}: LayerNodeComponentProps) {
  const isSelected = node.itemId === selectedItemId;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <>
      {/* Parent/Submesh Node */}
      <div
        className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer transition-colors ${
          isSelected 
            ? 'bg-[var(--glass-yellow)]/20 border border-[var(--glass-yellow)]/50' 
            : 'hover:bg-gray-100'
        }`}
        style={{ paddingLeft: `${8 + level * 16}px` }}
        onClick={() => {
          onSelect(node);
        }}
      >
        {/* Expand/Collapse Button */}
        {hasChildren ? (
          <button
            className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpanded(node.id);
            }}
          >
            {expanded ? '▼' : '▶'}
          </button>
        ) : (
          <div className="w-4" /> // Spacer
        )}

        {/* Type Icon */}
        <div className="text-xs">
          {node.type === 'parent' ? '🎭' : '🔲'}
        </div>

        {/* Name */}
        <span className={`flex-1 text-sm truncate ${
          isSelected ? 'text-[var(--glass-black)] font-medium' : 'text-gray-700'
        }`}>
          {node.name}
        </span>

        {/* Visibility indicator */}
        <div className="text-xs text-gray-400">
          {node.visible ? '👁' : '😵'}
        </div>
      </div>

      {/* Children (Submeshes) */}
      {expanded && hasChildren && (
        <>
          {node.children!.map(childNode => (
            <LayerNodeComponent
              key={childNode.id}
              node={childNode}
              level={level + 1}
              expanded={false} // Submeshes don't expand further
              onToggleExpanded={onToggleExpanded}
              onSelect={onSelect}
              selectedItemId={selectedItemId}
            />
          ))}
        </>
      )}
    </>
  );
}

export default LayersPanel;
