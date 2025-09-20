// Test the new store architecture
import { selectionStore, cameraStore, manifestStore } from './index';

console.log('=== Testing Store Architecture ===');

// Test selection store
console.log('1. Testing Selection Store');
const initialSelection = selectionStore.getState().selected;
console.log('Initial selection:', initialSelection);

selectionStore.getState().set({
  assetId: 'test-asset',
  itemId: 'test-item-123',
  index: 0,
});

const updatedSelection = selectionStore.getState().selected;
console.log('Updated selection:', updatedSelection);

// Test camera store
console.log('2. Testing Camera Store');
const initialPose = cameraStore.getState().pose;
console.log('Initial camera pose:', initialPose);

cameraStore.getState().setPose({
  p: [5, 3, 5],
  t: [0, 0, 0]
}, 'local');

const updatedPose = cameraStore.getState();
console.log('Updated camera pose:', updatedPose);

// Test manifest store
console.log('3. Testing Manifest Store');
const initialManifest = manifestStore.getState();
console.log('Initial manifest:', initialManifest);

manifestStore.getState().set({
  sceneId: 'test-scene',
  manifest: { items: [], categories: {} }
});

const updatedManifest = manifestStore.getState();
console.log('Updated manifest:', updatedManifest);

console.log('=== Store Architecture Test Complete ===');