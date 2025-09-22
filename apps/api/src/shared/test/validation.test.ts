import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { CreateSceneItemDto } from '../../scenes/dto/create-scene-item.dto';
import { AssetUploadUrlDto } from '../../assets/dto/assets.dto';

describe('Custom Validation Decorators', () => {
  describe('CreateSceneItemDto', () => {
    it('should validate valid 3D transform data', async () => {
      const validData = {
        categoryKey: 'office_chairs',
        position: [0, 1.7, -2.5],
        rotation: [0, 90, 0],
        scale: [1, 1, 1],
        model: 'chair_variant_01',
        materialVariant: 'leather_brown',
        selectable: true,
        locked: false,
        meta: { designer: 'john_doe' }
      };

      const dto = plainToClass(CreateSceneItemDto, validData);
      const errors = await validate(dto);
      
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid position coordinates', async () => {
      const invalidData = {
        categoryKey: 'office_chairs',
        position: [0, 1.7, 2000], // Out of bounds
        rotation: [0, 90, 0],
        scale: [1, 1, 1]
      };

      const dto = plainToClass(CreateSceneItemDto, invalidData);
      const errors = await validate(dto);
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isValidPosition).toContain('Position coordinate must be between -1000 and 1000 meters');
    });

    it('should reject invalid scale values', async () => {
      const invalidData = {
        categoryKey: 'office_chairs',
        position: [0, 1.7, 0],
        rotation: [0, 90, 0],
        scale: [1, 150, 1] // Out of bounds
      };

      const dto = plainToClass(CreateSceneItemDto, invalidData);
      const errors = await validate(dto);
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isValidScale).toContain('Scale factor must be between 0.01 and 100');
    });
  });

  describe('AssetUploadUrlDto', () => {
    it('should validate valid 3D asset upload data', async () => {
      const validData = {
        filename: 'chair_model.glb',
        contentType: 'model/gltf-binary',
        fileSize: 5 * 1024 * 1024, // 5MB
        category: 'office_furniture'
      };

      const dto = plainToClass(AssetUploadUrlDto, validData);
      const errors = await validate(dto);
      
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid content type', async () => {
      const invalidData = {
        filename: 'document.pdf',
        contentType: 'application/pdf', // Invalid for 3D assets
        fileSize: 1024 * 1024,
        category: 'office_furniture'
      };

      const dto = plainToClass(AssetUploadUrlDto, invalidData);
      const errors = await validate(dto);
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isValid3DAssetType).toContain('File must be a valid 3D asset type');
    });

    it('should reject files that are too large', async () => {
      const invalidData = {
        filename: 'huge_model.glb',
        contentType: 'model/gltf-binary',
        fileSize: 200 * 1024 * 1024, // 200MB - too large
        category: 'office_furniture'
      };

      const dto = plainToClass(AssetUploadUrlDto, invalidData);
      const errors = await validate(dto);
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isValidAssetSize).toContain('File size must not exceed 100MB');
    });
  });
});