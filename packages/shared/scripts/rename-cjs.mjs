import { readdir, rename, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

// Rename .js files to .cjs in CJS output and fix import paths in both ESM and CJS
async function fixBuildOutputs() {
  const distDir = join(process.cwd(), 'dist');
  const cjsDir = join(distDir, 'cjs');
  const esmDir = join(distDir, 'esm');
  const processedFiles = [];
  
  async function renameInDirectory(dir) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively process subdirectories
          await renameInDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
          const newPath = fullPath.replace('.js', '.cjs');
          await rename(fullPath, newPath);
          console.log(`Renamed ${fullPath} → ${newPath}`);
          processedFiles.push(newPath);
        }
      }
    } catch (error) {
      console.error(`Error processing directory ${dir}:`, error);
    }
  }
  
  async function fixImportsInDir(dir, extension) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await fixImportsInDir(fullPath, extension);
        } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.cjs'))) {
          const content = await readFile(fullPath, 'utf8');
          let updatedContent = content;
          
          if (extension === '.cjs') {
            // Fix CommonJS require statements
            updatedContent = content.replace(
              /require\("(\.\/.+?)"\)/g,
              (match, importPath) => {
                if (!importPath.endsWith('.cjs') && !importPath.includes('/')) {
                  return `require("${importPath}.cjs")`;
                }
                return match;
              }
            );
          } else if (extension === '.js') {
            // Fix ESM import/export statements
            updatedContent = content.replace(
              /(import|export)\s+.*?\s+from\s+['"](\.\/.+?)['"];?/g,
              (match, keyword, importPath) => {
                if (!importPath.endsWith('.js') && !importPath.includes('/')) {
                  return match.replace(importPath, `${importPath}.js`);
                }
                return match;
              }
            );
          }
          
          if (content !== updatedContent) {
            await writeFile(fullPath, updatedContent);
            console.log(`Fixed imports in ${fullPath}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error fixing imports in ${dir}:`, error);
    }
  }
  
  try {
    // Step 1: Rename .js to .cjs in CJS directory
    await renameInDirectory(cjsDir);
    
    // Step 2: Fix CJS require statements
    await fixImportsInDir(cjsDir, '.cjs');
    
    // Step 3: Fix ESM import/export statements
    await fixImportsInDir(esmDir, '.js');
    
    console.log('✅ Successfully processed all build outputs');
  } catch (error) {
    console.error('❌ Error during build output processing:', error);
    process.exit(1);
  }
}

fixBuildOutputs();