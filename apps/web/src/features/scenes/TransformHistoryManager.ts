import { Object3D, Vector3, Euler } from 'three';
import { log } from '../../utils/logger';

export interface TransformState {
  position: Vector3;
  rotation: Euler;
  scale: Vector3;
}

export interface TransformHistoryEntry {
  id: string;
  objectId: string;
  itemId: string;
  objectName: string;
  timestamp: number;
  beforeState: TransformState;
  afterState: TransformState;
  description: string;
}

export class TransformHistoryManager {
  private history: TransformHistoryEntry[] = [];
  private currentIndex: number = -1;
  private maxHistorySize: number = 50;
  private isUndoing: boolean = false;
  private isRedoing: boolean = false;

  constructor(maxHistorySize: number = 50) {
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Records a transform operation in the history
   */
  recordTransform(
    object: Object3D,
    itemId: string,
    beforeState: TransformState,
    afterState: TransformState,
    description: string = 'Transform object'
  ): void {
    // Don't record during undo/redo operations
    if (this.isUndoing || this.isRedoing) {
      return;
    }

    const entry: TransformHistoryEntry = {
      id: `transform-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      objectId: object.uuid,
      itemId,
      objectName: object.name || 'Unnamed Object',
      timestamp: Date.now(),
      beforeState: {
        position: beforeState.position.clone(),
        rotation: beforeState.rotation.clone(),
        scale: beforeState.scale.clone()
      },
      afterState: {
        position: afterState.position.clone(),
        rotation: afterState.rotation.clone(),
        scale: afterState.scale.clone()
      },
      description
    };

    // Remove any history after current index (when adding new entry after undo)
    this.history = this.history.slice(0, this.currentIndex + 1);
    
    // Add new entry
    this.history.push(entry);
    
    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }

    this.currentIndex = this.history.length - 1;

    log('debug', '📚 TransformHistory: Recorded transform:', {
      objectName: entry.objectName,
      itemId: entry.itemId,
      description: entry.description,
      historySize: this.history.length
    });
  }

  /**
   * Starts a transform operation by capturing the initial state
   */
  startTransform(object: Object3D): TransformState {
    return {
      position: object.position.clone(),
      rotation: object.rotation.clone(),
      scale: object.scale.clone()
    };
  }

  /**
   * Finishes a transform operation by recording the change
   */
  finishTransform(
    object: Object3D,
    itemId: string,
    beforeState: TransformState,
    description: string = 'Transform object'
  ): void {
    const afterState: TransformState = {
      position: object.position.clone(),
      rotation: object.rotation.clone(),
      scale: object.scale.clone()
    };

    // Only record if there was actually a change
    if (this.hasTransformChanged(beforeState, afterState)) {
      this.recordTransform(object, itemId, beforeState, afterState, description);
    }
  }

  /**
   * Checks if transform states are different
   */
  private hasTransformChanged(before: TransformState, after: TransformState): boolean {
    const epsilon = 0.001; // Small threshold to avoid recording tiny floating-point differences
    
    return (
      before.position.distanceTo(after.position) > epsilon ||
      Math.abs(before.rotation.x - after.rotation.x) > epsilon ||
      Math.abs(before.rotation.y - after.rotation.y) > epsilon ||
      Math.abs(before.rotation.z - after.rotation.z) > epsilon ||
      before.scale.distanceTo(after.scale) > epsilon
    );
  }

  /**
   * Undoes the last transform operation
   */
  undo(): TransformHistoryEntry | null {
    if (!this.canUndo()) {
      return null;
    }

    this.isUndoing = true;
    const entry = this.history[this.currentIndex];
    this.currentIndex--;

    log('debug', '↶ TransformHistory: Undo transform:', {
      objectName: entry.objectName,
      itemId: entry.itemId,
      description: entry.description
    });

    // Reset flag after processing
    setTimeout(() => {
      this.isUndoing = false;
    }, 0);

    return entry;
  }

  /**
   * Redoes the next transform operation
   */
  redo(): TransformHistoryEntry | null {
    if (!this.canRedo()) {
      return null;
    }

    this.isRedoing = true;
    this.currentIndex++;
    const entry = this.history[this.currentIndex];

    log('debug', '↷ TransformHistory: Redo transform:', {
      objectName: entry.objectName,
      itemId: entry.itemId,
      description: entry.description
    });

    // Reset flag after processing
    setTimeout(() => {
      this.isRedoing = false;
    }, 0);

    return entry;
  }

  /**
   * Applies a transform state to an object
   */
  applyTransformState(object: Object3D, state: TransformState): void {
    object.position.copy(state.position);
    object.rotation.copy(state.rotation);
    object.scale.copy(state.scale);
    object.updateMatrixWorld(true);
  }

  /**
   * Checks if undo is possible
   */
  canUndo(): boolean {
    return this.currentIndex >= 0 && !this.isUndoing && !this.isRedoing;
  }

  /**
   * Checks if redo is possible
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1 && !this.isUndoing && !this.isRedoing;
  }

  /**
   * Clears all history
   */
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
    log('info', '🗑️ TransformHistory: Cleared all history');
  }

  /**
   * Gets current history statistics
   */
  getStats() {
    return {
      totalEntries: this.history.length,
      currentIndex: this.currentIndex,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      isUndoing: this.isUndoing,
      isRedoing: this.isRedoing
    };
  }

  /**
   * Gets a preview of recent history entries
   */
  getHistoryPreview(count: number = 5): Array<TransformHistoryEntry & { isCurrent: boolean }> {
    const start = Math.max(0, this.currentIndex - count);
    const end = Math.min(this.history.length, this.currentIndex + count + 1);
    
    return this.history.slice(start, end).map((entry, index) => ({
      ...entry,
      isCurrent: start + index === this.currentIndex
    }));
  }
}

// Global instance
export const transformHistoryManager = new TransformHistoryManager();