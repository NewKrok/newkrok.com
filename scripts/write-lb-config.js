'use strict';

// Writes the Hitch & Park leaderboard's config.php into the build from the
// deploy's environment (GitHub secrets, see .github/workflows/prod-ci.yml).
// Skipped when the secrets are not there, so a fork's build still works.

const fs = require('fs');
const path = require('path');

const env = (k) => process.env[k] || '';
const need = ['LB_DB_NAME', 'LB_DB_USER', 'LB_DB_PASS', 'LB_RUN_SECRET', 'LB_VERIFY_TOKEN'];
const missing = need.filter((k) => !env(k));
if (missing.length) {
  console.log(`Leaderboard config not written, missing: ${missing.join(', ')}`);
  process.exit(0);
}

// A PHP single-quoted string: only \ and ' need escaping.
const q = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const php = `<?php
// Written by scripts/write-lb-config.js at deploy time. Do not edit on the server.
return [
  'db_dsn' => ${q(`mysql:host=${env('LB_DB_HOST') || 'localhost'};dbname=${env('LB_DB_NAME')};charset=utf8mb4`)},
  'db_user' => ${q(env('LB_DB_USER'))},
  'db_pass' => ${q(env('LB_DB_PASS'))},
  'run_secret' => ${q(env('LB_RUN_SECRET'))},
  'verify_token' => ${q(env('LB_VERIFY_TOKEN'))},
  'reserved_names' => ['admin', 'moderator', 'newkrok'],
];
`;
const target = path.resolve(__dirname, '..', 'build', 'api', 'hitch-park', 'config.php');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, php, { mode: 0o600 });
console.log(`Leaderboard config written: ${path.relative(process.cwd(), target)}`);
