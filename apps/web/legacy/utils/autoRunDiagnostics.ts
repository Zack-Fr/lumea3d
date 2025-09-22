/**
 * Auto-run diagnostics when page loads
 * This helps debug auth issues immediately
 */

import { diagnoseAuth } from './authDiagnostics';

// Auto-run diagnostics after a short delay to let the app initialize
setTimeout(() => {
  console.log('\n🔍 AUTO-RUNNING AUTHENTICATION DIAGNOSTICS...');
  console.log('If you have a specific project ID, run: diagnoseAuth("your-project-id")');
  console.log('Otherwise, this will test with a sample project ID...\n');
  
  // Use the project ID from the error message you provided
  const sampleProjectId = 'cmfe1nsbp001d7duwy9r05ubu';
  diagnoseAuth(sampleProjectId);
}, 2000); // Wait 2 seconds for app to initialize

console.log('🔍 Auto-diagnostics script loaded. Will run in 2 seconds...');
