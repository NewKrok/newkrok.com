<?php
// POST {level} → {run}: a signed run token for the level about to be driven.
require __DIR__ . '/lib.php';
hp_method('POST');
$in = hp_body();
$level = hp_level($in['level'] ?? null);
hp_rate('start', hp_ip(), 300);
hp_send(['run' => hp_run_token($level['id'])]);
