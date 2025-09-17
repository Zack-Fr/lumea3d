import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as sharp from 'sharp';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ThumbnailProcessResult {
  fileName: string;
  filePath: string;
  url: string;
  width: number;
  height: number;
  fileSize: number;
}

@Injectable()
export class ThumbnailService {
  constructor(private prisma: PrismaService) {}

  private readonly THUMBNAILS_DIR = process.env.THUMBNAILS_STORAGE_PATH || './storage/thumbnails';
  private readonly BASE_URL = process.env.THUMBNAILS_BASE_URL || 'http://localhost:3000/storage/thumbnails';
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly THUMBNAIL_SIZE = { width: 400, height: 300 };

  /**
   * Process and save a thumbnail image from base64 data
   */
  async processThumbnail(
    projectId: string,
    imageData: string,
    type: 'auto' | 'custom' = 'auto',
    originalFilename?: string,
  ): Promise<ThumbnailProcessResult> {
    // Validate base64 data
    const base64Match = imageData.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
    if (!base64Match) {
      throw new BadRequestException('Invalid image data format. Must be base64 encoded image.');
    }

    const [, imageFormat, base64Data] = base64Match;
    const buffer = Buffer.from(base64Data, 'base64');

    // Check file size
    if (buffer.length > this.MAX_FILE_SIZE) {
      throw new BadRequestException(`File size too large. Maximum allowed: ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Generate filename
    const timestamp = Date.now();
    const extension = imageFormat === 'jpeg' ? 'jpg' : imageFormat;
    const fileName = `project-${projectId}-${type}-${timestamp}.${extension}`;
    const filePath = path.join(this.THUMBNAILS_DIR, fileName);

    // Ensure thumbnails directory exists
    await fs.mkdir(this.THUMBNAILS_DIR, { recursive: true });

    try {
      // Process image with Sharp - resize and optimize
      const processedBuffer = await sharp(buffer)
        .resize(this.THUMBNAIL_SIZE.width, this.THUMBNAIL_SIZE.height, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({
          quality: 85,
          progressive: true,
        })
        .toBuffer();

      // Save processed image
      await fs.writeFile(filePath, processedBuffer);

      // Get image metadata
      const metadata = await sharp(processedBuffer).metadata();

      return {
        fileName,
        filePath,
        url: `${this.BASE_URL}/${fileName}`,
        width: metadata.width || this.THUMBNAIL_SIZE.width,
        height: metadata.height || this.THUMBNAIL_SIZE.height,
        fileSize: processedBuffer.length,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to process image: ${error.message}`);
    }
  }

  /**
   * Update project thumbnail in database
   */
  async updateProjectThumbnail(
    projectId: string,
    thumbnailUrl: string,
    type: 'auto' | 'custom',
  ): Promise<void> {
    const updateData: any = {
      thumbnailUpdatedAt: new Date(),
    };

    if (type === 'auto') {
      updateData.thumbnailUrl = thumbnailUrl;
    } else {
      updateData.customThumbnailUrl = thumbnailUrl;
    }

    await this.prisma.project.update({
      where: { id: projectId },
      data: updateData,
    });
  }

  /**
   * Delete project thumbnail
   */
  async deleteProjectThumbnail(
    projectId: string,
    type: 'auto' | 'custom' | 'all',
  ): Promise<void> {
    // Get current project to find thumbnail files
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { thumbnailUrl: true, customThumbnailUrl: true },
    });

    if (!project) {
      throw new BadRequestException('Project not found');
    }

    const filesToDelete: string[] = [];
    const updateData: any = {};

    if (type === 'auto' || type === 'all') {
      if (project.thumbnailUrl) {
        const fileName = path.basename(new URL(project.thumbnailUrl).pathname);
        filesToDelete.push(path.join(this.THUMBNAILS_DIR, fileName));
        updateData.thumbnailUrl = null;
      }
    }

    if (type === 'custom' || type === 'all') {
      if (project.customThumbnailUrl) {
        const fileName = path.basename(new URL(project.customThumbnailUrl).pathname);
        filesToDelete.push(path.join(this.THUMBNAILS_DIR, fileName));
        updateData.customThumbnailUrl = null;
      }
    }

    // Delete files from storage
    await Promise.allSettled(
      filesToDelete.map(async (filePath) => {
        try {
          await fs.unlink(filePath);
        } catch (error) {
          console.warn(`Failed to delete thumbnail file: ${filePath}`, error);
        }
      })
    );

    // Update database
    if (Object.keys(updateData).length > 0) {
      updateData.thumbnailUpdatedAt = new Date();
      await this.prisma.project.update({
        where: { id: projectId },
        data: updateData,
      });
    }
  }

  /**
   * Get the best available thumbnail for a project
   */
  getBestThumbnail(project: { thumbnailUrl?: string; customThumbnailUrl?: string }): string | null {
    // Prefer custom thumbnail over auto-generated
    return project.customThumbnailUrl || project.thumbnailUrl || null;
  }

  /**
   * Validate image format and size
   */
  validateImageData(imageData: string): { isValid: boolean; error?: string } {
    const base64Match = imageData.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
    
    if (!base64Match) {
      return { isValid: false, error: 'Invalid image format. Supported formats: PNG, JPEG, WebP' };
    }

    const [, , base64Data] = base64Match;
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > this.MAX_FILE_SIZE) {
      return { 
        isValid: false, 
        error: `File size too large. Maximum allowed: ${this.MAX_FILE_SIZE / 1024 / 1024}MB` 
      };
    }

    return { isValid: true };
  }
}