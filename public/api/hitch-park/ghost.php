<?php
// Ghost runs: the inputs of a run, to be driven again beside the player.
// GET ?level=<id> → the level's record (best verified run on the current
//     fingerprint): {level, name, score, steps, replay}
// GET ?ghost=<code> → the run of a shared link (code from submit.php, see
//     hp_ghost_code); fine while it waits for its check, not once rejected
//     or when the level has changed since.
require __DIR__ . '/lib.php';
hp_method('GET');
hp_rate('ghost', hp_ip(), 300);
$cols = 'r.id, r.level_id, r.level_fp, r.score, r.steps, r.replay, p.name';

if (isset($_GET['ghost'])) {
  $id = hp_ghost_run_id($_GET['ghost']);
  if ($id === null) hp_fail(404, 'no_ghost');
  $r = hp_q("SELECT $cols FROM hp_runs r JOIN hp_players p ON p.id = r.player_id
    WHERE r.id = ? AND r.status <> 2 AND p.banned = 0", [$id])->fetch();
  if (!$r) hp_fail(404, 'no_ghost');
  $levels = hp_levels();
  if (!isset($levels[$r['level_id']]) || $levels[$r['level_id']]['fp'] !== $r['level_fp']) hp_fail(404, 'no_ghost');
} else {
  $level = hp_level($_GET['level'] ?? null);
  $r = hp_q("SELECT $cols FROM hp_best b JOIN hp_runs r ON r.id = b.run_id JOIN hp_players p ON p.id = b.player_id
    WHERE b.level_id = ? AND b.level_fp = ? AND b.verified = 1 AND p.banned = 0
    ORDER BY b.score DESC, b.steps ASC, b.run_id ASC LIMIT 1", [$level['id'], $level['fp']])->fetch();
  if (!$r) hp_fail(404, 'no_ghost');
}
hp_send(['level' => $r['level_id'], 'name' => $r['name'], 'score' => (int)$r['score'], 'steps' => (int)$r['steps'], 'replay' => $r['replay']]);
