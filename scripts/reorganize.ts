import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Directories to move
const dirsToMove = [
  'scripts',
  'contracts',
  'docs',
  'deployments',
  'functions'
];

// Function to create directory if it doesn't exist
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Function to move directory
function moveDir(src: string, dest: string) {
  if (fs.existsSync(src)) {
    ensureDir(path.dirname(dest));
    if (fs.existsSync(dest)) {
      // Merge directories
      const files = fs.readdirSync(src);
      files.forEach(file => {
        const srcFile = path.join(src, file);
        const destFile = path.join(dest, file);
        if (fs.statSync(srcFile).isDirectory()) {
          moveDir(srcFile, destFile);
        } else {
          fs.copyFileSync(srcFile, destFile);
        }
      });
      fs.rmSync(src, { recursive: true });
    } else {
      // Move directory
      fs.renameSync(src, dest);
    }
  }
}

// Move directories
dirsToMove.forEach(dir => {
  const src = path.join(process.cwd(), dir);
  const dest = path.join(process.cwd(), 'src', dir);
  console.log(`Moving ${src} to ${dest}`);
  moveDir(src, dest);
});

// Update tsconfig.json paths
const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
if (!tsconfig.compilerOptions.paths) {
  tsconfig.compilerOptions.paths = {};
}

// Add path aliases
tsconfig.compilerOptions.paths = {
  ...tsconfig.compilerOptions.paths,
  '@scripts/*': ['src/scripts/*'],
  '@contracts/*': ['src/contracts/*'],
  '@docs/*': ['src/docs/*'],
  '@deployments/*': ['src/deployments/*'],
  '@functions/*': ['src/functions/*']
};

fs.writeFileSync('tsconfig.json', JSON.stringify(tsconfig, null, 2));

// Update package.json scripts
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts = {
  ...pkg.scripts,
  'compile': 'TS_NODE_PROJECT=\'./tsconfig.hardhat.json\' npx hardhat compile',
  'deploy:contracts': 'TS_NODE_PROJECT=\'./tsconfig.hardhat.json\' npx hardhat run src/scripts/deploy.ts --network sepolia',
};

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));

// Update hardhat.config.ts paths
const hardhatConfig = fs.readFileSync('hardhat.config.ts', 'utf8');
const updatedHardhatConfig = hardhatConfig
  .replace(/\.\/contracts/g, './src/contracts')
  .replace(/\.\/scripts/g, './src/scripts')
  .replace(/\.\/deployments/g, './src/deployments');

fs.writeFileSync('hardhat.config.ts', updatedHardhatConfig);

console.log('Project restructuring complete!'); 