<?php
// Copy to config.php ON THE SERVER ONLY (it is git-ignored and never
// deployed) and fill in. Secrets: long random strings, e.g.
//   php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"
return [
  'db_dsn'  => 'mysql:host=localhost;dbname=DATABASE;charset=utf8mb4',
  'db_user' => 'USER',
  'db_pass' => 'PASSWORD',
  // Signs the run tokens handed out at the start of a level.
  'run_secret' => 'CHANGE-ME',
  // Shared with the GitHub Action that checks the replays
  // (repository secret LB_VERIFY_TOKEN).
  'verify_token' => 'CHANGE-ME-TOO',
  // Names nobody may take (compared folded: case, accents and spaces ignored).
  'reserved_names' => ['admin', 'moderator', 'newkrok'],
];
