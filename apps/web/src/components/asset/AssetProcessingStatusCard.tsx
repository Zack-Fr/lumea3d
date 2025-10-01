import React from 'react';
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  Clock, 
  Zap,
  FileCheck,
  AlertTriangle,
  Download
} from 'lucide-react';
import { AssetStatus } from '@/api/sdk';
import { AssetProcessingStatus } from '@/hooks/useAssetProcessing';

interface AssetProcessingStatusProps {
  status: AssetProcessingStatus;
  isRetrying: boolean;
  onRetry: () => Promise<boolean>;
  onRefresh: () => Promise<void>;
  className?: string;
}

interface StatusVariantDisplayProps {
  variants?: AssetProcessingStatus['variants'];
  isReady: boolean;
}

/**
 * Component to display asset variant information
 */
const StatusVariantDisplay: React.FC<StatusVariantDisplayProps> = ({ variants, isReady }) => {
  if (!variants || !isReady) return null;

  const availableVariants = Object.entries(variants).filter(([_, url]) => url);

  if (availableVariants.length === 0) return null;

  return (
    <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <FileCheck className="text-green-400" size={16} />
        <span className="text-sm font-medium text-green-400">Available Variants</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {availableVariants.map(([variant]) => (
          <div key={variant} className="flex items-center gap-1 text-gray-300">
            <Download size={12} className="text-green-400" />
            <span className="capitalize">{variant}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Enhanced Asset Processing Status Component with retry functionality and detailed progress
 */
export const AssetProcessingStatusCard: React.FC<AssetProcessingStatusProps> = ({
  status,
  isRetrying,
  onRetry,
  onRefresh,
  className = ''
}) => {
  const getStatusIcon = () => {
    if (isRetrying) {
      return <Loader2 className="text-blue-400 animate-spin" size={20} />;
    }

    switch (status.status) {
      case AssetStatus.UPLOADED:
        return <Clock className="text-yellow-400" size={20} />;
      case AssetStatus.PROCESSING:
        return <Loader2 className="text-blue-400 animate-spin" size={20} />;
      case AssetStatus.READY:
        return <CheckCircle className="text-green-400" size={20} />;
      case AssetStatus.FAILED:
        return <AlertCircle className="text-red-400" size={20} />;
      default:
        return <AlertTriangle className="text-gray-400" size={20} />;
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case AssetStatus.UPLOADED:
        return 'border-yellow-500/20 bg-yellow-500/5';
      case AssetStatus.PROCESSING:
        return 'border-blue-500/20 bg-blue-500/5';
      case AssetStatus.READY:
        return 'border-green-500/20 bg-green-500/5';
      case AssetStatus.FAILED:
        return 'border-red-500/20 bg-red-500/5';
      default:
        return 'border-gray-500/20 bg-gray-500/5';
    }
  };

  const getProgressBarColor = () => {
    switch (status.status) {
      case AssetStatus.PROCESSING:
        return 'bg-blue-500';
      case AssetStatus.READY:
        return 'bg-green-500';
      case AssetStatus.FAILED:
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const showRetryButton = status.status === AssetStatus.FAILED && !isRetrying;
  const showRefreshButton = status.status === AssetStatus.PROCESSING || status.status === AssetStatus.UPLOADED;
  const isComplete = status.status === AssetStatus.READY;
  const hasFailed = status.status === AssetStatus.FAILED;

  return (
    <div className={`bg-gray-800 border rounded-lg p-4 ${getStatusColor()} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <div className="font-medium text-white">
              {isRetrying ? 'Retrying Processing...' : status.message}
            </div>
            <div className="text-xs text-gray-400">
              Asset ID: {status.assetId.slice(0, 8)}...
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {showRefreshButton && (
            <button
              onClick={onRefresh}
              className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
              title="Refresh Status"
            >
              <RefreshCw size={16} />
            </button>
          )}
          
          {showRetryButton && (
            <button
              onClick={onRetry}
              disabled={isRetrying}
              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
            >
              <Zap size={14} />
              <span>Retry</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {!isComplete && !hasFailed && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Progress</span>
            <span>{Math.round(status.progress)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${getProgressBarColor()}`}
              style={{ width: `${status.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Queue Status */}
      {status.queueStatus && status.status === AssetStatus.PROCESSING && (
        <div className="mb-3 p-2 bg-gray-700/50 rounded text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Queue Status:</span>
            <span className="text-blue-400 capitalize">{status.queueStatus.status}</span>
          </div>
          {status.queueStatus.progress !== undefined && (
            <div className="flex items-center justify-between mt-1">
              <span className="text-gray-300">Queue Progress:</span>
              <span className="text-blue-400">{Math.round(status.queueStatus.progress * 100)}%</span>
            </div>
          )}
        </div>
      )}

      {/* Error Details */}
      {status.errorMessage && hasFailed && (
        <div className="mb-3 p-3 bg-red-900/30 border border-red-500/30 rounded">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="text-red-400" size={14} />
            <span className="text-sm font-medium text-red-400">Error Details</span>
          </div>
          <div className="text-xs text-red-300 break-words">
            {status.errorMessage}
          </div>
        </div>
      )}

      {/* Variant Information */}
      <StatusVariantDisplay variants={status.variants} isReady={isComplete} />

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 mt-3 pt-2 border-t border-gray-700">
        <span>Last Updated</span>
        <span>{formatTimestamp(status.lastUpdated)}</span>
      </div>
    </div>
  );
};

export default AssetProcessingStatusCard;