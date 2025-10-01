#!/usr/bin/env node

import { spawn } from 'child_process';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('Starting Lumea API server to generate OpenAPI specification...');

// Start the API server
const apiProcess = spawn('pnpm', ['--filter', '@lumea/api', 'start:dev'], {
  cwd: rootDir,
  stdio: 'pipe',
  shell: true,
});

let serverReady = false;

// Wait for server to be ready
apiProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('API:', output.trim());
  
  if (output.includes('Lumea API running on port') || output.includes('Nest application successfully started')) {
    serverReady = true;
  }
});

apiProcess.stderr.on('data', (data) => {
  const output = data.toString();
  if (!output.includes('Warning') && !output.includes('[DEP')) {
    console.error('API Error:', output.trim());
  }
});

// Function to fetch OpenAPI spec
async function fetchOpenAPISpec() {
  const maxRetries = 30; // 30 seconds with 1-second intervals
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      console.log(`📡 Attempting to fetch OpenAPI spec (attempt ${retries + 1}/${maxRetries})...`);
      
      const response = await fetch('http://localhost:3000/docs-json', {
        timeout: 5000,
      });
      
      if (response.ok) {
        const openApiSpec = await response.json();
        
        // Enhance the spec with additional metadata
        openApiSpec.info.title = 'Lumea API';
        openApiSpec.info.version = '1.0.0';
        openApiSpec.info.description = `
# Lumea Interior Layout Generator API

Advanced AI-powered interior layout generator with explainable spatial reasoning.

## Features
- **3D Scene Management**: Create and manage complex 3D interior layouts
- **Asset Processing Pipeline**: Automatic optimization with KTX2, Draco, and Meshopt variants
- **Real-time Collaboration**: Server-Sent Events for live scene updates
- **Optimistic Locking**: If-Match headers for safe concurrent editing
- **Category-based Organization**: Enhanced scene manifests with filtering capabilities
- **Processing Queue**: Background asset processing with status tracking

## Authentication
All endpoints require Bearer token authentication unless explicitly marked as public.

## Rate Limiting
- General API: 100 requests per 15 minutes per IP
- Authentication: 5 attempts per 15 minutes per IP

## Versioning
Scene operations support optimistic locking via If-Match headers for safe concurrent editing.
        `.trim();
        
        // Add server information
        openApiSpec.servers = [
          {
            url: 'http://localhost:3000',
            description: 'Development Server'
          },
          {
            url: 'https://api.lumea.dev',
            description: 'Production Server'
          }
        ];
        
        // Write the OpenAPI spec to file
        const specPath = join(rootDir, 'openapi.json');
        writeFileSync(specPath, JSON.stringify(openApiSpec, null, 2));
        
        console.log('[SUCCESS] OpenAPI specification generated successfully!');
        console.log(`📄 Saved to: ${specPath}`);
        console.log(`Generated ${Object.keys(openApiSpec.paths || {}).length} endpoints`);
        console.log(`🏷️  Generated ${Object.keys(openApiSpec.components?.schemas || {}).length} schemas`);
        
        // Kill the API server
        apiProcess.kill('SIGTERM');
        process.exit(0);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      retries++;
      if (retries >= maxRetries) {
        console.error('[ERROR] Failed to fetch OpenAPI specification after maximum retries');
        console.error('Error:', error.message);
        apiProcess.kill('SIGTERM');
        process.exit(1);
      }
      
      // Wait 1 second before next retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Wait a bit for server to start, then fetch spec
setTimeout(() => {
  fetchOpenAPISpec();
}, 3000);

// Handle process termination
process.on('SIGINT', () => {
  console.log('🛑 Terminating API server...');
  apiProcess.kill('SIGTERM');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Terminating API server...');
  apiProcess.kill('SIGTERM');
  process.exit(0);
});