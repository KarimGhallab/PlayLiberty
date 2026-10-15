#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Ensures every package under apps/, scripts/ and packages/ is listed in
 * tsconfig.depcruise.json, which depcruiser needs to resolve their imports.
 */

const rootDir = path.resolve(__dirname, '..');
const tsConfigFilePath = path.join(rootDir, 'tsconfig.depcruise.json');
const packagePatterns = ['apps/*', 'scripts/*', 'packages/**'];

function findPackages(baseDir, patterns) {
  const packages = [];

  for (const pattern of patterns) {
    const parts = pattern.split('/');
    const basePath = parts[0];
    const isRecursive = pattern.includes('**');

    const searchDir = path.join(baseDir, basePath);
    if (!fs.existsSync(searchDir)) {
      continue;
    }

    if (isRecursive) {
      findPackagesRecursive(searchDir, packages);
    } else {
      const entries = fs.readdirSync(searchDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const pkgPath = path.join(searchDir, entry.name, 'package.json');
          if (fs.existsSync(pkgPath)) {
            packages.push(pkgPath);
          }
        }
      }
    }
  }

  return packages;
}

function findPackagesRecursive(dir, packages) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.name === 'node_modules') {
      continue;
    }

    if (entry.isDirectory()) {
      findPackagesRecursive(fullPath, packages);
    } else if (entry.name === 'package.json') {
      packages.push(fullPath);
    }
  }
}

function getPackageName(pkgPath) {
  try {
    const content = fs.readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(content);
    return pkg.name;
  } catch (error) {
    console.error(`Error reading ${pkgPath}:`, error.message);
    return null;
  }
}

function getTsconfigPaths() {
  try {
    const content = fs.readFileSync(tsConfigFilePath, 'utf8');
    const cleanContent = content
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    const tsconfig = JSON.parse(cleanContent);
    return Object.keys(tsconfig.compilerOptions?.paths || {});
  } catch (error) {
    console.error(`Error reading ${tsConfigFilePath}:`, error.message);
    process.exit(1);
  }
}

function validateTsconfigPaths() {
  const packageFiles = findPackages(rootDir, packagePatterns);

  const packageNames = packageFiles
    .map(pkgPath => ({
      name: getPackageName(pkgPath),
      path: path.relative(rootDir, pkgPath)
    }))
    .filter(pkg => pkg.name);

  const tsconfigPaths = getTsconfigPaths();

  const missing = [];

  for (const pkg of packageNames) {
    if (!tsconfigPaths.includes(pkg.name)) {
      missing.push(pkg);
    }
  }

  if (missing.length > 0) {
    console.error(
      `❌ ${missing.length} package(s) missing from tsconfig.depcruise.json:`
    );
    for (const pkg of missing) {
      console.error(`   - ${pkg.name}`);
    }
    process.exit(1);
  }

  console.log('✔ tsconfig.depcruise.json paths are valid');
}

validateTsconfigPaths();
