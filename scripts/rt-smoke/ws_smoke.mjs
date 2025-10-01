#!/usr/bin/env node

/**
 * WebSocket Smoke Test for Realtime System
 * 
 * Tests basic WebSocket functionality including:
 * - Connection establishment
 * - Authentication via JWT
 * - HELLO message receipt
 * - Camera message broadcasting
 * - Chat message broadcasting
 * - Presence updates
 */

import { io } from 'socket.io-client';
import { setTimeout } from 'timers/promises';

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const JWT_TOKEN = process.env.JWT_TOKEN || 'your-test-jwt-token';
const SCENE_ID = process.env.SCENE_ID || 'test-scene-id';

// Test state
let testsPassed = 0;
let testsTotal = 0;
let client1, client2;

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = level === 'error' ? '[ERROR]' : level === 'success' ? '[SUCCESS]' : '[INFO]';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function expectMessage(client, eventName, predicate, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for ${eventName}`));
    }, timeout);

    client.once(eventName, (data) => {
      clearTimeout(timer);
      try {
        if (predicate(data)) {
          resolve(data);
        } else {
          reject(new Error(`${eventName} predicate failed`));
        }
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function test(name, testFn) {
  testsTotal++;
  try {
    log(`Running test: ${name}`);
    await testFn();
    testsPassed++;
    log(`✓ ${name}`, 'success');
  } catch (error) {
    log(`✗ ${name}: ${error.message}`, 'error');
  }
}

async function setupClients() {
  log('Setting up WebSocket clients...');
  
  // Client 1
  client1 = io(`${SERVER_URL}/rt`, {
    query: {
      token: JWT_TOKEN,
      sceneId: SCENE_ID,
    },
    transports: ['websocket'],
    forceNew: true,
  });

  // Client 2  
  client2 = io(`${SERVER_URL}/rt`, {
    query: {
      token: JWT_TOKEN,
      sceneId: SCENE_ID,
    },
    transports: ['websocket'],
    forceNew: true,
  });

  // Wait for connections
  await Promise.all([
    new Promise((resolve) => client1.once('connect', resolve)),
    new Promise((resolve) => client2.once('connect', resolve)),
  ]);

  log('Both clients connected');
}

async function runTests() {
  await test('Client 1 receives HELLO message', async () => {
    const hello = await expectMessage(client1, 'evt', (data) => {
      return data.t === 'HELLO' && 
             data.sceneId === SCENE_ID &&
             typeof data.version === 'number' &&
             typeof data.serverTime === 'number';
    });
    log(`Received HELLO: version=${hello.version}, serverTime=${hello.serverTime}`);
  });

  await test('Client 2 receives HELLO message', async () => {
    const hello = await expectMessage(client2, 'evt', (data) => {
      return data.t === 'HELLO' && data.sceneId === SCENE_ID;
    });
    log(`Client 2 HELLO: version=${hello.version}`);
  });

  await test('Clients receive PRESENCE updates', async () => {
    // Both clients should receive presence indicating 2 users
    const presence1 = await expectMessage(client1, 'evt', (data) => {
      return data.t === 'PRESENCE' && Array.isArray(data.users) && data.users.length >= 1;
    });
    log(`Client 1 presence: ${presence1.users.length} users`);

    const presence2 = await expectMessage(client2, 'evt', (data) => {
      return data.t === 'PRESENCE' && Array.isArray(data.users) && data.users.length >= 1;
    });
    log(`Client 2 presence: ${presence2.users.length} users`);
  });

  await test('Camera message broadcasting', async () => {
    // Client 2 should receive camera update from Client 1
    const cameraPromise = expectMessage(client2, 'evt', (data) => {
      return data.t === 'CAMERA' && 
             data.from && 
             data.pose &&
             Array.isArray(data.pose.p) && data.pose.p.length === 3 &&
             Array.isArray(data.pose.q) && data.pose.q.length === 4;
    });

    // Client 1 sends camera update
    client1.emit('evt', {
      t: 'CAMERA',
      pose: {
        p: [1.0, 2.0, 3.0],
        q: [0.0, 0.0, 0.0, 1.0],
      },
    });

    const camera = await cameraPromise;
    log(`Camera update received: from=${camera.from}, pos=[${camera.pose.p.join(', ')}]`);
  });

  await test('Chat message broadcasting', async () => {
    const testMessage = `Test message ${Date.now()}`;
    
    // Client 2 should receive chat from Client 1
    const chatPromise = expectMessage(client2, 'evt', (data) => {
      return data.t === 'CHAT' && 
             data.from && 
             data.msg === testMessage &&
             typeof data.ts === 'number';
    });

    // Client 1 sends chat message
    client1.emit('evt', {
      t: 'CHAT',
      msg: testMessage,
    });

    const chat = await chatPromise;
    log(`Chat received: from=${chat.from}, msg="${chat.msg}", ts=${chat.ts}`);
  });

  await test('Rate limiting works', async () => {
    // Send multiple rapid camera updates to test throttling
    const cameraMessages = [];
    for (let i = 0; i < 10; i++) {
      client1.emit('evt', {
        t: 'CAMERA',
        pose: {
          p: [i, i, i],
          q: [0, 0, 0, 1],
        },
      });
    }

    // Should receive some but not all (due to coalescing)
    let receivedCount = 0;
    const timeout = setTimeout(() => {}, 1000);
    
    const handler = (data) => {
      if (data.t === 'CAMERA') {
        receivedCount++;
      }
    };

    client2.on('evt', handler);
    await setTimeout(500); // Wait for messages
    client2.off('evt', handler);

    if (receivedCount < 10 && receivedCount > 0) {
      log(`Rate limiting working: sent 10, received ${receivedCount}`);
    } else {
      throw new Error(`Rate limiting not working: received ${receivedCount}/10`);
    }
  });

  await test('PING/PONG works', async () => {
    const pingTime = Date.now();
    
    const pongPromise = expectMessage(client1, 'evt', (data) => {
      return data.t === 'PONG' && 
             data.clientTs === pingTime &&
             typeof data.ts === 'number';
    });

    client1.emit('evt', {
      t: 'PING',
      ts: pingTime,
    });

    const pong = await pongPromise;
    const rtt = Date.now() - pingTime;
    log(`PONG received: RTT=${rtt}ms, server_ts=${pong.ts}`);
  });
}

async function cleanup() {
  log('Cleaning up...');
  if (client1) client1.disconnect();
  if (client2) client2.disconnect();
}

async function main() {
  log('Starting WebSocket smoke test...');
  log(`Server: ${SERVER_URL}`);
  log(`Scene ID: ${SCENE_ID}`);

  try {
    await setupClients();
    await runTests();
  } catch (error) {
    log(`Test setup failed: ${error.message}`, 'error');
  } finally {
    await cleanup();
  }

  // Summary
  log(`\nTest Results: ${testsPassed}/${testsTotal} passed`);
  
  if (testsPassed === testsTotal) {
    log('All WebSocket smoke tests passed!', 'success');
    process.exit(0);
  } else {
    log('💥 Some WebSocket smoke tests failed!', 'error');
    process.exit(1);
  }
}

// Handle cleanup on interrupt
process.on('SIGINT', async () => {
  log('Interrupted, cleaning up...');
  await cleanup();
  process.exit(1);
});

main().catch((error) => {
  log(`Fatal error: ${error.message}`, 'error');
  process.exit(1);
});