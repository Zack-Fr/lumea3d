// src/types/transform.ts
// Unified representation for persisted item transforms (LOCAL TRS only)
export type ItemTransform = {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  scale: [number, number, number];
};

// Legacy shape used across the existing codebase. Keep for compatibility while migrating.
export type LegacyItemTransform = {
  position?: [number, number, number];
  rotation_euler?: [number, number, number]; // degrees
  quaternion?: [number, number, number, number];
  scale?: [number, number, number];
};