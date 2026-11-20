// pm2 process definitions. Lives at the root of each release (releases/<id>/), next to api/ and web/.
// Started by scripts/deploy-release.sh:  pm2 start ecosystem.config.cjs --env production
const path = require('node:path');

const ENV_FILE = '/opt/carbon-glint/shared/.env';
const apiDir = path.join(__dirname, 'api');

const common = {
  cwd: apiDir,
  // Load secrets with Node's built-in env-file support; cap heap for the 1 GB e2-micro.
  node_args: [`--env-file=${ENV_FILE}`, '--enable-source-maps', '--max-old-space-size=256'],
  instances: 1,
  exec_mode: 'fork',
  autorestart: true,
  max_memory_restart: '320M',
  exp_backoff_restart_delay: 200,
  kill_timeout: 10000,
  time: true,
  env_production: { NODE_ENV: 'production' },
};

module.exports = {
  apps: [
    { ...common, name: 'carbon-glint-api', script: 'dist/server.js' },
    { ...common, name: 'carbon-glint-worker', script: 'dist/worker.js' },
  ],
};
