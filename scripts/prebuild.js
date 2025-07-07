#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Running pre-build security checks...');

// Check for sensitive files
const sensitiveFiles = [
  '.env',
  '.env.local',
  '.env.production',
  'credentials.json',
  'private-key.pem'
];

let hasIssues = false;

sensitiveFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, '..', file))) {
    console.error(`❌ Found sensitive file: ${file}`);
    hasIssues = true;
  }
});

// Check for console.logs in production code
const srcDir = path.join(__dirname, '..', 'client', 'src');
const checkForConsoleLogs = (dir) => {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      checkForConsoleLogs(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('console.log')) {
        console.warn(`⚠️  Found console.log in: ${filePath}`);
      }
    }
  });
};

checkForConsoleLogs(srcDir);

if (hasIssues) {
  console.error('\n❌ Build failed due to security issues');
  process.exit(1);
} else {
  console.log('✅ Security checks passed');
} 