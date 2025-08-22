import { z } from 'zod';

// Enums and base types
export const Role = z.enum(['guest', 'designer', 'admin', 'client']);
export type Role = z.infer<typeof Role>;

export const StyleKey = z.enum(['modern', 'classic']);
export type StyleKey = z.infer<typeof StyleKey>;

// Auth schemas
export const RegisterBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: Role.optional().default('designer'),
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
  solver_ms: number;
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