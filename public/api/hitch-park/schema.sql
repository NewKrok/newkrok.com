-- Hitch & Park leaderboard. Import once (phpMyAdmin → Import, or
-- mysql -u USER -p DB < schema.sql). MySQL 5.7+ / MariaDB 10.2+.

CREATE TABLE IF NOT EXISTS hp_players (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(16) NOT NULL,
  name_key VARCHAR(64) NOT NULL,          -- folded name: no case, accents, spaces or leet digits
  token_hash CHAR(64) NOT NULL,           -- sha256 of the player's secret token
  banned TINYINT NOT NULL DEFAULT 0,      -- 1: hidden from every board, submissions refused
  created_at DATETIME NOT NULL,
  UNIQUE KEY uq_name (name_key),
  UNIQUE KEY uq_token (token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Every run that improved its player's best on a level (others are not kept).
CREATE TABLE IF NOT EXISTS hp_runs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  player_id INT UNSIGNED NOT NULL,
  level_id VARCHAR(32) NOT NULL,
  level_fp CHAR(16) NOT NULL,             -- level fingerprint the run was set on
  score INT NOT NULL,
  steps INT NOT NULL,                     -- physics steps (1/60 s)
  stars TINYINT NOT NULL,
  hits SMALLINT NOT NULL,
  crashes SMALLINT NOT NULL,
  cones SMALLINT NOT NULL,
  replay MEDIUMTEXT NOT NULL,
  replay_hash CHAR(64) NOT NULL,
  status TINYINT NOT NULL DEFAULT 0,      -- 0 waiting for the replay check, 1 verified, 2 rejected
  reason VARCHAR(64) NULL,                -- why it was rejected
  browser VARCHAR(16) NULL,
  created_at DATETIME NOT NULL,
  verified_at DATETIME NULL,
  UNIQUE KEY uq_replay (level_id, replay_hash),
  KEY k_status (status, id),
  KEY k_player_level (player_id, level_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Each player's best (not rejected) run per level: what the boards list.
CREATE TABLE IF NOT EXISTS hp_best (
  level_id VARCHAR(32) NOT NULL,
  player_id INT UNSIGNED NOT NULL,
  level_fp CHAR(16) NOT NULL,
  run_id INT UNSIGNED NOT NULL,
  score INT NOT NULL,
  steps INT NOT NULL,
  stars TINYINT NOT NULL,
  verified TINYINT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (level_id, player_id),
  KEY k_board (level_id, level_fp, score, steps)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Run tokens already used (purged after a day).
CREATE TABLE IF NOT EXISTS hp_nonces (
  nonce CHAR(32) NOT NULL PRIMARY KEY,
  used_at DATETIME NOT NULL
) ENGINE=InnoDB;

-- Request counters per hashed IP / player and 10-minute window.
CREATE TABLE IF NOT EXISTS hp_rate (
  k CHAR(40) NOT NULL,
  win INT UNSIGNED NOT NULL,
  n INT UNSIGNED NOT NULL,
  PRIMARY KEY (k, win)
) ENGINE=InnoDB;
