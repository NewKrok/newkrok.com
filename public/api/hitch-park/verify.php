<?php
// For the replay check (scripts/verify-runs.js); header X-Verify-Token.
// GET  ?limit=100 → {runs: [{id, level, fp, steps, score, stars, hits, crashes, cones, replay}]}
//      runs waiting for the check, oldest first.
// POST {results: [{id, ok, reason?}]} → {done}
require __DIR__ . '/lib.php';
$want = (string)(hp_config()['verify_token'] ?? '');
if ($want === '' || $want === 'CHANGE-ME-TOO' || !hash_equals($want, (string)hp_header('X-Verify-Token'))) hp_fail(403, 'forbidden');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $limit = max(1, min(500, (int)($_GET['limit'] ?? 100)));
  $rows = hp_q("SELECT id, level_id AS level, level_fp AS fp, steps, score, stars, hits, crashes, cones, replay
    FROM hp_runs WHERE status = 0 ORDER BY id LIMIT $limit")->fetchAll();
  foreach ($rows as &$r) foreach (['id', 'steps', 'score', 'stars', 'hits', 'crashes', 'cones'] as $k) $r[$k] = (int)$r[$k];
  hp_send(['runs' => $rows]);
}

hp_method('POST');
$in = hp_body();
$done = 0;
foreach (($in['results'] ?? []) as $res) {
  $id = (int)($res['id'] ?? 0);
  $run = hp_q('SELECT id, player_id, level_id FROM hp_runs WHERE id = ? AND status = 0', [$id])->fetch();
  if (!$run) continue;
  $db = hp_db();
  $db->beginTransaction();
  if (!empty($res['ok'])) {
    hp_q('UPDATE hp_runs SET status = 1, verified_at = ? WHERE id = ?', [hp_now(), $id]);
    hp_q('UPDATE hp_best SET verified = 1 WHERE run_id = ?', [$id]);
  } else {
    $reason = substr(preg_replace('/[^\w .:,\-]/', '', (string)($res['reason'] ?? 'mismatch')), 0, 64);
    hp_q('UPDATE hp_runs SET status = 2, reason = ?, verified_at = ? WHERE id = ?', [$reason, hp_now(), $id]);
    if (hp_q('SELECT 1 FROM hp_best WHERE run_id = ?', [$id])->fetchColumn()) hp_rebuild_best((int)$run['player_id'], (string)$run['level_id']);
  }
  $db->commit();
  $done++;
}
hp_send(['done' => $done]);
