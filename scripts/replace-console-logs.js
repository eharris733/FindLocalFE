#!/usr/bin/env node

/**
 * Script to find and suggest replacements for console.log/error/warn calls
 * Run: node scripts/replace-console-logs.js
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build'];

// Map console methods to logger methods
const REPLACEMENTS = {
  'console.log': 'logger.info',
  'console.info': 'logger.info',
  'console.debug': 'logger.debug',
  'console.warn': 'logger.warn',
  'console.error': 'logger.error',
};

function shouldIgnorePath(filePath) {
  return IGNORE_DIRS.some(dir => filePath.includes(dir));
}

function findConsoleCalls(dir, results = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (shouldIgnorePath(filePath)) {
      continue;
    }

    if (stat.isDirectory()) {
      findConsoleCalls(filePath, results);
    } else if (file.match(/\.(ts|tsx|js|jsx)$/)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        
        // Skip if it's a comment
        if (trimmedLine.startsWith('//') || trimmedLine.startsWith('*')) {
          return;
        }

        // Check for console calls
        for (const [consoleMethod, loggerMethod] of Object.entries(REPLACEMENTS)) {
          if (line.includes(consoleMethod)) {
            results.push({
              file: path.relative(process.cwd(), filePath),
              line: index + 1,
              content: line,
              consoleMethod,
              loggerMethod,
            });
          }
        }
      });
    }
  }

  return results;
}

console.log('🔍 Searching for console.log/error/warn calls in src/...\n');

const results = findConsoleCalls(SRC_DIR);

if (results.length === 0) {
  console.log('✅ No console calls found! All good.\n');
  process.exit(0);
}

console.log(`Found ${results.length} console calls:\n`);

// Group by file
const byFile = results.reduce((acc, item) => {
  if (!acc[item.file]) {
    acc[item.file] = [];
  }
  acc[item.file].push(item);
  return acc;
}, {});

// Print results
for (const [file, calls] of Object.entries(byFile)) {
  console.log(`\n📄 ${file} (${calls.length} calls)`);
  calls.forEach(call => {
    console.log(`   Line ${call.line}: ${call.content.trim()}`);
    console.log(`   Suggestion: Replace "${call.consoleMethod}" with "${call.loggerMethod}"`);
  });
}

console.log('\n\n📝 To replace these:');
console.log('1. Import logger: import { logger } from \'@/utils/logger\';');
console.log('2. Replace console.log() → logger.info()');
console.log('3. Replace console.error() → logger.error()');
console.log('4. Replace console.warn() → logger.warn()');
console.log('5. Replace console.debug() → logger.debug()');
console.log('\n💡 See LOGGER_USAGE.md for more details\n');

process.exit(0);
