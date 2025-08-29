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
  private readonly bucketName: string;

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>('STORAGE_ENDPOINT');
    const region = this.configService.get<string>('STORAGE_REGION', 'us-east-1');
    const accessKeyId = this.configService.get<string>('STORAGE_ACCESS_KEY');
    const secretAccessKey = this.configService.get<string>('STORAGE_SECRET_KEY');
    this.bucketName = this.configService.get<string>('STORAGE_BUCKET_NAME', 'lumea-assets');

    this.s3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true, // Required for MinIO
    });

    this.logger.log(`Storage service initialized for bucket: ${this.bucketName}`);
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
    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });

    this.logger.log(`Generated presigned upload URL for: ${objectKey}`);
    
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

    const downloadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });

    this.logger.log(`Generated presigned download URL for: ${objectKey}`);
    
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
}