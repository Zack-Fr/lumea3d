import { ApiProperty } from '@nestjs/swagger';

export class SceneManifestV2 {
  @ApiProperty({
    description: 'Scene metadata',
  })
  scene: {
    id: string;
    name: string;
    version: number;
    scale?: number;
    exposure?: number;
    envHdriUrl?: string;
    envIntensity?: number;
    spawnPoint: {
      position: { x: number; y: number; z: number };
      yawDeg: number;
    };
    navmeshAssetId?: string;
  };

  @ApiProperty({
    description: 'Scene items with transforms and materials',
  })
  items: Array<{
    id: string;
    categoryKey: string;
    model?: string;
    transform: {
      position: { x: number; y: number; z: number };
      rotation: { x: number; y: number; z: number };
      scale: { x: number; y: number; z: number };
    };
    material?: {
      variant?: string;
      overrides?: Record<string, any>;
    };
    behavior: {
      selectable: boolean;
      locked: boolean;
    };
    meta?: Record<string, any>;
  }>;

  @ApiProperty({
    description: 'Asset categories referenced in the scene with enhanced metadata support',
  })
  categories: Record<string, {
    assetId: string;
    variants: Record<string, {
      url: string;
      metadata?: Record<string, any>;
    }>;
    metadata?: {
      instancing?: boolean;
      draco?: boolean;
      meshopt?: boolean;
      ktx2?: boolean;
    };
  }>;

  @ApiProperty({
    description: 'Generation timestamp',
  })
  generatedAt: string;
}

export class SceneDelta {
  @ApiProperty({
    description: 'Scene version this delta applies to',
  })
  fromVersion: number;

  @ApiProperty({
    description: 'Target scene version after applying delta',
  })
  toVersion: number;

  @ApiProperty({
    description: 'Operations to apply',
  })
  operations: Array<{
    type: 'add' | 'update' | 'remove';
    target: 'scene' | 'item';
    id?: string;
    data?: any;
  }>;

  @ApiProperty({
    description: 'Delta generation timestamp',
  })
  timestamp: string;
}