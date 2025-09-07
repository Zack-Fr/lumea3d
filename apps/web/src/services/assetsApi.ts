import { AssetStatus, AssetLicense } from '@/api/sdk';

export interface AssetUploadUrlRequest {
    filename: string;
    contentType: string;
    fileSize: number;
    category: string;
    metadata?: Record<string, any>;
    }

export interface AssetUploadUrlResponse {
    asset_id: string;
    upload_url: string;
    expires_at: string;
}

export interface CreateAssetRequest {
    originalName: string;
    mimeType: string;
    fileSize: number;
    status?: AssetStatus;
    originalUrl?: string;
    license?: AssetLicense;
    reportJson?: Record<string, any>;
    errorMessage?: string;
}

export interface Asset {
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

export interface AssetStatusResponse {
    id: string;
    status: AssetStatus;
    originalUrl?: string;
    meshoptUrl?: string;
    dracoUrl?: string;
    navmeshUrl?: string;
    errorMessage?: string;
    processedAt?: string;
    createdAt: string;
    updatedAt: string;
}

class AssetsApiService {
    private baseUrl: string;

    constructor() {
        // Use environment variable or default to current origin
        this.baseUrl = import.meta.env.VITE_API_URL || '/api';
    }

    /**
   * Request a presigned upload URL for a new asset
   */
    async getUploadUrl(request: AssetUploadUrlRequest): Promise<AssetUploadUrlResponse> {
        const response = await fetch(`${this.baseUrl}/assets/upload-url`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get upload URL: ${response.status} ${errorText}`);
        }

    return response.json();
    }

    /**
   * Create a new asset record
   */
    async createAsset(request: CreateAssetRequest): Promise<Asset> {
    const response = await fetch(`${this.baseUrl}/assets`, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create asset: ${response.status} ${errorText}`);
    }

    return response.json();
    }

    /**
   * Get all user assets
   */
    async getUserAssets(): Promise<Asset[]> {
    const response = await fetch(`${this.baseUrl}/assets`);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch assets: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
    }

    /**
   * Get a specific asset by ID
   */
    async getAsset(assetId: string): Promise<Asset> {
    const response = await fetch(`${this.baseUrl}/assets/${assetId}`);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch asset: ${response.status} ${errorText}`);
    }

    return response.json();
    }

    /**
   * Get asset processing status
   */
    async getAssetStatus(assetId: string): Promise<AssetStatusResponse> {
    const response = await fetch(`${this.baseUrl}/assets/${assetId}/status`);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get asset status: ${response.status} ${errorText}`);
    }

    return response.json();
    }

/**
   * Delete an asset
   */
    async deleteAsset(assetId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/assets/${assetId}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete asset: ${response.status} ${errorText}`);
    }
    }

    /**
   * Generate download URL for an asset variant
   */
    async getDownloadUrl(
    assetId: string,
    variant: 'original' | 'meshopt' | 'draco' | 'navmesh' = 'original',
    expiresIn: number = 3600
    ): Promise<{ downloadUrl: string; expiresAt: string }> {
    const response = await fetch(`${this.baseUrl}/assets/${assetId}/download-url?variant=${variant}`, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresIn }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get download URL: ${response.status} ${errorText}`);
        }

    return response.json();
    }

    /**
   * Get available variants for an asset
   */
    async getAssetVariants(assetId: string): Promise<{
    variants: Array<{
        type: 'original' | 'meshopt' | 'draco' | 'navmesh';
        url: string;
        available: boolean;
    }>;
    }> {
    const response = await fetch(`${this.baseUrl}/assets/${assetId}/variants`);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get asset variants: ${response.status} ${errorText}`);
    }

    return response.json();
    }
}

// Export singleton instance
export const assetsApi = new AssetsApiService();