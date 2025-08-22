#!/usr/bin/env node

/**
 * Lumea Development Health Check
 * Verifies monorepo structure and basic configuration
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const projectRoot = process.cwd();

console.log('🏥 Lumea Health Check');
console.log('====================');

// Check workspace files
const checks = [
  // Root files
  { file: 'package.json', required: true },
  { file: 'pnpm-workspace.yaml', required: true },
  { file: 'Makefile', required: true },
  { file: '.gitignore', required: true },
  
  // Apps
  { file: 'apps/web/package.json', required: true },
  { file: 'apps/api/package.json', required: true },
  { file: 'apps/solver/main.py', required: true },
  { file: 'packages/shared/package.json', required: true },
  
  // Infrastructure
  { file: 'infra/docker-compose.yml', required: true },
  { file: 'infra/.env.example', required: true },
  
  // Dockerfiles
  { file: 'apps/web/Dockerfile', required: true },
  { file: 'apps/api/Dockerfile', required: true },
  { file: 'apps/solver/Dockerfile', required: true },
];

let allChecks = true;

checks.forEach(({ file, required }) => {
  const filePath = join(projectRoot, file);
  const exists = existsSync(filePath);
  
  const status = exists ? '✅' : (required ? '❌' : '⚠️');
  console.log(`${status} ${file}`);
  
  if (required && !exists) {
    allChecks = false;
  }
});

// Check package.json workspace configuration
console.log('\n📦 Workspace Configuration:');
try {
  const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
  
  if (pkg.workspaces && pkg.workspaces.includes('apps/*') && pkg.workspaces.includes('packages/*')) {
    console.log('✅ pnpm workspaces configured correctly');
  } else {
    console.log('❌ pnpm workspaces misconfigured');
    allChecks = false;
  }
  
  if (pkg.private === true) {
    console.log('✅ Root package marked as private');
  } else {
    console.log('❌ Root package should be private');
    allChecks = false;
  }
} catch (e) {
  console.log('❌ Error reading package.json:', e.message);
  allChecks = false;
}

// Summary
console.log('\n🎯 Summary:');
if (allChecks) {
  console.log('✅ All required files present - monorepo structure is valid');
  console.log('🚀 Ready for: make up wait migrate seed');
  process.exit(0);
} else {
  console.log('❌ Some required files are missing');
  console.log('🔧 Please review the structure and ensure all files are created');
  process.exit(1);
}