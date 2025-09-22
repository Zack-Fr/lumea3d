import { useState, useCallback, useEffect, useRef } from 'react';
import { AssetStatus } from '@/api/sdk';
import { assetsApi } from '@/services/assetsApi';

export interface AssetProcessingStatus {
  assetId: string;
  status: AssetStatus;
  progress: number;
  message: string;
  errorMessage?: string;
  lastUpdated: Date;
  variants?: {
    original?: string;
    meshopt?: string;
    draco?: string;
    ktx2?: string;
    navmesh?: string;
  };
  queueStatus?: {
    status: string;
    progress?: number;
    error?: string;
  };
}

export interface AssetProcessingOptions {
  pollInterval?: number; // milliseconds, default 5000
  maxPollAttempts?: number; // default 60 (5 minutes with 5s intervals)
  autoRetryOnFailure?: boolean; // default false
  onStatusUpdate?: (status: AssetProcessingStatus) => void;
  onComplete?: (status: AssetProcessingStatus) => void;
  onError?: (status: AssetProcessingStatus) => void;
}

export interface UseAssetProcessingReturn {
  status: AssetProcessingStatus | null;
  isPolling: boolean;
  isRetrying: boolean;
  error: string | null;
  startPolling: (assetId: string, options?: AssetProcessingOptions) => void;
  stopPolling: () => void;
  retryProcessing: () => Promise<boolean>;
  refreshStatus: () => Promise<void>;
}

/**
 * Enhanced hook for managing asset processing status with polling and retry functionality
 */
export function useAssetProcessing(): UseAssetProcessingReturn {
  const [status, setStatus] = useState<AssetProcessingStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const pollIntervalRef = useRef<number | null>(null);
  const optionsRef = useRef<AssetProcessingOptions>({});
  const attemptCountRef = useRef(0);

  // Clear polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  /**
   * Calculate progress percentage based on status
   */
  const calculateProgress = useCallback((assetStatus: AssetStatus, queueStatus?: any): number => {
    switch (assetStatus) {
      case AssetStatus.UPLOADED:
        return 10;
      case AssetStatus.PROCESSING:
        // Use queue progress if available, otherwise estimate based on queue status
        if (queueStatus?.progress !== undefined) {
          return Math.min(10 + (queueStatus.progress * 0.8), 90); // 10-90%
        }
        return queueStatus?.status === 'active' ? 50 : 30;
      case AssetStatus.READY:
        return 100;
      case AssetStatus.FAILED:
        return 0;
      default:
        return 0;
    }
  }, []);

  /**
   * Get user-friendly status message
   */
  const getStatusMessage = useCallback((assetStatus: AssetStatus, queueStatus?: any): string => {
    switch (assetStatus) {
      case AssetStatus.UPLOADED:
        return 'Asset uploaded, preparing for processing...';
      case AssetStatus.PROCESSING:
        if (queueStatus?.status === 'waiting') {
          return 'Waiting in processing queue...';
        }
        if (queueStatus?.status === 'active') {
          return 'Processing 3D model and generating variants...';
        }
        return 'Processing asset...';
      case AssetStatus.READY:
        return 'Asset processing completed successfully!';
      case AssetStatus.FAILED:
        return queueStatus?.error || 'Asset processing failed';
      default:
        return 'Unknown status';
    }
  }, []);

  /**
   * Fetch current asset processing status from the API
   */
  const fetchAssetStatus = useCallback(async (assetId: string): Promise<AssetProcessingStatus> => {
    try {
      const data = await assetsApi.getAssetProcessingStatus(assetId);
      
      // Map API response to our status interface
      const processingStatus: AssetProcessingStatus = {
        assetId,
        status: data.assetStatus || AssetStatus.PROCESSING,
        progress: calculateProgress(data.assetStatus, data.queueStatus),
        message: getStatusMessage(data.assetStatus, data.queueStatus),
        errorMessage: data.queueStatus?.error,
        lastUpdated: new Date(),
        variants: data.variants,
        queueStatus: data.queueStatus,
      };

      return processingStatus;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      throw new Error(`Asset status fetch failed: ${errorMessage}`);
    }
  }, [calculateProgress, getStatusMessage]);

  /**
   * Stop polling for status updates
   */
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  /**
   * Retry asset processing
   */
  const retryProcessing = useCallback(async (): Promise<boolean> => {
    if (!status?.assetId) {
      setError('No asset ID available for retry');
      return false;
    }

    setIsRetrying(true);
    setError(null);

    try {
      const result = await assetsApi.retryProcessing(status.assetId);
      
      if (result.success) {
        // Reset attempt counter
        attemptCountRef.current = 0;
        return true;
      } else {
        throw new Error(result.message || 'Retry request failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Retry failed';
      setError(errorMessage);
      return false;
    } finally {
      setIsRetrying(false);
    }
  }, [status?.assetId]);

  /**
   * Start polling for asset status updates
   */
  const startPolling = useCallback((assetId: string, options: AssetProcessingOptions = {}) => {
    // Stop any existing polling
    stopPolling();

    // Store options
    optionsRef.current = {
      pollInterval: 5000,
      maxPollAttempts: 60,
      autoRetryOnFailure: false,
      ...options,
    };

    attemptCountRef.current = 0;
    setIsPolling(true);
    setError(null);

    const poll = async () => {
      try {
        const newStatus = await fetchAssetStatus(assetId);
        setStatus(newStatus);
        setError(null);

        // Notify callback
        optionsRef.current.onStatusUpdate?.(newStatus);

        // Check if processing is complete
        if (newStatus.status === AssetStatus.READY) {
          setIsPolling(false);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          optionsRef.current.onComplete?.(newStatus);
          return;
        }

        // Check if processing failed
        if (newStatus.status === AssetStatus.FAILED) {
          setIsPolling(false);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          
          // Auto-retry if enabled
          if (optionsRef.current.autoRetryOnFailure) {
            setTimeout(async () => {
              const retrySuccess = await retryProcessing();
              if (retrySuccess) {
                // Restart polling after successful retry
                setTimeout(() => startPolling(assetId, optionsRef.current), 1000);
              }
            }, 2000);
          } else {
            optionsRef.current.onError?.(newStatus);
          }
          return;
        }

        // Check attempt limit
        attemptCountRef.current++;
        if (attemptCountRef.current >= (optionsRef.current.maxPollAttempts || 60)) {
          setIsPolling(false);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          const timeoutError = 'Processing timeout - asset is taking longer than expected';
          setError(timeoutError);
          optionsRef.current.onError?.({
            ...newStatus,
            errorMessage: timeoutError,
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Polling failed';
        console.error('Asset polling error:', errorMessage);
        setError(errorMessage);
        
        // Continue polling even on fetch errors (network issues are temporary)
        attemptCountRef.current++;
        if (attemptCountRef.current >= (optionsRef.current.maxPollAttempts || 60)) {
          setIsPolling(false);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      }
    };

    // Start immediate poll, then set interval
    poll();
    pollIntervalRef.current = window.setInterval(poll, optionsRef.current.pollInterval || 5000);
  }, [fetchAssetStatus, stopPolling, retryProcessing]);

  /**
   * Manually refresh status once
   */
  const refreshStatus = useCallback(async (): Promise<void> => {
    if (!status?.assetId) {
      setError('No asset ID available for refresh');
      return;
    }

    try {
      setError(null);
      const newStatus = await fetchAssetStatus(status.assetId);
      setStatus(newStatus);
      optionsRef.current.onStatusUpdate?.(newStatus);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Refresh failed';
      setError(errorMessage);
    }
  }, [status?.assetId, fetchAssetStatus]);

  return {
    status,
    isPolling,
    isRetrying,
    error,
    startPolling,
    stopPolling,
    retryProcessing,
    refreshStatus,
  };
}