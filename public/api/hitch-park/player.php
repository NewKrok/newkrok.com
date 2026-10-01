<?php
// POST {name, token?} → {name, token}
// Without a token: a new player with that name (the token is the player's
// only key, kept by the game). With one: renames that player.
require __DIR__ . '/lib.php';
hp_method('POST');
$in = hp_body();
hp_rate('player', hp_ip(), 20);
[$name, $key] = hp_check_name($in['name'] ?? null);

$me = hp_player(isset($in['token']) ? (string)$in['token'] : null, false);
$taken = hp_q('SELECT id FROM hp_players WHERE name_key = ?', [$key])->fetchColumn();
if ($taken && (!$me || (int)$taken !== (int)$me['id'])) hp_fail(409, 'name_taken');

try {
  if ($me) {
    if ((int)$me['banned']) hp_fail(403, 'banned');
    hp_q('UPDATE hp_players SET name = ?, name_key = ? WHERE id = ?', [$name, $key, $me['id']]);
    hp_send(['name' => $name, 'token' => (string)$in['token']]);
  }
  $token = bin2hex(random_bytes(32));
  hp_q('INSERT INTO hp_players (name, name_key, token_hash, created_at) VALUES (?, ?, ?, ?)', [$name, $key, hash('sha256', $token), hp_now()]);
  hp_send(['name' => $name, 'token' => $token]);
} catch (PDOException $e) {
  if ($e->getCode() === '23000') hp_fail(409, 'name_taken');   // the same name, a moment earlier
  throw $e;
}
