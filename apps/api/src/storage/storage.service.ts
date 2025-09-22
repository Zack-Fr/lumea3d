import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface PresignedUploadUrl {
  uploadUrl: string;
  objectKey: string;
  expiresIn: number;
}

export interface PresignedDownloadUrl {
  downloadUrl: string;
  expiresIn: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly externalS3Client: S3Client;
  private readonly bucketName: string;

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>('STORAGE_ENDPOINT');
    const externalEndpoint = this.configService.get<string>('STORAGE_EXTERNAL_ENDPOINT', endpoint);
    const region = this.configService.get<string>('STORAGE_REGION', 'us-east-1');
    const accessKeyId = this.configService.get<string>('STORAGE_ACCESS_KEY');
    const secretAccessKey = this.configService.get<string>('STORAGE_SECRET_KEY');
    this.bucketName = this.configService.get<string>('STORAGE_BUCKET_NAME', 'lumea-assets');

    // Internal S3 client for server-to-MinIO communication
    this.s3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true, // Required for MinIO
    });

    // External S3 client for generating presigned URLs accessible from browsers
    this.externalS3Client = new S3Client({
      endpoint: externalEndpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true, // Required for MinIO
    });

    this.logger.log(`Storage service initialized for bucket: ${this.bucketName}`);
    this.logger.log(`Internal endpoint: ${endpoint}`);
    this.logger.log(`External endpoint: ${externalEndpoint}`);
  }

  /**
   * Generate a presigned URL for uploading an asset
   * Object key format: assets/{userId}/{category}/{assetId}/{filename}
   */
  async generatePresignedUploadUrl(
    userId: string,
    category: string,
    assetId: string,
    filename: string,
    contentType?: string,
  ): Promise<PresignedUploadUrl> {
    const objectKey = `assets/${userId}/${category}/${assetId}/${filename}`;
    
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
      ContentType: contentType,
    });

    const expiresIn = 3600; // 1 hour
    // Use external S3 client for presigned URLs so browsers can access them
    const uploadUrl = await getSignedUrl(this.externalS3Client, command, { expiresIn });

    this.logger.log(`Generated presigned upload URL for: ${objectKey}`);
    this.logger.log(`Upload URL: ${uploadUrl}`);
    
    return {
      uploadUrl,
      objectKey,
      expiresIn,
    };
  }

  /**
   * Generate a presigned URL for downloading an asset
   */
  async generatePresignedDownloadUrl(
    objectKey: string,
    expiresIn: number = 3600,
  ): Promise<PresignedDownloadUrl> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
    });

    // Use external S3 client for presigned URLs so browsers can access them
    const downloadUrl = await getSignedUrl(this.externalS3Client, command, { expiresIn });

    this.logger.log(`Generated presigned download URL for: ${objectKey}`);
    this.logger.log(`Download URL: ${downloadUrl}`);
    
    return {
      downloadUrl,
      expiresIn,
    };
  }

  /**
   * Delete an asset from storage
   */
  async deleteAsset(objectKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
    });

    await this.s3Client.send(command);
    this.logger.log(`Deleted asset: ${objectKey}`);
  }

  /**
   * Generate object key for an asset
   * Format: assets/{userId}/{category}/{assetId}/{filename}
   */
  generateObjectKey(userId: string, category: string, assetId: string, filename: string): string {
    return `assets/${userId}/${category}/${assetId}/${filename}`;
  }

  /**
   * Generate object key for processed asset variants
   * Format: assets/{userId}/{category}/{assetId}/processed/{variant}/{filename}
   */
  generateProcessedObjectKey(
    userId: string,
    category: string,
    assetId: string,
    variant: string,
    filename: string,
  ): string {
    return `assets/${userId}/${category}/${assetId}/processed/${variant}/${filename}`;
  }

  /**
   * Parse object key to extract components
   */
  parseObjectKey(objectKey: string): {
    userId: string;
    category: string;
    assetId: string;
    filename: string;
    isProcessed: boolean;
    variant?: string;
  } | null {
    const parts = objectKey.split('/');
    
    if (parts.length < 5 || parts[0] !== 'assets') {
      return null;
    }

    const [, userId, category, assetId, ...rest] = parts;
    
    if (rest[0] === 'processed' && rest.length >= 3) {
      // Processed asset: assets/{userId}/{category}/{assetId}/processed/{variant}/{filename}
      const [, variant, ...filenameParts] = rest;
      return {
        userId,
        category,
        assetId,
        filename: filenameParts.join('/'),
        isProcessed: true,
        variant,
      };
    } else {
      // Original asset: assets/{userId}/{category}/{assetId}/{filename}
      return {
        userId,
        category,
        assetId,
        filename: rest.join('/'),
        isProcessed: false,
      };
    }
  }

  /**
   * Download an asset from storage to a local file path
   */
  async downloadAssetToFile(objectKey: string, localFilePath: string): Promise<void> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
    });

    try {
      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('No body in S3 response');
      }

      // Convert stream to buffer and write to file
      const chunks: Buffer[] = [];
      const stream = response.Body as any;
      
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      
      const buffer = Buffer.concat(chunks);
      const fs = await import('fs/promises');
      await fs.writeFile(localFilePath, buffer);
      
      this.logger.log(`Downloaded ${objectKey} to ${localFilePath}`);
    } catch (error) {
      this.logger.error(`Failed to download ${objectKey}:`, error);
      throw error;
    }
  }

  /**
   * Upload a local file to storage
   */
  async uploadFileToStorage(localFilePath: string, objectKey: string, contentType?: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const fileBuffer = await fs.readFile(localFilePath);
      
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
        Body: fileBuffer,
        ContentType: contentType,
      });

      await this.s3Client.send(command);
      this.logger.log(`Uploaded ${localFilePath} to ${objectKey}`);
    } catch (error) {
      this.logger.error(`Failed to upload ${objectKey}:`, error);
      throw error;
    }
  }

  /**
   * Generate a public download URL that uses our backend proxy instead of presigned URLs
   */
  generatePublicDownloadUrl(objectKey: string): string {
    // Get the backend API base URL from config, fallback to localhost:3000
    const apiBaseUrl = this.configService.get<string>('API_BASE_URL', 'http://localhost:3000');
    
    console.log(`[DEBUG] generatePublicDownloadUrl - Input objectKey: ${objectKey}`);
    console.log(`[DEBUG] generatePublicDownloadUrl - API Base URL: ${apiBaseUrl}`);
    console.log(`[DEBUG] generatePublicDownloadUrl - Bucket: ${this.bucketName}`);
    
    // Encode the object key to handle special characters
    const encodedObjectKey = encodeURIComponent(objectKey);
    
    // Return the public storage serve endpoint URL
    const finalUrl = `${apiBaseUrl}/public/storage/serve/${this.bucketName}/${encodedObjectKey}`;
    console.log(`[DEBUG] generatePublicDownloadUrl - Final URL: ${finalUrl}`);
    
    return finalUrl;
  }

  /**
   * Check if an object exists in storage
   */
  async objectExists(objectKey: string): Promise<boolean> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }
}
