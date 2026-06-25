#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const binDir = path.join(repoRoot, 'node_modules', '.bin');
const shimPath = path.join(binDir, 'wrangler');
const realWrangler = path.join(repoRoot, 'node_modules', 'wrangler', 'bin', 'wrangler.js');

if (!fs.existsSync(realWrangler)) {
  console.warn('[wrangler-shim] Skipping install; wrangler binary was not found.');
  process.exit(0);
}

fs.mkdirSync(binDir, { recursive: true });

const shim = `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..', '..');
const realWrangler = path.join(repoRoot, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const compiledOpenNextConfig = path.join(repoRoot, '.open-next', '.build', 'open-next.config.edge.mjs');
const args = process.argv.slice(2);

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    stdio: 'inherit',
    cwd: repoRoot,
    env: process.env,
    shell: process.platform === 'win32',
    ...options,
  });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const needsOpenNextBuild =
  args[0] === 'deploy' ||
  args[0] === 'upload' ||
  (args[0] === 'versions' && args[1] === 'upload');
const isOpenNextDelegatedDeploy = process.env.OPEN_NEXT_DEPLOY === 'true';

if (needsOpenNextBuild && !isOpenNextDelegatedDeploy && !fs.existsSync(compiledOpenNextConfig)) {
  console.log('[wrangler-shim] Missing .open-next build output; running npm run opennext:build before wrangler deploy/upload.');
  run('npm', ['run', 'opennext:build']);
}

run(process.execPath, [realWrangler, ...args], { shell: false });
`;

try {
  fs.rmSync(shimPath, { force: true });
  fs.writeFileSync(shimPath, shim, { mode: 0o755 });
  console.log('[wrangler-shim] Installed self-building wrangler deploy shim.');
} catch (error) {
  console.warn(`[wrangler-shim] Failed to install shim: ${error instanceof Error ? error.message : String(error)}`);
}
