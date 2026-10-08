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
// The replay's result is the one that counts: a run that parks is kept
// with the time and score the check computed (adjusted = 1 when that is not
// what the game claimed), one that does not park is rejected. Either way
// the player's best on the level is worked out again from their runs.
foreach (($in['results'] ?? []) as $res) {
  $id = (int)($res['id'] ?? 0);
  $run = hp_q('SELECT id, player_id, level_id, score, steps FROM hp_runs WHERE id = ? AND status = 0', [$id])->fetch();
  if (!$run) continue;
  $reason = isset($res['reason']) ? substr(preg_replace('/[^\w .:,\-→]/u', '', (string)$res['reason']), 0, 96) : null;
  $db = hp_db();
  $db->beginTransaction();
  if (!empty($res['ok'])) {
    $v = [];
    foreach (['steps', 'score', 'stars', 'hits', 'crashes', 'cones'] as $k) {
      if (!isset($res[$k]) || !is_int($res[$k]) || $res[$k] < 0) { $db->rollBack(); hp_fail(400, 'bad_result'); }
      $v[$k] = $res[$k];
    }
    $eff = isset($res['effective']) && preg_match('/^[0-9a-f]{64}$/', (string)$res['effective']) ? (string)$res['effective'] : null;
    $copied = $eff !== null && hp_q('SELECT 1 FROM hp_runs WHERE level_id = ? AND effective_hash = ? AND player_id <> ? AND status = 1 LIMIT 1',
      [$run['level_id'], $eff, $run['player_id']])->fetchColumn();
    if ($copied) {
      hp_q('UPDATE hp_runs SET status = 2, reason = ?, effective_hash = ?, verified_at = ? WHERE id = ?', ['copied replay', $eff, hp_now(), $id]);
      hp_rebuild_best((int)$run['player_id'], (string)$run['level_id']);
      $db->commit();
      $done++;
      continue;
    }
    $adjusted = $v['score'] !== (int)$run['score'] || $v['steps'] !== (int)$run['steps'] || !empty($res['adjusted']);
    hp_q('UPDATE hp_runs SET status = 1, verified_at = ?, adjusted = ?, reason = ?, claimed_score = ?, claimed_steps = ?, effective_hash = ?,
      score = ?, steps = ?, stars = ?, hits = ?, crashes = ?, cones = ? WHERE id = ?',
      [hp_now(), $adjusted ? 1 : 0, $adjusted ? $reason : null, $run['score'], $run['steps'], $eff,
       $v['score'], $v['steps'], $v['stars'], $v['hits'], $v['crashes'], $v['cones'], $id]);
  } else {
    hp_q('UPDATE hp_runs SET status = 2, reason = ?, verified_at = ? WHERE id = ?', [$reason ?? 'mismatch', hp_now(), $id]);
  }
  hp_rebuild_best((int)$run['player_id'], (string)$run['level_id']);
  $db->commit();
  $done++;
}
hp_send(['done' => $done]);
