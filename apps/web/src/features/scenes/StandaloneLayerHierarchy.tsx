import { useState, useEffect } from 'react';
import { subscribeToLayerData, getGlobalLayerData, type LayerNode } from './LayerHierarchyBridge';
import { useSelection } from './SelectionContext';

interface StandaloneLayerHierarchyProps {
  className?: string;
}

export function StandaloneLayerHierarchy({ className }: StandaloneLayerHierarchyProps) {
  const { selectObject, selection, deleteObject } = useSelection();
  const [layers, setLayers] = useState<LayerNode[]>(getGlobalLayerData());
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Subscribe to layer data updates
  useEffect(() => {
    const unsubscribe = subscribeToLayerData((newLayers) => {
      setLayers(newLayers);
    });
    
    return unsubscribe;
  }, []);

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
    if (selectObject) {
      selectObject(node.object);
    }
  };

  // Handle delete
  const handleDelete = async (node: LayerNode) => {
    if (node.type === 'parent') {
      // Delete entire parent object
      if (selectObject && deleteObject) {
        selectObject(node.object);
        await deleteObject();
      }
    } else if (node.type === 'submesh') {
      // Hide submesh (can't delete individual submeshes from GLB)
      node.object.visible = false;
    }
  };

  // Handle visibility toggle
  const handleVisibilityToggle = (node: LayerNode) => {
    node.object.visible = !node.object.visible;
  };

  return (
    <div className={className}>
      {layers.length === 0 ? (
        <div className="text-center py-4" style={{ color: 'var(--glass-gray)' }}>
          <div className="text-sm">No active objects in scene</div>
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
              selectedItemId={selection?.selectedObject?.itemId}
            />
          ))}
        </div>
      )}
      
      {/* Footer Info */}
      {layers.length > 0 && (
        <div 
          className="pt-2 mt-2 text-xs" 
          style={{ 
            borderTop: '1px solid var(--glass-border-dim)',
            color: 'var(--glass-gray)'
          }}
        >
          {layers.length} objects, {layers.reduce((sum, node) => sum + (node.children?.length || 0), 0)} submeshes
        </div>
      )}
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
        className="flex items-center gap-1 px-2 py-1 rounded cursor-pointer group transition-colors"
        style={{
          backgroundColor: isSelected ? 'var(--glass-bg-secondary)' : 'transparent',
          border: isSelected ? '1px solid var(--glass-yellow)' : '1px solid transparent',
          paddingLeft: `${8 + level * 16}px`
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = 'var(--glass-bg-card)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
        onClick={() => onSelect(node)}
      >
        {/* Expand/Collapse Button */}
        {hasChildren ? (
          <button
            className="w-4 h-4 flex items-center justify-center hover:bg-glass-bg-card rounded transition-colors"
            style={{ 
              color: 'var(--glass-gray)',
              fontSize: '12px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(245, 200, 66, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(245, 200, 66, 0.1)';
            }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpanded(node.id);
            }}
          >
            {expanded ? '▼' : '▶'}
          </button>
        ) : (
          <div className="w-4 h-4" />
        )}

        {/* Type Icon */}
        <div className="text-xs">
          {node.type === 'parent' ? '🎭' : '🔲'}
        </div>

        {/* Name */}
        <span 
          className="flex-1 text-sm truncate"
          style={{
            color: isSelected ? 'var(--glass-yellow)' : 'var(--glass-white)',
            fontWeight: isSelected ? '600' : '400'
          }}
        >
          {node.name}
        </span>

        {/* Controls */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Visibility Toggle */}
          <button
            className="w-5 h-5 text-xs transition-colors"
            style={{
              color: node.visible ? '#10b981' : 'var(--glass-gray)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--glass-yellow)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = node.visible ? '#10b981' : 'var(--glass-gray)';
            }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility(node);
            }}
            title={node.visible ? 'Hide' : 'Show'}
          >
            {node.visible ? '👁' : '💫'}
          </button>

          {/* Delete Button */}
          <button
            className="w-5 h-5 text-xs transition-colors"
            style={{
              color: '#ef4444'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#dc2626';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#ef4444';
            }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node);
            }}
            title={node.type === 'parent' ? 'Delete object' : 'Hide submesh'}
          >
            🗿
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