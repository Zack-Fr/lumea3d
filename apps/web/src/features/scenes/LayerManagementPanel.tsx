import { useState, useCallback } from 'react';
import { 
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Edit3,
  ChevronDown,
  ChevronRight,
  Settings
} from 'lucide-react';

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  type: 'objects' | 'lighting' | 'effects' | 'background' | 'ui';
  color: string;
  objects: LayerObject[];
  expanded: boolean;
}

interface LayerObject {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  selected: boolean;
}

interface LayerManagementPanelProps {
  isVisible: boolean;
  onToggleVisibility: () => void;
  layers: Layer[];
  onLayerUpdate: (layerId: string, updates: Partial<Layer>) => void;
  onObjectSelect: (objectId: string) => void;
  onObjectUpdate: (objectId: string, layerId: string, updates: Partial<LayerObject>) => void;
  onCreateLayer: () => void;
  onDeleteLayer: (layerId: string) => void;
}

interface LayerItemProps {
  layer: Layer;
  onUpdate: (updates: Partial<Layer>) => void;
  onObjectSelect: (objectId: string) => void;
  onObjectUpdate: (objectId: string, updates: Partial<LayerObject>) => void;
  onDelete: () => void;
}

interface LayerObjectItemProps {
  object: LayerObject;
  onSelect: () => void;
  onUpdate: (updates: Partial<LayerObject>) => void;
}

// Layer Object Item Component
function LayerObjectItem({ object, onSelect, onUpdate }: LayerObjectItemProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [tempName, setTempName] = useState(object.name);

  const handleRename = useCallback(() => {
    if (tempName.trim() && tempName !== object.name) {
      onUpdate({ name: tempName.trim() });
    }
    setIsRenaming(false);
  }, [tempName, object.name, onUpdate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setTempName(object.name);
      setIsRenaming(false);
    }
  }, [handleRename, object.name]);

  return (
    <div 
      className={`flex items-center gap-2 p-2 ml-4 rounded transition-colors cursor-pointer ${
        object.selected 
          ? 'bg-blue-500/20 border border-blue-500/50' 
          : 'hover:bg-gray-700/50'
      }`}
      onClick={onSelect}
    >
      {/* Visibility Toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onUpdate({ visible: !object.visible });
        }}
        className="p-1 hover:bg-gray-600 rounded"
        title={object.visible ? 'Hide object' : 'Show object'}
      >
        {object.visible ? <Eye size={14} /> : <EyeOff size={14} className="text-gray-500" />}
      </button>

      {/* Lock Toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onUpdate({ locked: !object.locked });
        }}
        className="p-1 hover:bg-gray-600 rounded"
        title={object.locked ? 'Unlock object' : 'Lock object'}
      >
        {object.locked ? <Lock size={14} className="text-red-400" /> : <Unlock size={14} className="text-gray-500" />}
      </button>

      {/* Object Name */}
      <div className="flex-1 flex items-center gap-2">
        <span className="text-xs text-gray-400 uppercase">{object.type}</span>
        {isRenaming ? (
          <input
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyDown}
            className="flex-1 px-1 py-0.5 text-sm bg-gray-700 border border-gray-600 rounded"
            autoFocus
          />
        ) : (
          <span 
            className="flex-1 text-sm cursor-pointer"
            onDoubleClick={() => setIsRenaming(true)}
          >
            {object.name}
          </span>
        )}
      </div>

      {/* Rename Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsRenaming(true);
        }}
        className="p-1 hover:bg-gray-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        title="Rename object"
      >
        <Edit3 size={12} />
      </button>
    </div>
  );
}

// Layer Item Component
function LayerItem({ layer, onUpdate, onObjectSelect, onObjectUpdate, onDelete }: LayerItemProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [tempName, setTempName] = useState(layer.name);

  const handleRename = useCallback(() => {
    if (tempName.trim() && tempName !== layer.name) {
      onUpdate({ name: tempName.trim() });
    }
    setIsRenaming(false);
  }, [tempName, layer.name, onUpdate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setTempName(layer.name);
      setIsRenaming(false);
    }
  }, [handleRename, layer.name]);

  const visibleObjects = layer.objects.filter(obj => obj.visible).length;
  const totalObjects = layer.objects.length;

  return (
    <div className="group">
      {/* Layer Header */}
      <div className="flex items-center gap-2 p-2 rounded hover:bg-gray-700/50 transition-colors">
        {/* Expand/Collapse */}
        <button
          onClick={() => onUpdate({ expanded: !layer.expanded })}
          className="p-1 hover:bg-gray-600 rounded"
        >
          {layer.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* Layer Color */}
        <div 
          className="w-4 h-4 rounded border border-gray-600"
          style={{ backgroundColor: layer.color }}
          title="Layer color"
        />

        {/* Visibility Toggle */}
        <button
          onClick={() => onUpdate({ visible: !layer.visible })}
          className="p-1 hover:bg-gray-600 rounded"
          title={layer.visible ? 'Hide layer' : 'Show layer'}
        >
          {layer.visible ? <Eye size={16} /> : <EyeOff size={16} className="text-gray-500" />}
        </button>

        {/* Lock Toggle */}
        <button
          onClick={() => onUpdate({ locked: !layer.locked })}
          className="p-1 hover:bg-gray-600 rounded"
          title={layer.locked ? 'Unlock layer' : 'Lock layer'}
        >
          {layer.locked ? <Lock size={16} className="text-red-400" /> : <Unlock size={16} className="text-gray-500" />}
        </button>

        {/* Layer Name */}
        <div className="flex-1">
          {isRenaming ? (
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={handleKeyDown}
              className="w-full px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded"
              autoFocus
            />
          ) : (
            <div 
              className="cursor-pointer"
              onDoubleClick={() => setIsRenaming(true)}
            >
              <div className="font-medium text-sm">{layer.name}</div>
              <div className="text-xs text-gray-400">
                {visibleObjects}/{totalObjects} objects
              </div>
            </div>
          )}
        </div>

        {/* Layer Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsRenaming(true)}
            className="p-1 hover:bg-gray-600 rounded"
            title="Rename layer"
          >
            <Edit3 size={14} />
          </button>
          
          <button
            onClick={onDelete}
            className="p-1 hover:bg-red-600 rounded text-red-400"
            title="Delete layer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Layer Objects */}
      {layer.expanded && (
        <div className="space-y-1">
          {layer.objects.map((object) => (
            <LayerObjectItem
              key={object.id}
              object={object}
              onSelect={() => onObjectSelect(object.id)}
              onUpdate={(updates) => onObjectUpdate(object.id, updates)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Main Layer Management Panel Component
export function LayerManagementPanel({
  isVisible,
  onToggleVisibility,
  layers,
  onLayerUpdate,
  onObjectSelect,
  onObjectUpdate,
  onCreateLayer,
  onDeleteLayer
}: LayerManagementPanelProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed top-16 right-4 w-80 max-h-[calc(100vh-8rem)] bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-lg overflow-hidden z-40">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Layers size={18} />
          <h3 className="font-semibold">Layers</h3>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={onCreateLayer}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title="Create new layer"
          >
            <Plus size={16} />
          </button>
          
          <button
            onClick={onToggleVisibility}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
            title="Close layers panel"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Layer List */}
      <div className="overflow-y-auto max-h-96 p-2">
        <div className="space-y-1">
          {layers.map((layer) => (
            <LayerItem
              key={layer.id}
              layer={layer}
              onUpdate={(updates) => onLayerUpdate(layer.id, updates)}
              onObjectSelect={onObjectSelect}
              onObjectUpdate={(objectId, updates) => onObjectUpdate(objectId, layer.id, updates)}
              onDelete={() => onDeleteLayer(layer.id)}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-700 text-xs text-gray-400">
        <div className="flex items-center justify-between">
          <span>{layers.length} layers</span>
          <span>Double-click to rename</span>
        </div>
      </div>
    </div>
  );
}

export default LayerManagementPanel;