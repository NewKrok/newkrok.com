<?php
// ── Hitch & Park leaderboard: shared helpers ────────────────────────────
// Plain PHP 7.4+ with PDO MySQL. The endpoints next to this file include it;
// .htaccess keeps it from being requested directly.
//
// Trust model: the game computes its score, but a submission is only the
// claim. The server checks that the claim is self-consistent and possible
// (replay length, time, score range, a run token issued long enough ago),
// and stores the replay; a scheduled GitHub Action replays it with the
// game's own physics (scripts/verify-runs.js) and rejects what does not
// reproduce the claimed result.

declare(strict_types=1);

// Only ever included; requested on its own it does nothing.
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) { http_response_code(404); exit; }

const HP_DT = 1 / 60;
const HP_MAX_STEPS = 60 * 60 * 20;          // 20 minutes
const HP_MAX_REPLAY = 200000;               // characters of base64
const HP_SCORE = ['base' => 500, 'perSecond' => 10, 'accuracy' => 3, 'bump' => 60, 'crash' => 150, 'cone' => 25];

function hp_config(): array {
  static $cfg = null;
  if ($cfg === null) {
    $file = getenv('HP_CONFIG') ?: __DIR__ . '/config.php';
    if (!is_file($file)) hp_fail(503, 'not_configured');
    $cfg = require $file;
  }
  return $cfg;
}

function hp_db(): PDO {
  static $db = null;
  if ($db === null) {
    $c = hp_config();
    try {
      $db = new PDO($c['db_dsn'], $c['db_user'] ?? null, $c['db_pass'] ?? null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
      ]);
    } catch (PDOException $e) {
      error_log('hitch-park db: ' . $e->getMessage());
      hp_fail(503, 'db_unavailable');
    }
  }
  return $db;
}

function hp_q(string $sql, array $args = []): PDOStatement {
  $st = hp_db()->prepare($sql);
  $st->execute($args);
  return $st;
}

function hp_now(): string { return gmdate('Y-m-d H:i:s'); }

// ── Requests and responses ───────────────────────────────────────────────
function hp_send(array $data, int $status = 200): void {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
function hp_fail(int $status, string $error, array $extra = []): void {
  hp_send(['error' => $error] + $extra, $status);
}

function hp_method(string $m): void {
  if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') hp_send([]);
  if ($_SERVER['REQUEST_METHOD'] !== $m) hp_fail(405, 'method');
}

function hp_body(): array {
  $raw = file_get_contents('php://input', false, null, 0, HP_MAX_REPLAY + 4096);
  $data = json_decode($raw ?: 'null', true);
  if (!is_array($data)) hp_fail(400, 'bad_json');
  return $data;
}

function hp_header(string $name): ?string {
  $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
  return isset($_SERVER[$key]) ? (string)$_SERVER[$key] : null;
}

// ── Rate limiting ────────────────────────────────────────────────────────
// Counts per 10-minute window; the IP is only kept as a salted hash, and
// only for the current and the previous window.
function hp_rate(string $what, string $who, int $max): void {
  $k = sha1($what . '|' . $who . '|' . hp_config()['run_secret']);
  $win = intdiv(time(), 600);
  hp_q('INSERT INTO hp_rate (k, win, n) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE n = n + 1', [$k, $win]);
  $n = (int)hp_q('SELECT n FROM hp_rate WHERE k = ? AND win = ?', [$k, $win])->fetchColumn();
  hp_q('DELETE FROM hp_rate WHERE win < ?', [$win - 1]);   // no counter outlives 20 minutes (privacy page)
  if ($n > $max) hp_fail(429, 'slow_down');
}
function hp_ip(): string { return (string)($_SERVER['REMOTE_ADDR'] ?? ''); }

// ── Players ──────────────────────────────────────────────────────────────
function hp_player(?string $token, bool $required = true): ?array {
  if ($token === null || $token === '' || !preg_match('/^[0-9a-f]{64}$/', $token)) {
    if ($required) hp_fail(401, 'no_player');
    return null;
  }
  $p = hp_q('SELECT id, name, banned FROM hp_players WHERE token_hash = ?', [hash('sha256', $token)])->fetch();
  if (!$p && $required) hp_fail(401, 'no_player');
  return $p ?: null;
}

// Case, accents, spaces, punctuation and look-alike digits folded away, so
// "Kriszti án", "kriszt1an" and "KRISZTIAN" are the same name.
function hp_fold(string $name): string {
  $map = [
    'á' => 'a', 'à' => 'a', 'â' => 'a', 'ä' => 'a', 'ã' => 'a', 'å' => 'a', 'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e',
    'í' => 'i', 'ì' => 'i', 'î' => 'i', 'ï' => 'i', 'ó' => 'o', 'ò' => 'o', 'ô' => 'o', 'ö' => 'o', 'ő' => 'o', 'õ' => 'o', 'ø' => 'o',
    'ú' => 'u', 'ù' => 'u', 'û' => 'u', 'ü' => 'u', 'ű' => 'u', 'ñ' => 'n', 'ç' => 'c', 'ß' => 'ss', 'ý' => 'y',
    '0' => 'o', '1' => 'i', '3' => 'e', '4' => 'a', '5' => 's', '7' => 't', '@' => 'a', '$' => 's',
  ];
  $s = function_exists('mb_strtolower') ? mb_strtolower($name, 'UTF-8') : strtolower($name);
  $s = strtr($s, $map);
  return preg_replace('/[\s._\-]+/u', '', $s);
}

const HP_RUDE = [
  'fuck', 'shit', 'cunt', 'nigg', 'fagg', 'whore', 'bitch', 'rape', 'hitler', 'nazi', 'porn', 'dick', 'pussy', 'penis',
  'kurva', 'geci', 'fasz', 'picsa', 'buzi', 'cigo', 'kocsog', 'baszd', 'bazdmeg', 'anyad',
  'ficken', 'fotze', 'hure', 'wichser', 'puta', 'mierda', 'cabron', 'merde', 'salope', 'putain', 'connard',
];

// Returns [display name, folded key] or fails with the reason.
function hp_check_name($raw): array {
  if (!is_string($raw)) hp_fail(400, 'name_invalid');
  $name = trim(preg_replace('/\s+/u', ' ', $raw) ?? '');
  $len = preg_match_all('/./u', $name);
  if ($len < 3 || $len > 16 || !preg_match('/^[\p{L}\p{N}][\p{L}\p{N} ._\-]*$/u', $name)) hp_fail(400, 'name_invalid');
  $key = hp_fold($name);
  if (strlen($key) < 2) hp_fail(400, 'name_invalid');
  foreach (HP_RUDE as $w) if (strpos($key, $w) !== false) hp_fail(400, 'name_rude');
  foreach (hp_config()['reserved_names'] ?? [] as $r) if ($key === hp_fold($r)) hp_fail(409, 'name_taken');
  return [$name, $key];
}

// ── Levels ───────────────────────────────────────────────────────────────
// Written by the game's build (vite.config.js): id → fingerprint, par, …
function hp_levels(): array {
  static $levels = null;
  if ($levels === null) {
    $file = hp_config()['levels_file'] ?? __DIR__ . '/../../games/hitch-park/leaderboard-levels.json';
    $data = is_file($file) ? json_decode((string)file_get_contents($file), true) : null;
    if (!is_array($data) || !isset($data['levels'])) hp_fail(503, 'no_levels');
    $levels = $data['levels'];
  }
  return $levels;
}
function hp_level($id): array {
  $levels = hp_levels();
  if (!is_string($id) || !isset($levels[$id])) hp_fail(404, 'no_level');
  return $levels[$id] + ['id' => $id];
}

// ── Run tokens ───────────────────────────────────────────────────────────
// Handed out when a level starts: level, server time, nonce, signed. A
// submission must bring one at least as old as the run is long.
function hp_b64url(string $s): string { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }

function hp_run_token(string $level): string {
  $payload = hp_b64url(json_encode(['l' => $level, 't' => time(), 'n' => bin2hex(random_bytes(16))]));
  return $payload . '.' . hp_b64url(hash_hmac('sha256', $payload, hp_config()['run_secret'], true));
}

function hp_check_run_token($token, string $level, int $steps): string {
  if (!is_string($token) || substr_count($token, '.') !== 1) hp_fail(400, 'no_run_token');
  [$payload, $sig] = explode('.', $token);
  $want = hp_b64url(hash_hmac('sha256', $payload, hp_config()['run_secret'], true));
  if (!hash_equals($want, $sig)) hp_fail(400, 'bad_run_token');
  $d = json_decode((string)base64_decode(strtr($payload, '-_', '+/')), true);
  if (!is_array($d) || ($d['l'] ?? null) !== $level) hp_fail(400, 'bad_run_token');
  $age = time() - (int)$d['t'];
  // The clock runs only while driving; pauses and the intro only add to the age.
  if ($age + 3 < $steps * HP_DT) hp_fail(400, 'too_fast');
  if ($age > 6 * 3600) hp_fail(400, 'run_token_expired');
  return (string)$d['n'];
}

// ── Replays ──────────────────────────────────────────────────────────────
// Same format as run.js: base64 of 4-byte runs (count, throttle + 64,
// steer + 64, flags). Returns the number of steps, or fails.
function hp_replay_steps($replay): int {
  if (!is_string($replay) || $replay === '' || strlen($replay) > HP_MAX_REPLAY || strlen($replay) % 4) hp_fail(400, 'bad_replay');
  $bytes = base64_decode($replay, true);
  if ($bytes === false || strlen($bytes) % 4) hp_fail(400, 'bad_replay');
  $steps = 0;
  for ($i = 0, $n = strlen($bytes); $i < $n; $i += 4) {
    $c = ord($bytes[$i]);
    if ($c === 0 || ord($bytes[$i + 1]) > 128 || ord($bytes[$i + 2]) > 128 || ord($bytes[$i + 3]) > 3) hp_fail(400, 'bad_replay');
    $steps += $c;
  }
  return $steps;
}

// The claimed result must be one the scoring can produce: same formula as
// scoreRun() in run.js, with the accuracy bonus (0–300) the only unknown.
function hp_check_claim(array $level, int $steps, int $score, int $stars, int $hits, int $crashes, int $cones): void {
  if ($steps < (int)$level['minSteps'] || $steps > HP_MAX_STEPS) hp_fail(400, 'bad_claim');
  if ($hits < 0 || $crashes < 0 || $cones < 0 || $hits + $crashes + $cones > 5000) hp_fail(400, 'bad_claim');
  $time = $steps * HP_DT;
  $par = (float)$level['par'];
  $timeBonus = max(0, (int)round(($par - $time) * HP_SCORE['perSecond']));
  $penalty = $hits * HP_SCORE['bump'] + $crashes * HP_SCORE['crash'] + $cones * HP_SCORE['cone'];
  $lo = max(0, HP_SCORE['base'] + $timeBonus - $penalty);
  $hi = max(0, HP_SCORE['base'] + $timeBonus + 100 * HP_SCORE['accuracy'] - $penalty);
  if ($score < $lo - 1 || $score > $hi + 1) hp_fail(400, 'bad_claim');
  $wantStars = 1 + ($hits + $crashes === 0 ? 1 : 0) + ($time <= $par ? 1 : 0);
  if ($stars !== $wantStars) hp_fail(400, 'bad_claim');
}

// ── Boards ───────────────────────────────────────────────────────────────
// Order: score, then the quicker run, then whoever set it first.
const HP_AHEAD = '(b.score > ? OR (b.score = ? AND (b.steps < ? OR (b.steps = ? AND b.run_id < ?))))';

// Who is listed: verified runs of players in good standing, plus the
// viewer's own run while it waits for the check (so a forged run is never
// shown to anyone else).
function hp_visible(?int $meId): string {
  return 'p.banned = 0 AND (b.verified = 1 OR b.player_id = ' . ($meId ?? 0) . ')';
}

function hp_rank(string $levelId, string $fp, array $row, ?int $meId): int {
  $args = [$levelId, $fp, $row['score'], $row['score'], $row['steps'], $row['steps'], $row['run_id']];
  return 1 + (int)hp_q('SELECT COUNT(*) FROM hp_best b JOIN hp_players p ON p.id = b.player_id
    WHERE b.level_id = ? AND b.level_fp = ? AND ' . hp_visible($meId) . ' AND ' . HP_AHEAD, $args)->fetchColumn();
}

function hp_board_size(string $levelId, string $fp, ?int $meId): int {
  return (int)hp_q('SELECT COUNT(*) FROM hp_best b JOIN hp_players p ON p.id = b.player_id
    WHERE b.level_id = ? AND b.level_fp = ? AND ' . hp_visible($meId), [$levelId, $fp])->fetchColumn();
}

function hp_entry(array $r, int $rank, ?int $me): array {
  return [
    'rank' => $rank, 'name' => $r['name'], 'score' => (int)$r['score'], 'steps' => (int)$r['steps'],
    'stars' => (int)$r['stars'], 'verified' => (bool)$r['verified'], 'you' => $me !== null && (int)$r['player_id'] === $me,
  ];
}

// After a check: the player's best becomes their best run left on the
// level's current fingerprint (with checked results), or nothing.
function hp_rebuild_best(int $playerId, string $levelId): void {
  hp_q('DELETE FROM hp_best WHERE level_id = ? AND player_id = ?', [$levelId, $playerId]);
  $levels = hp_levels();
  if (!isset($levels[$levelId])) return;
  // Verified results first among equals: a claim still waiting for its
  // check never pushes a checked run of the same score aside.
  $r = hp_q('SELECT id, level_fp, score, steps, stars, status, created_at FROM hp_runs
    WHERE player_id = ? AND level_id = ? AND level_fp = ? AND status <> 2
    ORDER BY score DESC, steps ASC, status DESC, id ASC LIMIT 1', [$playerId, $levelId, $levels[$levelId]['fp']])->fetch();
  if ($r) hp_q('INSERT INTO hp_best (level_id, player_id, level_fp, run_id, score, steps, stars, verified, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [$levelId, $playerId, $r['level_fp'], $r['id'], $r['score'], $r['steps'], $r['stars'], (int)$r['status'] === 1 ? 1 : 0, $r['created_at']]);
}
