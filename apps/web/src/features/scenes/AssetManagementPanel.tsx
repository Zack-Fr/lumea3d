import { useState, useEffect } from 'react';
import { 
  Package, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  Plus
} from 'lucide-react';
import { AssetStatus, AssetLicense } from '@/api/sdk';
import { assetsApi } from '../../services/assetsApi';
import { toast } from 'react-toastify';

interface Asset {
  id: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  status: AssetStatus;
  license?: AssetLicense;
  originalUrl?: string;
  meshoptUrl?: string;
  dracoUrl?: string;
  navmeshUrl?: string;
  errorMessage?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface AssetManagementPanelProps {
  isVisible: boolean;
  onToggleVisibility: () => void;
  onAssetSelected?: (asset: Asset) => void;
  onAssetAttach?: (asset: Asset) => void;
}

const STATUS_CONFIG = {
  [AssetStatus.UPLOADED]: {
    icon: Clock,
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
    label: 'Uploaded'
  },
  [AssetStatus.PROCESSING]: {
    icon: RefreshCw,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    label: 'Processing'
  },
  [AssetStatus.READY]: {
    icon: CheckCircle,
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    label: 'Ready'
  },
  [AssetStatus.FAILED]: {
    icon: AlertCircle,
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    label: 'Failed'
  },
};

const LICENSE_LABELS = {
  [AssetLicense.CC0]: 'CC0',
  [AssetLicense.ROYALTY_FREE]: 'Royalty Free',
  [AssetLicense.PROPRIETARY]: 'Proprietary',
};

export function AssetManagementPanel({ 
  isVisible, 
  onToggleVisibility,
  onAssetSelected,
  onAssetAttach 
}: AssetManagementPanelProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await assetsApi.getUserAssets();
      setAssets(data);
      console.log('📦 AssetManagement: Loaded', data.length, 'assets');
    } catch (err) {
      console.error('❌ AssetManagement: Failed to fetch assets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isVisible) {
      fetchAssets();
    }
  }, [isVisible]);

  const handleRefresh = () => {
    fetchAssets();
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) {
      return;
    }

    try {
      await assetsApi.deleteAsset(assetId);
      
      // Remove from local state
      setAssets(prev => prev.filter(asset => asset.id !== assetId));
      console.log('🗑️ AssetManagement: Deleted asset:', assetId);
    } catch (err) {
      console.error('❌ AssetManagement: Failed to delete asset:', err);
      toast.error('Failed to delete asset');
    }
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAvailableVariants = (asset: Asset) => {
    const variants = [];
    if (asset.originalUrl) variants.push('Original');
    if (asset.meshoptUrl) variants.push('MeshOpt');
    if (asset.dracoUrl) variants.push('Draco');
    if (asset.navmeshUrl) variants.push('NavMesh');
    return variants;
  };

  if (!isVisible) {
    return (
      <button
        onClick={onToggleVisibility}
        className="fixed top-20 right-4 z-40 p-3 bg-gray-800/90 text-white rounded-lg hover:bg-gray-700 transition-colors"
        title="Show asset management"
      >
        <Package size={20} />
      </button>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-40 w-96 max-h-[80vh] bg-gray-800/95 backdrop-blur-sm text-white rounded-lg shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <Package size={20} />
          <h3 className="font-semibold">Asset Management</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="Refresh assets"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={onToggleVisibility}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="Hide panel"
          >
            <EyeOff size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {loading && (
          <div className="p-4 text-center text-gray-400">
            <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
            Loading assets...
          </div>
        )}

        {error && (
          <div className="p-4 text-center">
            <AlertCircle size={20} className="text-red-400 mx-auto mb-2" />
            <div className="text-red-400 text-sm">{error}</div>
            <button
              onClick={handleRefresh}
              className="mt-2 text-blue-400 hover:text-blue-300 text-sm"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && assets.length === 0 && (
          <div className="p-4 text-center text-gray-400">
            <Package size={20} className="mx-auto mb-2 opacity-50" />
            No assets imported yet
          </div>
        )}

        {!loading && !error && assets.length > 0 && (
          <div className="space-y-1">
            {assets.map(asset => {
              const statusConfig = STATUS_CONFIG[asset.status];
              const StatusIcon = statusConfig.icon;
              const variants = getAvailableVariants(asset);

              return (
                <div
                  key={asset.id}
                  className="p-3 border-b border-gray-700 hover:bg-gray-700/50 transition-colors"
                >
                  {/* Asset Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate" title={asset.originalName}>
                        {asset.originalName}
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatFileSize(asset.fileSize)} • {formatDate(asset.createdAt)}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1 ml-2">
                      <button
                        onClick={() => onAssetSelected?.(asset)}
                        className="p-1 hover:bg-gray-600 rounded transition-colors"
                        title="View asset details"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => onAssetAttach?.(asset)}
                        disabled={asset.status !== AssetStatus.READY}
                        className={`p-1 rounded transition-colors ${
                          asset.status === AssetStatus.READY
                            ? 'hover:bg-green-600 text-green-400 hover:text-white'
                            : 'cursor-not-allowed text-gray-500 opacity-50'
                        }`}
                        title={
                          asset.status === AssetStatus.READY
                            ? 'Attach asset to scene'
                            : `Asset must be READY to attach (current: ${asset.status})`
                        }
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteAsset(asset.id)}
                        className="p-1 hover:bg-red-600 rounded transition-colors"
                        title="Delete asset"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Status and Attach Action */}
                  <div className="flex items-center justify-between mt-2">
                    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs ${statusConfig.bg} ${statusConfig.color}`}>
                      <StatusIcon size={12} className={asset.status === AssetStatus.PROCESSING ? 'animate-spin' : ''} />
                      <span>{statusConfig.label}</span>
                    </div>

                    {/* Attach Status Indicator */}
                    {asset.status === AssetStatus.READY && (
                      <div className="flex items-center space-x-1 text-xs text-green-400">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span>Ready to attach</span>
                      </div>
                    )}
                  </div>

                  {/* License */}
                  {asset.license && (
                    <span className="ml-2 px-2 py-1 bg-gray-600 text-xs rounded">
                      {LICENSE_LABELS[asset.license]}
                    </span>
                  )}

                  {/* Available Variants */}
                  {variants.length > 0 && (
                    <div className="mt-2 text-xs text-gray-400">
                      Variants: {variants.join(', ')}
                    </div>
                  )}

                  {/* Error Message */}
                  {asset.status === AssetStatus.FAILED && asset.errorMessage && (
                    <div className="mt-2 p-2 bg-red-900/50 rounded text-xs">
                      {asset.errorMessage}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-700 text-xs text-gray-400 text-center">
        {assets.length} asset{assets.length !== 1 ? 's' : ''} loaded
      </div>
    </div>
  );
}