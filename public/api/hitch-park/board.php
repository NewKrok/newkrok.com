<?php
// GET ?level=<id>[&limit=10]  → {level, total, top: [...], you}
// GET ?scope=total[&limit=10] → {total, top: [...], you}: sum of each
//     player's best scores over all levels (current fingerprints only).
// The player's token (header X-Player-Token) marks their own row and adds
// it as "you" when it is not in the top.
require __DIR__ . '/lib.php';
hp_method('GET');
hp_rate('board', hp_ip(), 600);
$limit = max(1, min(50, (int)($_GET['limit'] ?? 10)));
$me = hp_player(hp_header('X-Player-Token'), false);
$meId = $me ? (int)$me['id'] : null;

if (($_GET['scope'] ?? '') === 'total') {
  $pairs = []; $args = [];
  foreach (hp_levels() as $id => $l) { $pairs[] = '(b.level_id = ? AND b.level_fp = ?)'; $args[] = $id; $args[] = $l['fp']; }
  $where = hp_visible($meId) . ' AND (' . implode(' OR ', $pairs) . ')';
  $sum = "SELECT b.player_id, p.name, SUM(b.score) AS score, COUNT(*) AS levels, SUM(b.stars) AS stars, MIN(b.created_at) AS since, MIN(b.verified) AS verified
    FROM hp_best b JOIN hp_players p ON p.id = b.player_id WHERE $where GROUP BY b.player_id, p.name";
  $rows = hp_q("$sum ORDER BY score DESC, levels DESC, since ASC LIMIT $limit", $args)->fetchAll();
  $entry = fn($r, $rank) => ['rank' => $rank, 'name' => $r['name'], 'score' => (int)$r['score'], 'levels' => (int)$r['levels'],
    'stars' => (int)$r['stars'], 'verified' => (bool)$r['verified'], 'you' => $meId !== null && (int)$r['player_id'] === $meId];
  $top = []; foreach ($rows as $i => $r) $top[] = $entry($r, $i + 1);
  $total = (int)hp_q("SELECT COUNT(*) FROM ($sum) t", $args)->fetchColumn();
  $you = null;
  if ($meId !== null && !array_filter($top, fn($e) => $e['you'])) {
    $mine = hp_q("SELECT * FROM ($sum) t WHERE t.player_id = ?", array_merge($args, [$meId]))->fetch();
    if ($mine) {
      $ahead = (int)hp_q("SELECT COUNT(*) FROM ($sum) t WHERE t.score > ? OR (t.score = ? AND (t.levels > ? OR (t.levels = ? AND t.since < ?)))",
        array_merge($args, [$mine['score'], $mine['score'], $mine['levels'], $mine['levels'], $mine['since']]))->fetchColumn();
      $you = $entry($mine, $ahead + 1);
    }
  }
  hp_send(['total' => $total, 'top' => $top, 'you' => $you]);
}

$level = hp_level($_GET['level'] ?? null);
$rows = hp_q("SELECT b.player_id, b.run_id, b.score, b.steps, b.stars, b.verified, p.name
  FROM hp_best b JOIN hp_players p ON p.id = b.player_id
  WHERE b.level_id = ? AND b.level_fp = ? AND " . hp_visible($meId) . "
  ORDER BY b.score DESC, b.steps ASC, b.run_id ASC LIMIT $limit", [$level['id'], $level['fp']])->fetchAll();
$top = []; foreach ($rows as $i => $r) $top[] = hp_entry($r, $i + 1, $meId);
$you = null;
if ($meId !== null && !array_filter($top, fn($e) => $e['you'])) {
  $mine = hp_q('SELECT b.player_id, b.run_id, b.score, b.steps, b.stars, b.verified, p.name FROM hp_best b JOIN hp_players p ON p.id = b.player_id
    WHERE b.level_id = ? AND b.player_id = ? AND b.level_fp = ?', [$level['id'], $meId, $level['fp']])->fetch();
  if ($mine) $you = hp_entry($mine, hp_rank($level['id'], $level['fp'], $mine, $meId), $meId);
}
hp_send(['level' => $level['id'], 'total' => hp_board_size($level['id'], $level['fp'], $meId), 'top' => $top, 'you' => $you]);
