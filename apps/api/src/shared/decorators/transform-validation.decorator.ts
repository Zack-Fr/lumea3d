import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Validates that a position coordinate is within reasonable 3D space bounds
 */
export function IsValidPosition(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidPosition',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: 'Position coordinate must be between -1000 and 1000 meters',
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'number') return false;
          if (isNaN(value) || !isFinite(value)) return false;
          return value >= -1000 && value <= 1000;
        },
      },
    });
  };
}

/**
 * Validates that a rotation value is within valid Euler angle range
 */
export function IsValidRotation(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidRotation',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: 'Rotation angle must be between -180 and 180 degrees',
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'number') return false;
          if (isNaN(value) || !isFinite(value)) return false;
          return value >= -180 && value <= 180;
        },
      },
    });
  };
}

/**
 * Validates that a scale factor is within reasonable bounds
 */
export function IsValidScale(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidScale',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: 'Scale factor must be between 0.01 and 100',
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'number') return false;
          if (isNaN(value) || !isFinite(value)) return false;
          return value >= 0.01 && value <= 100;
        },
      },
    });
  };
}

/**
 * Validates that an exposure value is within reasonable HDR bounds
 */
export function IsValidExposure(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidExposure',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: 'Exposure must be between -10 and 10 stops',
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'number') return false;
          if (isNaN(value) || !isFinite(value)) return false;
          return value >= -10 && value <= 10;
        },
      },
    });
  };
}

/**
 * Validates that a material color is a valid hex color or RGB/RGBA format
 */
export function IsValidColor(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidColor',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: 'Color must be a valid hex (#RRGGBB), RGB, or RGBA format',
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          
          // Hex color validation (#RGB, #RRGGBB, #RRGGBBAA)
          const hexPattern = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
          if (hexPattern.test(value)) return true;
          
          // RGB/RGBA validation
          const rgbPattern = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*([01]?(\.\d+)?))?\s*\)$/;
          const match = value.match(rgbPattern);
          if (match) {
            const r = parseInt(match[1]);
            const g = parseInt(match[2]);
            const b = parseInt(match[3]);
            return r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255;
          }
          
          return false;
        },
      },
    });
  };
}

/**
 * Validates that a file size is within reasonable limits for 3D assets
 */
export function IsValidAssetSize(maxSizeMB: number, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidAssetSize',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [maxSizeMB],
      options: {
        message: `File size must not exceed ${maxSizeMB}MB`,
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'number') return false;
          const [maxSize] = args.constraints;
          return value <= maxSize * 1024 * 1024; // Convert MB to bytes
        },
      },
    });
  };
}

/**
 * Validates that a MIME type is acceptable for 3D assets
 */
export function IsValid3DAssetType(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValid3DAssetType',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: 'File must be a valid 3D asset type (GLB, GLTF, or supported texture format)',
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          
          const validMimeTypes = [
            'model/gltf-binary',     // GLB files
            'model/gltf+json',       // GLTF files
            'image/jpeg',            // Textures
            'image/png',
            'image/webp',
            'image/ktx2',            // KTX2 compressed textures
            'application/octet-stream' // Binary files (may be GLB)
          ];
          
          return validMimeTypes.includes(value.toLowerCase());
        },
      },
    });
  };
}

/**
 * Validates that a category key follows the naming convention
 */
export function IsValidCategoryKey(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidCategoryKey',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: 'Category key must be lowercase, alphanumeric with underscores only (e.g., "office_chairs")',
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          
          // Must be lowercase alphanumeric with underscores, 1-50 chars
          const pattern = /^[a-z0-9_]{1,50}$/;
          return pattern.test(value);
        },
      },
    });
  };
}