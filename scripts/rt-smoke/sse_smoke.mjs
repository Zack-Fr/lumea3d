#!/usr/bin/env node

/**
 * SSE (Server-Sent Events) Smoke Test for Realtime System
 * 
 * Tests SSE fallback functionality including:
 * - Connection establishment
 * - Authentication via cookies/headers
 * - HELLO message receipt
 * - PRESENCE message receipt
 * - Event stream continuity
 */

import fetch from 'node-fetch';
import { setTimeout } from 'timers/promises';

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const JWT_TOKEN = process.env.JWT_TOKEN || 'your-test-jwt-token';
const SCENE_ID = process.env.SCENE_ID || 'test-scene-id';

// Test state
let testsPassed = 0;
let testsTotal = 0;

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = level === 'error' ? '[ERROR]' : level === 'success' ? '[SUCCESS]' : '[INFO]';
  console.log(`[${timestamp}] ${prefix} ${message}`);
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

function parseSSEEvent(line) {
  if (line.startsWith('data: ')) {
    try {
      return JSON.parse(line.substring(6));
    } catch (error) {
      return null;
    }
  }
  return null;
}

async function createSSEConnection() {
  const url = `${SERVER_URL}/scenes/${SCENE_ID}/events`;
  
  log(`Connecting to SSE endpoint: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${JWT_TOKEN}`,
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error(`SSE connection failed: ${response.status} ${response.statusText}`);
  }

  if (response.headers.get('content-type') !== 'text/event-stream; charset=utf-8') {
    throw new Error(`Unexpected content type: ${response.headers.get('content-type')}`);
  }

  return response;
}

async function collectSSEEvents(response, maxEvents = 5, timeoutMs = 10000) {
  const events = [];
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  
  const timeout = setTimeout(() => {
    reader.cancel();
  }, timeoutMs);

  try {
    while (events.length < maxEvents) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.trim() === '') continue;
        
        const event = parseSSEEvent(line);
        if (event) {
          log(`SSE Event received: ${event.t || 'unknown'}`);
          events.push(event);
          
          if (events.length >= maxEvents) break;
        }
      }
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      log('SSE stream cancelled');
    } else {
      throw error;
    }
  } finally {
    clearTimeout(timeout);
    reader.cancel();
  }

  return events;
}

async function runTests() {
  await test('SSE connection establishment', async () => {
    const response = await createSSEConnection();
    
    if (!response.ok) {
      throw new Error(`Connection failed: ${response.status}`);
    }
    
    log('SSE connection established successfully');
    response.body.cancel(); // Clean up
  });

  await test('Receive HELLO and PRESENCE events', async () => {
    const response = await createSSEConnection();
    const events = await collectSSEEvents(response, 2, 5000);
    
    if (events.length < 2) {
      throw new Error(`Expected at least 2 events, got ${events.length}`);
    }
    
    // First event should be HELLO
    const hello = events.find(e => e.t === 'HELLO');
    if (!hello) {
      throw new Error('HELLO event not received');
    }
    
    if (hello.sceneId !== SCENE_ID) {
      throw new Error(`Wrong scene ID in HELLO: expected ${SCENE_ID}, got ${hello.sceneId}`);
    }
    
    if (typeof hello.version !== 'number') {
      throw new Error('HELLO missing version number');
    }
    
    if (typeof hello.serverTime !== 'number') {
      throw new Error('HELLO missing serverTime');
    }
    
    log(`HELLO event valid: version=${hello.version}, serverTime=${hello.serverTime}`);
    
    // Should also receive PRESENCE
    const presence = events.find(e => e.t === 'PRESENCE');
    if (!presence) {
      throw new Error('PRESENCE event not received');
    }
    
    if (!Array.isArray(presence.users)) {
      throw new Error('PRESENCE event missing users array');
    }
    
    log(`PRESENCE event valid: ${presence.users.length} users`);
  });

  await test('Authentication with invalid token fails', async () => {
    const url = `${SERVER_URL}/scenes/${SCENE_ID}/events`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': 'Bearer invalid-token',
          'Accept': 'text/event-stream',
        },
      });
      
      if (response.ok) {
        throw new Error('Expected authentication failure but connection succeeded');
      }
      
      if (response.status === 401 || response.status === 403) {
        log('Authentication properly rejected invalid token');
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      if (error.message.includes('authentication')) {
        throw error;
      }
      // Network errors are expected for auth failures
      log('Authentication failure resulted in network error (as expected)');
    }
  });

  await test('Stream continuity over time', async () => {
    const response = await createSSEConnection();
    
    // Collect events over a longer period to ensure stream stability
    const events = await collectSSEEvents(response, 2, 3000);
    
    if (events.length === 0) {
      throw new Error('No events received during continuity test');
    }
    
    log(`Stream continuity maintained: received ${events.length} events`);
  });

  await test('Proper SSE headers and format', async () => {
    const response = await createSSEConnection();
    
    // Check headers
    const contentType = response.headers.get('content-type');
    if (!contentType.includes('text/event-stream')) {
      throw new Error(`Wrong content type: ${contentType}`);
    }
    
    const cacheControl = response.headers.get('cache-control');
    if (!cacheControl || !cacheControl.includes('no-cache')) {
      log('Warning: Cache-Control header may not be optimal for SSE');
    }
    
    // Check that we can read at least one properly formatted event
    const events = await collectSSEEvents(response, 1, 5000);
    
    if (events.length === 0) {
      throw new Error('No properly formatted events received');
    }
    
    log('SSE headers and format are correct');
  });
}

async function main() {
  log('Starting SSE smoke test...');
  log(`Server: ${SERVER_URL}`);
  log(`Scene ID: ${SCENE_ID}`);

  try {
    await runTests();
  } catch (error) {
    log(`Test setup failed: ${error.message}`, 'error');
  }

  // Summary
  log(`\nTest Results: ${testsPassed}/${testsTotal} passed`);
  
  if (testsPassed === testsTotal) {
    log('All SSE smoke tests passed!', 'success');
    process.exit(0);
  } else {
    log('💥 Some SSE smoke tests failed!', 'error');
    process.exit(1);
  }
}

// Handle cleanup on interrupt
process.on('SIGINT', () => {
  log('Interrupted, exiting...');
  process.exit(1);
});

main().catch((error) => {
  log(`Fatal error: ${error.message}`, 'error');
  process.exit(1);
});