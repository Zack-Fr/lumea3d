import { useState, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSelection } from './SelectionContext';

interface LayerNode {
  id: string;
  name: string;
  type: 'parent' | 'submesh';
  parentId?: string;
  itemId: string;
  object: THREE.Object3D;
  children?: LayerNode[];
  visible: boolean;
}

interface ActiveLayersPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ActiveLayersPanel({ isOpen, onClose }: ActiveLayersPanelProps) {
  const { scene } = useThree();
  const { selectObject, selection, deleteObject } = useSelection();
  const [layers, setLayers] = useState<LayerNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Scan scene for objects and build hierarchy
  const scanSceneObjects = () => {
    const layerNodes: LayerNode[] = [];
    const processedItems = new Set<string>();

    scene.traverse((object) => {
      // Skip lights and their helpers from the Objects list
      const isLight = object.type.includes('Light') || object.userData?.meta?.isLight === true || object.userData?.isHelper === true;
      if (isLight) {
        return;
      }

      // Look for parent objects with itemId
      if (object.userData?.itemId && !processedItems.has(object.userData.itemId)) {
        const itemId = object.userData.itemId;
        const parentName = object.name || `Object ${itemId.slice(-8)}`;
        
        processedItems.add(itemId);

        // Create parent node
        const parentNode: LayerNode = {
          id: `parent-${itemId}`,
          name: parentName,
          type: 'parent',
          itemId: itemId,
          object: object,
          visible: object.visible,
          children: []
        };

        // Find all mesh children (submeshes)
        const submeshes: LayerNode[] = [];
        object.traverse((child) => {
          if (child !== object && child instanceof THREE.Mesh) {
            const submeshName = child.name || `Submesh ${submeshes.length + 1}`;
            const submeshNode: LayerNode = {
              id: `submesh-${itemId}-${submeshes.length}`,
              name: submeshName,
              type: 'submesh',
              parentId: parentNode.id,
              itemId: itemId,
              object: child,
              visible: child.visible
            };
            submeshes.push(submeshNode);
          }
        });

        parentNode.children = submeshes;
        layerNodes.push(parentNode);
      }
    });

    setLayers(layerNodes);
  };

  // Refresh layers when scene changes
  useEffect(() => {
    scanSceneObjects();
    const interval = setInterval(scanSceneObjects, 2000); // Refresh every 2 seconds
    return () => clearInterval(interval);
  }, [scene]);

  // Handle node expansion/collapse
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

  // Handle selection
  const handleSelect = (node: LayerNode) => {
    selectObject(node.object);
  };

  // Handle delete
  const handleDelete = async (node: LayerNode) => {
    if (node.type === 'parent') {
      // Delete entire parent object
      selectObject(node.object);
      await deleteObject();
    } else if (node.type === 'submesh') {
      // Hide submesh (can't delete individual submeshes from GLB)
      node.object.visible = false;
      scanSceneObjects(); // Refresh to show visibility change
    }
  };

  // Handle visibility toggle
  const handleVisibilityToggle = (node: LayerNode) => {
    node.object.visible = !node.object.visible;
    scanSceneObjects(); // Refresh to show visibility change
  };

  if (!isOpen) return null;

  return (
    <div className="fixed left-4 top-20 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <h3 className="text-white font-semibold">Active Layers</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {layers.length === 0 ? (
          <div className="text-gray-400 text-sm text-center py-4">
            No objects in scene
          </div>
        ) : (
          <div className="space-y-1">
            {layers.map(parentNode => (
              <LayerNodeComponent
                key={parentNode.id}
                node={parentNode}
                level={0}
                expanded={expandedNodes.has(parentNode.id)}
                onToggleExpanded={toggleExpanded}
                onSelect={handleSelect}
                onDelete={handleDelete}
                onToggleVisibility={handleVisibilityToggle}
                selectedItemId={selection.selectedObject?.itemId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-gray-700 text-xs text-gray-400">
        Total: {layers.length} objects, {layers.reduce((sum, node) => sum + (node.children?.length || 0), 0)} submeshes
      </div>
    </div>
  );
}

interface LayerNodeComponentProps {
  node: LayerNode;
  level: number;
  expanded: boolean;
  onToggleExpanded: (nodeId: string) => void;
  onSelect: (node: LayerNode) => void;
  onDelete: (node: LayerNode) => void;
  onToggleVisibility: (node: LayerNode) => void;
  selectedItemId?: string;
}

function LayerNodeComponent({
  node,
  level,
  expanded,
  onToggleExpanded,
  onSelect,
  onDelete,
  onToggleVisibility,
  selectedItemId
}: LayerNodeComponentProps) {
  const isSelected = node.itemId === selectedItemId;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <>
      {/* Parent/Submesh Node */}
      <div
        className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer group hover:bg-gray-800 ${
          isSelected ? 'bg-blue-600' : ''
        }`}
        style={{ paddingLeft: `${8 + level * 16}px` }}
        onClick={() => onSelect(node)}
      >
        {/* Expand/Collapse Button */}
        {hasChildren ? (
          <button
            className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-white"
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
          isSelected ? 'text-white font-medium' : 'text-gray-300'
        }`}>
          {node.name}
        </span>

        {/* Controls */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Visibility Toggle */}
          <button
            className={`w-5 h-5 text-xs ${
              node.visible ? 'text-green-400' : 'text-gray-500'
            } hover:text-white`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility(node);
            }}
            title={node.visible ? 'Hide' : 'Show'}
          >
            {node.visible ? '👁' : '🚫'}
          </button>

          {/* Delete Button */}
          <button
            className="w-5 h-5 text-xs text-red-400 hover:text-red-300"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node);
            }}
            title={node.type === 'parent' ? 'Delete object' : 'Hide submesh'}
          >
            🗑
          </button>
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
              onDelete={onDelete}
              onToggleVisibility={onToggleVisibility}
              selectedItemId={selectedItemId}
            />
          ))}
        </>
      )}
    </>
  );
}