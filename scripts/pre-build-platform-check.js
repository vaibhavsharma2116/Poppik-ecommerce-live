#!/usr/bin/env node

// Pre-build check to ensure no platform-specific dependencies
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Running pre-build platform dependency check...');

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
    console.log('❌ BUILD FAILED: Platform-specific dependencies found in package.json:');
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
    console.log('❌ BUILD FAILED: Platform-specific imports found in vite.config.ts:');
    platformImports.forEach(imp => {
      console.log(`   - ${imp}`);
    });
  }
}

if (foundPlatformDeps) {
  console.log('\n🚨 BUILD STOPPED:');
  console.log('   Platform-specific dependencies will cause issues outside their intended environment.');
  console.log('   Please remove all platform-specific dependencies before building.');
  console.log('   Run: npm run check-platform for detailed analysis.');
  process.exit(1);
} else {
  console.log('✅ Pre-build check passed. No platform-specific dependencies found.');
}
