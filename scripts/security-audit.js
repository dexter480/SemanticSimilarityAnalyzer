#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🔒 Running Security Audit...\n');

const issues = [];
const warnings = [];

// Check for sensitive patterns in code
const sensitivePatterns = [
  { pattern: /sk-[a-zA-Z0-9]{48}/, name: 'OpenAI API Key' },
  { pattern: /api[_-]?key[\s]*=[\s]*["'][^"']+["']/gi, name: 'API Key Assignment' },
  { pattern: /localhost:\d{4}/, name: 'Localhost URL' },
  { pattern: /console\.log\(.*apiKey.*\)/gi, name: 'API Key Logging' }
];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  sensitivePatterns.forEach(({ pattern, name }) => {
    if (pattern.test(content)) {
      issues.push(`Found ${name} in ${filePath}`);
    }
  });
  
  // Check for console.log
  if (content.includes('console.log') && !filePath.includes('test')) {
    warnings.push(`console.log found in ${filePath}`);
  }
}

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('.git')) {
      scanDirectory(filePath);
    } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js'))) {
      scanFile(filePath);
    }
  });
}

// Run scan
scanDirectory(path.join(__dirname, '..', 'client', 'src'));

// Generate report
console.log('📊 Security Audit Report\n');

if (issues.length > 0) {
  console.log('❌ CRITICAL ISSUES FOUND:');
  issues.forEach(issue => console.log(`   - ${issue}`));
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS:');
  warnings.forEach(warning => console.log(`   - ${warning}`));
  console.log('');
}

// Check dependencies
console.log('📦 Checking Dependencies...');
const { execSync } = require('child_process');

try {
  const auditResult = execSync('npm audit --json', { encoding: 'utf8' });
  const audit = JSON.parse(auditResult);
  
  if (audit.vulnerabilities) {
    const vulnCount = Object.values(audit.vulnerabilities).length;
    if (vulnCount > 0) {
      console.log(`   - Found ${vulnCount} vulnerabilities`);
      console.log('   - Run "npm audit fix" to address them');
    }
  }
} catch (e) {
  // npm audit returns non-zero exit code if vulnerabilities found
  console.log('   - Vulnerabilities detected. Run "npm audit" for details');
}

// Summary
console.log('\n📈 Summary:');
console.log(`   - Critical Issues: ${issues.length}`);
console.log(`   - Warnings: ${warnings.length}`);

if (issues.length === 0 && warnings.length === 0) {
  console.log('\n✅ All security checks passed!');
  process.exit(0);
} else {
  console.log('\n❌ Please address the issues before deploying');
  process.exit(1);
} 