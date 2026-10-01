<?php
// GET (header X-Player-Token) → {notices: [{level, status, score, steps, claimedScore, claimedSteps}]}
// Runs of this player whose check changed the result or rejected them, not
// reported before; each is reported once.
require __DIR__ . '/lib.php';
hp_method('GET');
hp_rate('notices', hp_ip(), 120);
$me = hp_player(hp_header('X-Player-Token'));
$rows = hp_q('SELECT id, level_id, status, score, steps, claimed_score, claimed_steps FROM hp_runs
  WHERE player_id = ? AND notified = 0 AND (status = 2 OR (status = 1 AND adjusted = 1)) ORDER BY id LIMIT 20', [$me['id']])->fetchAll();
if ($rows) hp_q('UPDATE hp_runs SET notified = 1 WHERE id IN (' . implode(',', array_map(fn($r) => (int)$r['id'], $rows)) . ')');
hp_send(['notices' => array_map(fn($r) => [
  'level' => $r['level_id'], 'status' => (int)$r['status'] === 2 ? 'rejected' : 'adjusted',
  'score' => (int)$r['score'], 'steps' => (int)$r['steps'],
  'claimedScore' => $r['claimed_score'] === null ? (int)$r['score'] : (int)$r['claimed_score'],
  'claimedSteps' => $r['claimed_steps'] === null ? (int)$r['steps'] : (int)$r['claimed_steps'],
], $rows)]);
