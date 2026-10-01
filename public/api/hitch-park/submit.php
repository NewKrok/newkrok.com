<?php
// POST {token, run, level, fp, steps, score, stars, hits, crashes, cones,
//       replay, browser?}
//   → {improved, rank, total, score, steps, stars, verified, run}
// Keeps the run when it beats the player's best on the level; the replay
// check (verify.php) confirms or rejects it later.
require __DIR__ . '/lib.php';
hp_method('POST');
$in = hp_body();
hp_rate('submit', hp_ip(), 120);
$me = hp_player(isset($in['token']) ? (string)$in['token'] : null);
if ((int)$me['banned']) hp_fail(403, 'banned');
hp_rate('submit-player', (string)$me['id'], 60);

$level = hp_level($in['level'] ?? null);
if (($in['fp'] ?? null) !== $level['fp']) hp_fail(409, 'outdated');   // an old copy of the game

$int = function ($k) use ($in) {
  if (!isset($in[$k]) || !is_int($in[$k])) hp_fail(400, 'bad_claim');
  return $in[$k];
};
$steps = $int('steps'); $score = $int('score'); $stars = $int('stars');
$hits = $int('hits'); $crashes = $int('crashes'); $cones = $int('cones');
if (hp_replay_steps($in['replay'] ?? null) !== $steps) hp_fail(400, 'bad_replay');
hp_check_claim($level, $steps, $score, $stars, $hits, $crashes, $cones);
$nonce = hp_check_run_token($in['run'] ?? null, $level['id'], $steps);
$browser = isset($in['browser']) && is_string($in['browser']) ? substr(preg_replace('/[^a-z]/', '', $in['browser']), 0, 16) : null;

$db = hp_db();
$db->beginTransaction();
try {
  hp_q('INSERT INTO hp_nonces (nonce, used_at) VALUES (?, ?)', [$nonce, hp_now()]);
} catch (PDOException $e) {
  $db->rollBack();
  if ($e->getCode() === '23000') hp_fail(400, 'run_token_used');
  throw $e;
}
if (mt_rand(1, 50) === 1) hp_q('DELETE FROM hp_nonces WHERE used_at < ?', [gmdate('Y-m-d H:i:s', time() - 7 * 86400)]);

$best = hp_q('SELECT run_id, level_fp, score, steps, stars, verified FROM hp_best WHERE level_id = ? AND player_id = ? FOR UPDATE',
  [$level['id'], $me['id']])->fetch();
$current = $best && $best['level_fp'] === $level['fp'];
$improved = !$current || $score > (int)$best['score'] || ($score === (int)$best['score'] && $steps < (int)$best['steps']);

if ($improved) {
  $replay = (string)$in['replay'];
  try {
    hp_q('INSERT INTO hp_runs (player_id, level_id, level_fp, score, steps, stars, hits, crashes, cones, replay, replay_hash, browser, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [$me['id'], $level['id'], $level['fp'], $score, $steps, $stars, $hits, $crashes, $cones, $replay, hash('sha256', $replay), $browser, hp_now()]);
  } catch (PDOException $e) {
    $db->rollBack();
    if ($e->getCode() === '23000') hp_fail(409, 'duplicate_replay');   // someone else's run, sent again
    throw $e;
  }
  $runId = (int)$db->lastInsertId();
  hp_q('DELETE FROM hp_best WHERE level_id = ? AND player_id = ?', [$level['id'], $me['id']]);
  hp_q('INSERT INTO hp_best (level_id, player_id, level_fp, run_id, score, steps, stars, verified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)',
    [$level['id'], $me['id'], $level['fp'], $runId, $score, $steps, $stars, hp_now()]);
  $best = ['run_id' => $runId, 'score' => $score, 'steps' => $steps, 'stars' => $stars, 'verified' => 0];
}
$db->commit();

hp_send([
  'improved' => $improved,
  'rank' => hp_rank($level['id'], $level['fp'], $best, (int)$me['id']),
  'total' => hp_board_size($level['id'], $level['fp'], (int)$me['id']),
  'score' => (int)$best['score'], 'steps' => (int)$best['steps'], 'stars' => (int)$best['stars'], 'verified' => (bool)$best['verified'],
  'run' => (int)$best['run_id'],                                     // for a shared ghost link
]);
