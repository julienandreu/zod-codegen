import {readdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {extname, join} from 'node:path';

/**
 * Recursively finds all .js files in a directory
 */
function findJsFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findJsFiles(fullPath));
    } else if (extname(entry) === '.js') {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Adds .js extensions to relative imports in a JavaScript file
 */
function addJsExtensions(content: string): string {
  // Match relative imports: './something' or '../something' but not './something.js' or node: imports
  // Handles both single and double quotes
  // Also handles type imports: import type { ... } from './something'
  const importRegex = /from\s+(['"])(\.\.?\/[^'"]+?)(['"])/g;

  return content.replace(importRegex, (match, quote: string, importPath: string, endQuote: string) => {
    // Skip if already has an extension
    if (importPath.endsWith('.js') || importPath.endsWith('.json')) {
      return match;
    }

    // Add .js extension
    return `from ${quote}${importPath}.js${endQuote}`;
  });
}

/**
 * Main function to process all JavaScript files in dist/src
 */
function main(): void {
  const distDir = join(process.cwd(), 'dist', 'src');

  try {
    const jsFiles = findJsFiles(distDir);

    if (jsFiles.length === 0) {
      console.warn('No .js files found in dist/src');
      process.exit(0);
    }

    let processedCount = 0;

    for (const filePath of jsFiles) {
      const content = readFileSync(filePath, 'utf-8');
      const updatedContent = addJsExtensions(content);

      if (content !== updatedContent) {
        writeFileSync(filePath, updatedContent, 'utf-8');
        processedCount++;
      }
    }

    console.log(`✅ Added .js extensions to ${String(processedCount)} file(s)`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error processing files:', error);
    process.exit(1);
  }
}

main();
