import { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { app } from './setup';
import { 
  createTestUser, 
  createTestProject, 
  createTestAsset, 
  createTestScene,
  createTestCategory,
  waitForAsync 
} from './test-helpers';
import { prisma } from './setup';

describe('WebSocket Realtime Collaboration E2E', () => {
  let testApp: INestApplication;
  let client1: Socket;
  let client2: Socket;
  let authToken1: string;
  let authToken2: string;
  let sceneId: string;
  let projectId: string;

  beforeEach(async () => {
    testApp = app;
    
    // Create two test users
    const { user: user1, token: token1 } = await createTestUser();
    const { user: user2, token: token2 } = await createTestUser();
    const { project } = await createTestProject(user1);
    const { scene } = await createTestScene(project, user1);
    const { asset } = await createTestAsset(user1);
    
    authToken1 = token1;
    authToken2 = token2;
    sceneId = scene.id;
    projectId = project.id;

    // Create test category
    await createTestCategory(project, asset, 'test_furniture');

    // Setup WebSocket clients
    const serverUrl = `http://localhost:${testApp.getHttpAdapter().getHttpServer().address()?.port}`;
    
    client1 = io(`${serverUrl}/scenes`, {
      auth: { token: authToken1 },
      transports: ['websocket'],
    });

    client2 = io(`${serverUrl}/scenes`, {
      auth: { token: authToken2 },
      transports: ['websocket'],
    });

    // Wait for connections
    await Promise.all([
      new Promise<void>(resolve => {
        client1.on('connect', () => resolve());
      }),
      new Promise<void>(resolve => {
        client2.on('connect', () => resolve());
      }),
    ]);

  afterEach(async () => {
    client1?.disconnect();
    client2?.disconnect();
    await waitForAsync(100);
  });

  describe('Scene Collaboration', () => {
    it('should handle scene joining and presence', async () => {
      const presenceUpdates: any[] = [];
      
      // Listen for presence updates on client2
      client2.on('presence_update', (data) => {
        presenceUpdates.push(data);
      });

      // Client1 joins scene
      client1.emit('join_scene', { sceneId });
      await waitForAsync(100);

      // Client2 joins scene
      client2.emit('join_scene', { sceneId });
      await waitForAsync(100);

      // Should receive presence updates
      expect(presenceUpdates.length).toBeGreaterThan(0);
      expect(presenceUpdates[0]).toMatchObject({
        type: 'user_joined',
        userId: expect.any(String),
        timestamp: expect.any(Number),
      });
    });

    it('should propagate scene item operations in realtime', async () => {
      const deltaUpdates: any[] = [];

      // Both clients join scene
      client1.emit('join_scene', { sceneId });
      client2.emit('join_scene', { sceneId });
      await waitForAsync(100);

      // Client2 listens for scene deltas
      client2.on('scene_delta', (data) => {
        deltaUpdates.push(data);
      });

      // Client1 adds an item
      const addItemOp = {
        op: 'upsert_item',
        item: {
          id: 'test-item-1',
          category: 'test_furniture',
          model: 'chair_01',
          transform: {
            position: [1.0, 0.0, -1.0],
            rotation_euler: [0, 0, 0],
            scale: [1.0, 1.0, 1.0],
          },
          material: {
            variant: 'wood_oak',
          },
          selectable: true,
          locked: false,
        },
      };

      client1.emit('scene_operation', {
        sceneId,
        operations: [addItemOp],
        reqId: 'test-req-1',
      });

      await waitForAsync(200);

      // Client2 should receive the delta
      expect(deltaUpdates).toHaveLength(1);
      expect(deltaUpdates[0]).toMatchObject({
        sceneId,
        ops: [addItemOp],
        actor: {
          id: expect.any(String),
          role: expect.any(String),
        },
        v: expect.any(Number),
        ts: expect.any(Number),
        reqId: 'test-req-1',
      });

      // Verify database was updated
      const sceneItems = await prisma.sceneItem3D.findMany({
        where: { sceneId: sceneId },
      });

      expect(sceneItems).toHaveLength(1);
      expect(sceneItems[0]).toMatchObject({
        sceneId: sceneId,
        categoryKey: 'test_furniture',
        model: 'chair_01',
        positionX: 1.0,
        positionY: 0.0,
        positionZ: -1.0,
      });
    });

    it('should handle item updates and removals', async () => {
      const deltaUpdates: any[] = [];

      // Setup scene with initial item
      await prisma.sceneItem3D.create({
        data: {
          id: 'existing-item',
          sceneId: sceneId,
          categoryKey: 'test_furniture',
          model: 'chair_01',
          positionX: 0,
          positionY: 0,
          positionZ: 0,
          rotationX: 0,
          rotationY: 0,
          rotationZ: 0,
          scaleX: 1,
          scaleY: 1,
          scaleZ: 1,
          selectable: true,
          locked: false,
        },
      });

      // Both clients join scene
      client1.emit('join_scene', { sceneId });
      client2.emit('join_scene', { sceneId });
      await waitForAsync(100);

      // Client2 listens for deltas
      client2.on('scene_delta', (data) => {
        deltaUpdates.push(data);
      });

      // Client1 updates the item position
      const updateOp = {
        op: 'update_item',
        id: 'existing-item',
        transform: {
          position: [2.0, 0.0, -2.0],
          rotation_euler: [0, 90, 0],
        },
      };

      client1.emit('scene_operation', {
        sceneId,
        operations: [updateOp],
        reqId: 'test-update-1',
      });

      await waitForAsync(200);

      // Verify update was propagated
      expect(deltaUpdates).toHaveLength(1);
      expect(deltaUpdates[0].ops[0]).toMatchObject(updateOp);

      // Client1 removes the item
      deltaUpdates.length = 0; // Clear previous updates

      const removeOp = {
        op: 'remove_item',
        id: 'existing-item',
      };

      client1.emit('scene_operation', {
        sceneId,
        operations: [removeOp],
        reqId: 'test-remove-1',
      });

      await waitForAsync(200);

      // Verify removal was propagated
      expect(deltaUpdates).toHaveLength(1);
      expect(deltaUpdates[0].ops[0]).toMatchObject(removeOp);

      // Verify database reflects removal
      const remainingItems = await prisma.sceneItem3D.findMany({
        where: { sceneId: sceneId },
      });

      expect(remainingItems).toHaveLength(0);
    });

    it('should handle scene property updates', async () => {
      const deltaUpdates: any[] = [];

      // Both clients join scene
      client1.emit('join_scene', { sceneId });
      client2.emit('join_scene', { sceneId });
      await waitForAsync(100);

      // Client2 listens for deltas
      client2.on('scene_delta', (data) => {
        deltaUpdates.push(data);
      });

      // Client1 updates scene properties
      const scenePropsOp = {
        op: 'scene_props',
        exposure: 1.5,
        env: {
          hdriUrl: 'https://example.com/new-env.hdr',
          intensity: 2.0,
        },
        spawn: {
          position: [0, 2.0, 10],
          yawDeg: 45,
        },
      };

      client1.emit('scene_operation', {
        sceneId,
        operations: [scenePropsOp],
        reqId: 'test-props-1',
      });

      await waitForAsync(200);

      // Verify scene props update was propagated
      expect(deltaUpdates).toHaveLength(1);
      expect(deltaUpdates[0].ops[0]).toMatchObject(scenePropsOp);

      // Verify database was updated
      const updatedScene = await prisma.scene3D.findUnique({
        where: { id: sceneId },
      });

      expect(updatedScene).toMatchObject({
        exposure: 1.5,
        envHdriUrl: 'https://example.com/new-env.hdr',
        envIntensity: 2.0,
        spawnPositionX: 0,
        spawnPositionY: 2.0,
        spawnPositionZ: 10,
        spawnYawDeg: 45,
      });
    });

    it('should handle optimistic locking and version conflicts', async () => {
      const errorEvents: any[] = [];

      // Both clients join scene
      client1.emit('join_scene', { sceneId });
      client2.emit('join_scene', { sceneId });
      await waitForAsync(100);

      // Listen for errors
      client1.on('scene_error', (error) => {
        errorEvents.push(error);
      });

      // Get current scene version
      const currentScene = await prisma.scene3D.findUnique({
        where: { id: sceneId },
      });
      const currentVersion = currentScene?.version || 1;

      // Client1 sends operation with outdated version
      client1.emit('scene_operation', {
        sceneId,
        operations: [{
          op: 'upsert_item',
          item: {
            id: 'conflict-item',
            category: 'test_furniture',
            transform: {
              position: [0, 0, 0],
              rotationEuler: [0, 0, 0],
              scale: [1, 1, 1],
            },
          },
        }],
        version: currentVersion - 1, // Outdated version
        reqId: 'test-conflict-1',
      });

      await waitForAsync(200);

      // Should receive error about version conflict
      expect(errorEvents).toHaveLength(1);
      expect(errorEvents[0]).toMatchObject({
        code: 'VERSION_CONFLICT',
        message: expect.stringContaining('version'),
        details: {
          expectedVersion: currentVersion,
          receivedVersion: currentVersion - 1,
        },
      });
    });

    it('should handle connection cleanup on disconnect', async () => {
      const presenceUpdates: any[] = [];

      // Both clients join scene
      client1.emit('join_scene', { sceneId });
      client2.emit('join_scene', { sceneId });
      await waitForAsync(100);

      // Client2 listens for presence updates
      client2.on('presence_update', (data) => {
        presenceUpdates.push(data);
      });

      // Client1 disconnects
      client1.disconnect();
      await waitForAsync(200);

      // Client2 should receive user_left event
      const leftEvents = presenceUpdates.filter(update => update.type === 'user_left');
      expect(leftEvents).toHaveLength(1);
      expect(leftEvents[0]).toMatchObject({
        type: 'user_left',
        userId: expect.any(String),
        timestamp: expect.any(Number),
      });
    });
  });

  describe('Delta Coalescing and Performance', () => {
    it('should coalesce rapid updates within 16ms window', async () => {
      const deltaUpdates: any[] = [];

      // Both clients join scene
      client1.emit('join_scene', { sceneId });
      client2.emit('join_scene', { sceneId });
      await waitForAsync(100);

      // Client2 listens for deltas
      client2.on('scene_delta', (data) => {
        deltaUpdates.push(data);
      });

      // Send multiple rapid updates
      const rapidOps = [
        { op: 'upsert_item', item: { id: 'item-1', category: 'test_furniture', transform: { position: [1, 0, 0], rotation_euler: [0, 0, 0], scale: [1, 1, 1] } } },
        { op: 'upsert_item', item: { id: 'item-2', category: 'test_furniture', transform: { position: [2, 0, 0], rotation_euler: [0, 0, 0], scale: [1, 1, 1] } } },
        { op: 'upsert_item', item: { id: 'item-3', category: 'test_furniture', transform: { position: [3, 0, 0], rotation_euler: [0, 0, 0], scale: [1, 1, 1] } } },
      ];

      // Send operations rapidly (within 16ms)
      rapidOps.forEach((op, index) => {
        setTimeout(() => {
          client1.emit('scene_operation', {
            sceneId,
            operations: [op],
            reqId: `rapid-${index}`,
          });
        }, index * 5); // 5ms intervals
      });

      await waitForAsync(300); // Wait for coalescing window

      // Should receive coalesced updates (fewer than individual operations)
      expect(deltaUpdates.length).toBeLessThan(rapidOps.length);
      
      // But all operations should be present
      const allOps = deltaUpdates.flatMap(delta => delta.ops);
      expect(allOps).toHaveLength(rapidOps.length);
    });
  });
})});