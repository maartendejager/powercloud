#!/usr/bin/env node

/**
 * PowerCloud Extension Build Script
 * 
 * Builds the extension for production or development.
 * 
 * Usage:
 *   node build.js              # Production build
 *   node build.js --dev        # Development build (keeps console.logs)
 *   node build.js --watch      # Watch mode for development
 */

import * as esbuild from 'esbuild';
import { copyFile, mkdir, readdir, rm, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const isDev = args.includes('--dev');
const isWatch = args.includes('--watch');

// Build configuration
const BUILD_DIR = 'dist';
const SOURCE_DIRS = ['background', 'content_scripts', 'popup', 'shared', 'images'];

// ANSI colors for pretty output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

/**
 * Get esbuild options for the current build mode
 */
function getBuildOptions(baseOptions = {}) {
  const options = {
    ...baseOptions,
    minify: !isDev,
    sourcemap: isDev ? 'inline' : false,
    target: 'es2020',
    logLevel: 'error'
  };
  
  // Drop console.log/debug in production (keeps warn/error)
  if (!isDev) {
    options.drop = ['console'];  // This preserves console.warn and console.error
    options.pure = ['console.log', 'console.debug', 'console.info'];
  }
  
  return options;
}

/**
 * Print build header
 */
function printHeader() {
  const mode = isDev ? 'DEVELOPMENT' : 'PRODUCTION';
  const modeColor = isDev ? colors.yellow : colors.green;
  
  console.log(`\n${colors.blue}╔════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║${colors.reset}   PowerCloud Extension - Build Script       ${colors.blue}║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════════════╝${colors.reset}`);
  console.log(`${colors.dim}Mode: ${modeColor}${mode}${colors.reset}${colors.dim} | Watch: ${isWatch ? 'ON' : 'OFF'}${colors.reset}\n`);
}

/**
 * Clean build directory
 */
async function clean() {
  console.log(`${colors.cyan}🧹 Cleaning build directory...${colors.reset}`);
  try {
    await rm(BUILD_DIR, { recursive: true, force: true });
    await mkdir(BUILD_DIR, { recursive: true });
    console.log(`${colors.green}✓${colors.reset} Build directory cleaned\n`);
  } catch (error) {
    console.error(`${colors.red}✗ Error cleaning:${colors.reset}`, error.message);
    throw error;
  }
}

/**
 * Copy static files
 */
async function copyStatic() {
  console.log(`${colors.cyan}📄 Copying static files...${colors.reset}`);
  
  const filesToCopy = [
    'manifest.json',
    'popup/popup.html',
    'popup/popup.css',
    'popup/token-styles.css',
    'content_scripts/styles.css'
  ];

  for (const file of filesToCopy) {
    const source = join(__dirname, file);
    const dest = join(__dirname, BUILD_DIR, file);
    
    await mkdir(dirname(dest), { recursive: true });
    await copyFile(source, dest);
    console.log(`  ${colors.dim}→${colors.reset} ${file}`);
  }
  
  console.log(`${colors.green}✓${colors.reset} Static files copied\n`);
}

/**
 * Copy images directory
 */
async function copyImages() {
  console.log(`${colors.cyan}🖼️  Copying images...${colors.reset}`);
  
  const imagesDir = join(__dirname, 'images');
  const destDir = join(__dirname, BUILD_DIR, 'images');
  
  await mkdir(destDir, { recursive: true });
  
  const files = await readdir(imagesDir);
  for (const file of files) {
    await copyFile(join(imagesDir, file), join(destDir, file));
    console.log(`  ${colors.dim}→${colors.reset} images/${file}`);
  }
  
  console.log(`${colors.green}✓${colors.reset} Images copied\n`);
}

/**
 * Build background service worker
 */
async function buildBackground() {
  console.log(`${colors.cyan}⚙️  Building background service worker...${colors.reset}`);
  
  try {
    const result = await esbuild.build(getBuildOptions({
      entryPoints: ['background/service-worker.js'],
      bundle: true,
      format: 'esm',
      outdir: join(BUILD_DIR, 'background')
    }));
    
    console.log(`${colors.green}✓${colors.reset} Background worker built\n`);
  } catch (error) {
    console.error(`${colors.red}✗ Background build failed:${colors.reset}`, error.message);
    throw error;
  }
}

/**
 * Build popup
 */
async function buildPopup() {
  console.log(`${colors.cyan}🎨 Building popup...${colors.reset}`);
  
  try {
    await esbuild.build(getBuildOptions({
      entryPoints: ['popup/popup.js'],
      bundle: false, // Don't bundle - popup.js uses chrome APIs directly
      outdir: join(BUILD_DIR, 'popup')
    }));
    
    console.log(`${colors.green}✓${colors.reset} Popup built\n`);
  } catch (error) {
    console.error(`${colors.red}✗ Popup build failed:${colors.reset}`, error.message);
    throw error;
  }
}

/**
 * Build content scripts and shared modules
 * These cannot be bundled due to Chrome's loading mechanism
 */
async function buildContentScripts() {
  console.log(`${colors.cyan}📝 Building content scripts...${colors.reset}`);
  
  const scriptDirs = [
    'shared',
    'content_scripts/features',
    'content_scripts'
  ];
  
  for (const dir of scriptDirs) {
    const sourceDir = join(__dirname, dir);
    const destDir = join(__dirname, BUILD_DIR, dir);
    
    await mkdir(destDir, { recursive: true });
    
    const files = await readdir(sourceDir);
    const jsFiles = files.filter(f => f.endsWith('.js'));
    
    for (const file of jsFiles) {
      try {
        await esbuild.build(getBuildOptions({
          entryPoints: [join(sourceDir, file)],
          bundle: false,
          outdir: destDir
        }));
        
        console.log(`  ${colors.dim}→${colors.reset} ${dir}/${file}`);
      } catch (error) {
        console.warn(`  ${colors.yellow}⚠${colors.reset} ${dir}/${file} (${error.message})`);
      }
    }
  }
  
  console.log(`${colors.green}✓${colors.reset} Content scripts built\n`);
}

/**
 * Build API processors
 */
async function buildApiProcessors() {
  console.log(`${colors.cyan}🔧 Building API processors...${colors.reset}`);
  
  const sourceDir = join(__dirname, 'background/api-processors');
  const destDir = join(__dirname, BUILD_DIR, 'background/api-processors');
  
  await mkdir(destDir, { recursive: true });
  
  const files = await readdir(sourceDir);
  const jsFiles = files.filter(f => f.endsWith('.js'));
  
  for (const file of jsFiles) {
    await esbuild.build(getBuildOptions({
      entryPoints: [join(sourceDir, file)],
      bundle: false,
      outdir: destDir,
      format: 'esm'
    }));
    
    console.log(`  ${colors.dim}→${colors.reset} api-processors/${file}`);
  }
  
  console.log(`${colors.green}✓${colors.reset} API processors built\n`);
}

/**
 * Build message handlers
 */
async function buildMessageHandlers() {
  console.log(`${colors.cyan}💬 Building message handlers...${colors.reset}`);
  
  const sourceDir = join(__dirname, 'background/message-handlers');
  const destDir = join(__dirname, BUILD_DIR, 'background/message-handlers');
  
  await mkdir(destDir, { recursive: true });
  
  const files = await readdir(sourceDir);
  const jsFiles = files.filter(f => f.endsWith('.js'));
  
  for (const file of jsFiles) {
    await esbuild.build(getBuildOptions({
      entryPoints: [join(sourceDir, file)],
      bundle: false,
      outdir: destDir,
      format: 'esm'
    }));
    
    console.log(`  ${colors.dim}→${colors.reset} message-handlers/${file}`);
  }
  
  console.log(`${colors.green}✓${colors.reset} Message handlers built\n`);
}

/**
 * Copy additional background files
 */
async function copyBackgroundFiles() {
  console.log(`${colors.cyan}📋 Copying additional background files...${colors.reset}`);
  
  const file = 'background/token-manager.js';
  const source = join(__dirname, file);
  const dest = join(__dirname, BUILD_DIR, file);
  
  await mkdir(dirname(dest), { recursive: true });
  
  // Build it with esbuild for minification
  await esbuild.build(getBuildOptions({
    entryPoints: [source],
    bundle: false,
    outfile: dest,
    format: 'esm'
  }));
  
  console.log(`  ${colors.dim}→${colors.reset} ${file}`);
  console.log(`${colors.green}✓${colors.reset} Background files copied\n`);
}

/**
 * Print build summary
 */
async function printSummary() {
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.green}✨ Build complete!${colors.reset}\n`);
  console.log(`  Output directory: ${colors.cyan}${BUILD_DIR}/${colors.reset}`);
  console.log(`  Mode: ${isDev ? colors.yellow + 'Development' : colors.green + 'Production'}${colors.reset}`);
  console.log(`  Console logs: ${isDev ? colors.yellow + 'Kept' : colors.green + 'Stripped'}${colors.reset}`);
  console.log(`  Source maps: ${isDev ? colors.green + 'Yes' : colors.dim + 'No'}${colors.reset}`);
  console.log(`  Minified: ${isDev ? colors.dim + 'No' : colors.green + 'Yes'}${colors.reset}\n`);
  console.log(`${colors.dim}To load in Chrome:${colors.reset}`);
  console.log(`  1. Go to chrome://extensions/`);
  console.log(`  2. Enable Developer mode`);
  console.log(`  3. Click "Load unpacked"`);
  console.log(`  4. Select the ${colors.cyan}${BUILD_DIR}/${colors.reset} folder\n`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
}

/**
 * Main build function
 */
async function build() {
  const startTime = Date.now();
  
  printHeader();
  
  try {
    await clean();
    await copyStatic();
    await copyImages();
    await buildBackground();
    await buildApiProcessors();
    await buildMessageHandlers();
    await copyBackgroundFiles();
    await buildPopup();
    await buildContentScripts();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    await printSummary();
    console.log(`  ${colors.dim}Build time: ${duration}s${colors.reset}\n`);
    
  } catch (error) {
    console.error(`\n${colors.red}❌ Build failed:${colors.reset}`, error);
    process.exit(1);
  }
}

/**
 * Watch mode
 */
async function watch() {
  console.log(`${colors.yellow}👀 Watch mode enabled - rebuilding on changes...${colors.reset}\n`);
  
  // Initial build
  await build();
  
  // TODO: Implement proper watch mode with esbuild or chokidar
  console.log(`${colors.dim}Note: Full watch mode not yet implemented. Rebuild manually with:${colors.reset}`);
  console.log(`${colors.cyan}  npm run build:dev${colors.reset}\n`);
}

// Run build
if (isWatch) {
  watch().catch(console.error);
} else {
  build().catch(console.error);
}

