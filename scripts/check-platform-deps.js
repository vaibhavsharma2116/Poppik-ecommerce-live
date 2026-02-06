#!/usr/bin/env node

// Alert system to detect platform-specific dependencies
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Checking for platform-specific dependencies...');

const packageJsonPath = path.join(__dirname, '../package.json');
const viteConfigPath = path.join(__dirname, '../vite.config.ts');

let foundPlatformDeps = false;

// Check package.json
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const platformDeps = Object.keys(allDeps).filter(dep => 
    dep.includes('@vercel') || dep.includes('@netlify') || dep.includes('@cloudflare')
  );
  
  if (platformDeps.length > 0) {
    foundPlatformDeps = true;
    console.log('⚠️  ALERT: Found platform-specific dependencies in package.json:');
    platformDeps.forEach(dep => {
      console.log(`   - ${dep}: ${allDeps[dep]}`);
    });
  }
}

// Check vite.config.ts
if (fs.existsSync(viteConfigPath)) {
  const viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
  const platformImports = viteConfig.match(/@(vercel|netlify|cloudflare)\/[^\s]+/g);
  
  if (platformImports && platformImports.length > 0) {
    foundPlatformDeps = true;
    console.log('⚠️  ALERT: Found platform-specific imports in vite.config.ts:');
    platformImports.forEach(imp => {
      console.log(`   - ${imp}`);
    });
  }
}

if (!foundPlatformDeps) {
  console.log('✅ No platform-specific dependencies found. Application is clean!');
} else {
  console.log('\n🚨 PLATFORM DEPENDENCY WARNING:');
  console.log('   Platform-specific dependencies were found in the codebase.');
  console.log('   Please remove them to ensure the application works properly across all platforms.');
  console.log('   Run: npm install to update dependencies after removal.');
}

// Check for platform-specific documentation files
const platformFiles = ['platform.md'];
platformFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`⚠️  ALERT: ${file} file still exists. Please remove it.`);
  }
});
