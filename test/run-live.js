'use strict'
// Cross-platform runner for the live tests: sets NODE_USE_ENV_PROXY without
// shell-specific syntax so `npm run test:live` also works on Windows.
const { spawnSync } = require('node:child_process')
const path = require('node:path')

const result = spawnSync(process.execPath,
    ['--test', '--test-concurrency=1', path.join(__dirname, 'live.test.js')],
    { stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1' } })
process.exit(result.status ?? 1)
