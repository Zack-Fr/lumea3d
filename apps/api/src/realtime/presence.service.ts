import { Injectable, Logger } from '@nestjs/common';
import { PresenceUser, ThrottleConfig } from './dto/rt-events';

interface ThrottleState {
  count: number;
  resetTime: number;
  lastActivity: number;
}

interface FloodProtectionState {
  count: number;
  resetTime: number;
  warned: boolean;
}

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);
  
  // Map of sceneId -> userId -> PresenceUser
  private presenceMap = new Map<string, Map<string, PresenceUser>>();
  
  // Throttle state: userId -> messageType -> ThrottleState
  private throttleMap = new Map<string, Map<string, ThrottleState>>();
  
  // Flood protection: userId -> messageType -> FloodProtectionState
  private floodProtectionMap = new Map<string, Map<string, FloodProtectionState>>();
  
  // Scene version tracking (in-memory for now)
  private sceneVersions = new Map<string, number>();

  // Throttle configurations
  private readonly throttleConfigs: Record<string, ThrottleConfig> = {
    camera: {
      maxMessages: 1,
      windowMs: 60, // 60ms coalescing
      coalesceMs: 60,
    },
    chat: {
      maxMessages: 3,
      windowMs: 1000, // 3 per second
    },
    viewport: {
      maxMessages: 1,
      windowMs: 100, // 100ms coalescing (10fps max)
      coalesceMs: 100,
    },
  };

  // Flood protection configuration
  private readonly floodProtectionConfig = {
    camera: {
      maxMessages: 20,
      windowMs: 2000, // 20 messages in 2 seconds
    },
  };

  /**
   * Add a user to a scene's presence
   */
  add(sceneId: string, userId: string, socketId: string, userName?: string): void {
    if (!this.presenceMap.has(sceneId)) {
      this.presenceMap.set(sceneId, new Map());
    }

    const scenePresence = this.presenceMap.get(sceneId)!;
    
    if (scenePresence.has(userId)) {
      // User already present, add socket to existing presence
      const user = scenePresence.get(userId)!;
      user.socketIds.add(socketId);
      user.lastActivity = Date.now();
    } else {
      // New user joining scene
      scenePresence.set(userId, {
        id: userId,
        name: userName || 'Unknown User',
        socketIds: new Set([socketId]),
        lastActivity: Date.now(),
      });
    }

    this.logger.log(`User ${userId} added to scene ${sceneId} with socket ${socketId}`);
  }

  /**
   * Remove a user's socket from scene presence
   */
  remove(sceneId: string, socketId: string): string | null {
    const scenePresence = this.presenceMap.get(sceneId);
    if (!scenePresence) return null;

    let removedUserId: string | null = null;

    // Find and remove socket from user presence
    for (const [userId, user] of scenePresence.entries()) {
      if (user.socketIds.has(socketId)) {
        user.socketIds.delete(socketId);
        removedUserId = userId;

        // If no more sockets for this user, remove them entirely
        if (user.socketIds.size === 0) {
          scenePresence.delete(userId);
          this.logger.log(`User ${userId} removed from scene ${sceneId}`);
        } else {
          this.logger.log(`Socket ${socketId} removed for user ${userId} in scene ${sceneId}`);
        }
        break;
      }
    }

    // Clean up empty scene presence maps
    if (scenePresence.size === 0) {
      this.presenceMap.delete(sceneId);
    }

    return removedUserId;
  }

  /**
   * Get list of users present in a scene
   */
  list(sceneId: string): Array<{ id: string; userId: string; name: string; status: string; lastSeen: number }> {
    const scenePresence = this.presenceMap.get(sceneId);
    if (!scenePresence) return [];

    return Array.from(scenePresence.values()).map(user => ({
      id: user.id,
      userId: user.id, // Map id to userId for frontend compatibility
      name: user.name,
      status: 'online', // All present users are online
      lastSeen: user.lastActivity,
    }));
  }

  /**
   * Check if user can send a specific message type (throttling)
   */
  maySend(userId: string, messageType: string): boolean {
    const config = this.throttleConfigs[messageType];
    if (!config) return true; // No throttling configured

    const now = Date.now();
    
    // Initialize throttle state if needed
    if (!this.throttleMap.has(userId)) {
      this.throttleMap.set(userId, new Map());
    }
    
    const userThrottles = this.throttleMap.get(userId)!;
    
    if (!userThrottles.has(messageType)) {
      userThrottles.set(messageType, {
        count: 0,
        resetTime: now + config.windowMs,
        lastActivity: now,
      });
    }

    const throttleState = userThrottles.get(messageType)!;

    // Reset if window expired
    if (now >= throttleState.resetTime) {
      throttleState.count = 0;
      throttleState.resetTime = now + config.windowMs;
    }

    // For coalesced messages (like camera), check minimum interval
    if (config.coalesceMs && now - throttleState.lastActivity < config.coalesceMs) {
      return false;
    }

    // Check rate limit
    if (throttleState.count >= config.maxMessages) {
      return false;
    }

    // Update state
    throttleState.count++;
    throttleState.lastActivity = now;

    // Check flood protection
    this.checkFloodProtection(userId, messageType);

    return true;
  }

  /**
   * Check for flood protection and log warnings
   */
  private checkFloodProtection(userId: string, messageType: string): void {
    const config = this.floodProtectionConfig[messageType];
    if (!config) return;

    const now = Date.now();

    // Initialize flood protection state if needed
    if (!this.floodProtectionMap.has(userId)) {
      this.floodProtectionMap.set(userId, new Map());
    }

    const userFloodStates = this.floodProtectionMap.get(userId)!;

    if (!userFloodStates.has(messageType)) {
      userFloodStates.set(messageType, {
        count: 0,
        resetTime: now + config.windowMs,
        warned: false,
      });
    }

    const floodState = userFloodStates.get(messageType)!;

    // Reset if window expired
    if (now >= floodState.resetTime) {
      floodState.count = 0;
      floodState.resetTime = now + config.windowMs;
      floodState.warned = false;
    }

    floodState.count++;

    // Warn if threshold exceeded and not already warned
    if (floodState.count > config.maxMessages && !floodState.warned) {
      this.logger.warn(`Flood protection triggered for user ${userId}, messageType ${messageType}: ${floodState.count} messages in ${config.windowMs}ms`);
      floodState.warned = true;
    }
  }

  /**
   * Get current version for a scene
   */
  version(sceneId: string): number {
    return this.sceneVersions.get(sceneId) || 0;
  }

  /**
   * Update scene version
   */
  updateVersion(sceneId: string, version: number): void {
    this.sceneVersions.set(sceneId, version);
  }

  /**
   * Get presence statistics
   */
  getStats(): {
    totalScenes: number;
    totalUsers: number;
    sceneStats: Array<{ sceneId: string; userCount: number; socketCount: number }>;
  } {
    const sceneStats: Array<{ sceneId: string; userCount: number; socketCount: number }> = [];
    let totalUsers = 0;
    let totalSockets = 0;

    for (const [sceneId, scenePresence] of this.presenceMap.entries()) {
      const userCount = scenePresence.size;
      const socketCount = Array.from(scenePresence.values())
        .reduce((sum, user) => sum + user.socketIds.size, 0);

      sceneStats.push({ sceneId, userCount, socketCount });
      totalUsers += userCount;
      totalSockets += socketCount;
    }

    return {
      totalScenes: this.presenceMap.size,
      totalUsers,
      sceneStats,
    };
  }

  /**
   * Clean up inactive connections (can be called periodically)
   */
  cleanup(maxInactiveMs: number = 300000): void { // 5 minutes default
    const now = Date.now();
    let cleanedUsers = 0;

    for (const [sceneId, scenePresence] of this.presenceMap.entries()) {
      const usersToRemove: string[] = [];

      for (const [userId, user] of scenePresence.entries()) {
        if (now - user.lastActivity > maxInactiveMs) {
          usersToRemove.push(userId);
        }
      }

      for (const userId of usersToRemove) {
        scenePresence.delete(userId);
        cleanedUsers++;
        this.logger.log(`Cleaned up inactive user ${userId} from scene ${sceneId}`);
      }

      // Remove empty scenes
      if (scenePresence.size === 0) {
        this.presenceMap.delete(sceneId);
      }
    }

    if (cleanedUsers > 0) {
      this.logger.log(`Cleaned up ${cleanedUsers} inactive users`);
    }

    // Also cleanup throttle states for users no longer present
    this.cleanupThrottleStates();
  }

  /**
   * Clean up throttle states for users no longer present
   */
  private cleanupThrottleStates(): void {
    const activeUsers = new Set<string>();
    
    // Collect all active user IDs
    for (const scenePresence of this.presenceMap.values()) {
      for (const userId of scenePresence.keys()) {
        activeUsers.add(userId);
      }
    }

    // Remove throttle states for inactive users
    for (const userId of this.throttleMap.keys()) {
      if (!activeUsers.has(userId)) {
        this.throttleMap.delete(userId);
      }
    }

    // Remove flood protection states for inactive users
    for (const userId of this.floodProtectionMap.keys()) {
      if (!activeUsers.has(userId)) {
        this.floodProtectionMap.delete(userId);
      }
    }
  }
}