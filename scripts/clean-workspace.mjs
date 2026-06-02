import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const args = new Set(process.argv.slice(2));

const defaultTargets = [
  'dist',
  'dist-ssr',
  'test-results',
  'playwright-report',
  'logs',
  'uploads',
  '.vite',
  path.join('node_modules', '.vite'),
  '.codex-client-5176.out.log',
  '.codex-client.out.log',
  '.codex-dev-e2e.err.log',
  '.codex-dev-e2e.out.log',
  '.codex-dev-refactor.err.log',
  '.codex-dev-refactor.out.log',
  '.codex-server.out.log',
];

const mobileTargets = [
  path.join('android', '.gradle'),
  path.join('android', 'app', 'build'),
  path.join('android', 'app', 'src', 'main', 'assets'),
  path.join('ios', 'App', 'App', 'public'),
];

const deepTargets = ['node_modules'];

const targets = [
  ...defaultTargets,
  ...(args.has('--mobile') ? mobileTargets : []),
  ...(args.has('--deep') ? deepTargets : []),
];

const requiredRuntimeDirs = ['uploads'];

async function pathSize(targetPath) {
  try {
    const stat = await fs.lstat(targetPath);
    if (!stat.isDirectory()) return stat.size;

    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    const sizes = await Promise.all(entries.map((entry) => pathSize(path.join(targetPath, entry.name))));
    return sizes.reduce((total, size) => total + size, 0);
  } catch {
    return 0;
  }
}

function formatMb(bytes) {
  return `${Math.round((bytes / 1024 / 1024) * 100) / 100} MB`;
}

let freed = 0;
for (const target of targets) {
  const absolutePath = path.resolve(root, target);
  if (!absolutePath.startsWith(root)) {
    console.warn(`Skipped unsafe path: ${target}`);
    continue;
  }

  const size = await pathSize(absolutePath);
  if (!size) continue;

  try {
    await fs.rm(absolutePath, { recursive: true, force: true });
    freed += size;
    console.log(`Removed ${target} (${formatMb(size)})`);
  } catch (error) {
    console.warn(`Could not remove ${target}: ${error.message}`);
  }
}

console.log(`Clean complete. Freed about ${formatMb(freed)}.`);
for (const dir of requiredRuntimeDirs) {
  await fs.mkdir(path.resolve(root, dir), { recursive: true });
}
if (!args.has('--deep')) {
  console.log('Tip: npm run clean:deep also removes node_modules, then run npm install before starting the project again.');
}
