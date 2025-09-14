// Feature flags for enabling/disabling experimental features

export const FEATURE_INSTANCING = import.meta.env.VITE_FEATURE_INSTANCING === 'true';

// Add other feature flags here as needed
export const FEATURE_ADVANCED_LIGHTING = import.meta.env.VITE_FEATURE_ADVANCED_LIGHTING === 'true';
export const FEATURE_DEBUG_MODE = import.meta.env.VITE_FEATURE_DEBUG_MODE === 'true';

console.log('🏳️ Feature flags:', {
  INSTANCING: FEATURE_INSTANCING,
  ADVANCED_LIGHTING: FEATURE_ADVANCED_LIGHTING,
  DEBUG: FEATURE_DEBUG_MODE
});