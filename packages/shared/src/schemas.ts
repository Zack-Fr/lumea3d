import { z } from 'zod';
/**
 * Canonical Role enum used across the monorepo.
 * Values match Prisma enum values (uppercase) so we have one source of truth.
 */
export enum RoleEnum {
  GUEST = 'GUEST',
  CLIENT = 'CLIENT',
  DESIGNER = 'DESIGNER',
  ADMIN = 'ADMIN',
}
// runtime zod validator (use as RoleSchema)
export const Role = z.nativeEnum(RoleEnum);
// TS type for convenience (import as `type Role`)
export type Role = z.infer<typeof Role>;

export const StyleKey = z.enum(['modern', 'classic']);
export type StyleKey = z.infer<typeof StyleKey>;

// 3D Asset enums (matching Prisma)
export enum AssetStatus {
  UPLOADED = 'UPLOADED',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
}

export enum AssetLicense {
  CC0 = 'CC0',
  ROYALTY_FREE = 'ROYALTY_FREE',
  PROPRIETARY = 'PROPRIETARY',
}

// 3D Vec3 type
export type Vec3 = [number, number, number];

// Auth schemas
export const RegisterBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: Role.optional().default(RoleEnum.CLIENT),
});
export type RegisterBody = z.infer<typeof RegisterBody>;

export const LoginBody = z.object({
  email: z.string().email(),
  password: z.string(),
});
export type LoginBody = z.infer<typeof LoginBody>;

// Project schemas
export const CreateProjectBody = z.object({
  name: z.string().min(1).max(100),
});
export type CreateProjectBody = z.infer<typeof CreateProjectBody>;

// Scene generation schemas
export const GenerateBody = z.object({
  seed: z.number().int().optional(),
  style: StyleKey.optional(),
});
export type GenerateBody = z.infer<typeof GenerateBody>;

// Placement update schemas
export const PlacementUpdate = z.object({
  placement_id: z.string().uuid(),
  x_cm: z.number().int(),
  y_cm: z.number().int(),
  rotation_deg: z.number().int().min(0).max(359),
});
export type PlacementUpdate = z.infer<typeof PlacementUpdate>;

export const PatchPlacementsBody = z.object({
  updates: z.array(PlacementUpdate).min(1).max(20),
  version: z.number().int().optional(),
});
export type PatchPlacementsBody = z.infer<typeof PatchPlacementsBody>;

// Feedback schemas
export const FeedbackBody = z.object({
  rating: z.number().int().min(1).max(5),
  tags: z.array(z.string()).optional(),
  comment: z.string().max(1000).optional(),
  is_private: z.boolean().optional(),
});
export type FeedbackBody = z.infer<typeof FeedbackBody>;

// Session/collaboration schemas
export const CreateSessionBody = z.object({
  expires_at: z.string().datetime().optional(),
});
export type CreateSessionBody = z.infer<typeof CreateSessionBody>;

export const CreateInviteBody = z.object({
  expires_at: z.string().datetime().optional(),
});
export type CreateInviteBody = z.infer<typeof CreateInviteBody>;

export const JoinBody = z.object({
  token: z.string().min(16).max(256),
});
export type JoinBody = z.infer<typeof JoinBody>;

// Response DTOs
export interface AssetDto {
  key: 'sofa' | 'coffee_table' | 'side_table';
  width_cm: number;
  depth_cm: number;
}

export interface PlacementDto {
  id: string;
  asset_key: 'sofa' | 'coffee_table' | 'side_table';
  x_cm: number;
  y_cm: number;
  rotation_deg: number;
}

export interface ComplianceCheckDto {
  rule_key: string;
  passed: boolean;
  message: string;
}

export interface SceneDto {
  id: string;
  version: number;
  room: { w_cm: number; h_cm: number };
  placements: PlacementDto[];
  checks: ComplianceCheckDto[];
  rationale: Record<string, string[]>;
  status: 'ok' | 'fallback' | 'error';
  created_at: string;
}

export interface ProjectDto {
  id: string;
  name: string;
  created_at: string;
  latest_scene?: SceneDto;
}

export interface FeedbackDto {
  id: string;
  rating: number;
  tags: string[];
  comment?: string;
  is_private: boolean;
  user_id: string;
  created_at: string;
}

// WebSocket event types
export interface PresenceJoinEvent {
  user_id: string;
  display_name: string;
}

export interface PresenceLeaveEvent {
  user_id: string;
}

export interface CameraUpdateEvent {
  position: [number, number, number];
  target: [number, number, number];
  perspective: boolean;
}

export interface ChatMessageEvent {
  user_id: string;
  text: string;
}

export interface ChatReactionEvent {
  user_id: string;
  emoji: string;
}

export interface ActionGenerateEvent {
  type: 'generate:start' | 'generate:done';
  seed?: number;
  scene_id?: string;
}

export interface GuestFollowEvent {
  follow: boolean;
}

// ============================================================================
// 3D VIEWER TYPES - Scene Manifest V2 and Realtime Deltas
// ============================================================================

// SceneManifestV2 interface (matches the brief specification)
export interface SceneManifestV2 {
  version: 2;
  scale?: number;
  exposure?: number;
  env?: { hdri_url?: string; intensity?: number };
  spawn: { position: Vec3; yaw_deg: number };
  navmesh_url: string;

  categories: Record<string, {
    glb_url?: string;
    encodings?: { meshopt_url?: string; draco_url?: string };
    instancing?: boolean;
    draco?: boolean;
    meshopt?: boolean;
    ktx2?: boolean;
    license?: 'cc0' | 'royalty-free' | 'proprietary';
  }>;

  items: Array<{
    id: string;
    category: string;
    model?: string;
    transform: { position: Vec3; rotation_euler: Vec3; scale: Vec3 };
    material?: { variant?: string; overrides?: Record<string, unknown> };
    selectable?: boolean;
    locked?: boolean;
    meta?: Record<string, string>;
  }>;
}

// Realtime delta operations
export type DeltaOp =
  | { op: 'upsert_item'; item: { id: string; category: string; model?: string; transform: { position: Vec3; rotation_euler: Vec3; scale: Vec3 }; material?: { variant?: string; overrides?: Record<string, unknown> }; selectable?: boolean; locked?: boolean; meta?: Record<string, string> } }
  | { op: 'remove_item'; id: string }
  | { op: 'update_item'; id: string; transform?: { position?: Vec3; rotation_euler?: Vec3; scale?: Vec3 }; material?: { variant?: string; overrides?: Record<string, unknown> }; selectable?: boolean; locked?: boolean; meta?: Record<string, string> }
  | { op: 'scene_props'; exposure?: number; env?: { hdri_url?: string; intensity?: number }; spawn?: { position: Vec3; yaw_deg: number } }
  | { op: 'category_add'; key: string; category: { encodings?: { meshopt_url?: string; draco_url?: string }; instancing?: boolean; meshopt?: boolean; draco?: boolean; ktx2?: boolean; license?: string } }
  | { op: 'category_remove'; key: string };

// Realtime events
export interface SceneDelta {
  sceneId: string;
  v: number;            // scene.version after applying ops
  ts: number;           // server epoch ms
  ops: DeltaOp[];
  actor: { id: string; role: 'designer' | 'admin' | 'client' | 'guest' };
  reqId?: string;       // echoes REST write idempotency key
}

export interface SceneInit { 
  sceneId: string; 
  v: number; 
  manifest: SceneManifestV2; 
}

export interface SceneError { 
  code: string; 
  message: string; 
  details?: unknown; 
}

// 3D API request/response schemas
export const AssetUploadResponse = z.object({
  asset_id: z.string(),
  kind: z.string(),
  status: z.nativeEnum(AssetStatus),
  urls: z.object({
    original_url: z.string().optional(),
    meshopt_url: z.string().optional(),
    draco_url: z.string().optional(),
  }).optional(),
});
export type AssetUploadResponse = z.infer<typeof AssetUploadResponse>;

export const CreateCategory3DBody = z.object({
  asset_id: z.string(),
  category_key: z.string(),
  instancing: z.boolean().optional().default(false),
  draco: z.boolean().optional().default(true),
  meshopt: z.boolean().optional().default(true),
  ktx2: z.boolean().optional().default(true),
});
export type CreateCategory3DBody = z.infer<typeof CreateCategory3DBody>;

export const CreateScene3DBody = z.object({
  name: z.string().min(1).max(100),
  scale: z.number().optional().default(1.0),
  exposure: z.number().optional().default(1.0),
  env_hdri_url: z.string().optional(),
  env_intensity: z.number().optional().default(1.0),
  spawn_position: z.tuple([z.number(), z.number(), z.number()]).optional().default([0, 1.7, 5]),
  spawn_yaw_deg: z.number().optional().default(0),
  navmesh_asset_id: z.string().optional(),
});
export type CreateScene3DBody = z.infer<typeof CreateScene3DBody>;

export const PatchSceneItems3DBody = z.object({
  ops: z.array(z.union([
    z.object({ op: z.literal('upsert_item'), item: z.object({
      id: z.string(),
      category_key: z.string(),
      model: z.string().optional(),
      position: z.tuple([z.number(), z.number(), z.number()]),
      rotation_euler: z.tuple([z.number(), z.number(), z.number()]),
      scale: z.tuple([z.number(), z.number(), z.number()]).optional().default([1, 1, 1]),
      material_variant: z.string().optional(),
      material_overrides: z.record(z.unknown()).optional(),
      selectable: z.boolean().optional().default(true),
      locked: z.boolean().optional().default(false),
      meta: z.record(z.string()).optional(),
    }) }),
    z.object({ op: z.literal('remove_item'), id: z.string() }),
    z.object({ op: z.literal('update_item'), id: z.string(), 
      position: z.tuple([z.number(), z.number(), z.number()]).optional(),
      rotation_euler: z.tuple([z.number(), z.number(), z.number()]).optional(),
      scale: z.tuple([z.number(), z.number(), z.number()]).optional(),
      material_variant: z.string().optional(),
      material_overrides: z.record(z.unknown()).optional(),
      selectable: z.boolean().optional(),
      locked: z.boolean().optional(),
      meta: z.record(z.string()).optional(),
    }),
  ])).max(128), // Max 128 ops per delta as per brief
  version: z.number().int().optional(), // For optimistic locking
});
export type PatchSceneItems3DBody = z.infer<typeof PatchSceneItems3DBody>;

export const PatchSceneProps3DBody = z.object({
  scale: z.number().optional(),
  exposure: z.number().optional(),
  env_hdri_url: z.string().optional(),
  env_intensity: z.number().optional(),
  spawn_position: z.tuple([z.number(), z.number(), z.number()]).optional(),
  spawn_yaw_deg: z.number().optional(),
  version: z.number().int().optional(), // For optimistic locking
});
export type PatchSceneProps3DBody = z.infer<typeof PatchSceneProps3DBody>;