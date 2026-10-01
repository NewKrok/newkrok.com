# Hitch & Park leaderboard API

PHP 7.4+ and MySQL 5.7+ / MariaDB 10.2+, deployed with the rest of the site
(everything under `public/` lands in the web root). The game talks to it on
`/api/hitch-park/`.

## How it fits together

1. **Start** (`start.php`): when a level starts the game gets a signed run
   token with the server's time.
2. **Submit** (`submit.php`): after parking the game sends the claimed result
   and the **replay** (every input, one per 1/60 s physics step). The server
   checks the claim is possible (score formula, par, replay length, a run
   token at least as old as the run, single use) and keeps it if it beats the
   player's best on that level.
3. **Check** (`verify.php`, every 15 minutes): the GitHub Action
   `.github/workflows/hitch-park-verify.yml` replays the waiting runs with the
   game's own physics (`games/hitch-park/scripts/verify-runs.js`). **The
   replay's result is the one that counts**: a run that parks is kept with the
   time and score the replay gives (cut at the moment it parks, or finished
   with up to 3 s of braking), marked `adjusted` when that differs from the
   claim; a run that never parks, or that is another player's verified run
   again (compared on the inputs that really drove it), is rejected. The
   player is told about adjusted and rejected runs the next time the game
   starts (`notices.php`).
4. **Boards** (`board.php`) list verified runs only; players see their own
   run straight away, marked as waiting for the check.

The physics is bit-for-bit deterministic on every JavaScript engine because
`games/hitch-park/src/detmath.js` replaces the engine's `Math.sin`, `cos`,
… with versions built from basic arithmetic.

A board belongs to a level's **fingerprint** (`levelFingerprint()` in
`src/run.js`): changing a level's layout, or bumping `SIM_VERSION` after a
physics or tuning change, starts that level's board afresh. Old runs stay in
the database.

## Setup (once)

1. Create a MySQL database and user in the hosting panel.
2. Import `schema.sql` (phpMyAdmin → Import).
3. Copy `config.sample.php` to `config.php` **on the server** next to it
   (it is git-ignored and the deploy never touches it) and fill in the
   database details and two long random secrets:
   `php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"`
4. In GitHub → Settings → Secrets and variables → Actions add
   `LB_API` = `https://newkrok.com/api/hitch-park` and
   `LB_VERIFY_TOKEN` = the `verify_token` from `config.php`.
5. Check: `https://newkrok.com/api/hitch-park/board.php?scope=total` answers
   `{"total":0,…}`; run the "Hitch & Park leaderboard check" workflow by hand.

GitHub pauses scheduled workflows after 60 days without a commit to the
repository; re-enable it on the Actions tab if that happens.

## Moderation

No admin page; in phpMyAdmin:

- Hide a player everywhere: `UPDATE hp_players SET banned = 1 WHERE name = '…';`
- Free a name: rename or delete the row in `hp_players`.
- Why runs were rejected: `SELECT level_id, browser, reason, COUNT(*) FROM hp_runs WHERE status = 2 GROUP BY 1, 2, 3;`
- Runs the check had to correct: `SELECT browser, COUNT(*) FROM hp_runs WHERE adjusted = 1 GROUP BY 1;`
  Many of those from one browser point to a determinism gap in that engine
  rather than to cheating.

## Local development

```sh
# a database with schema.sql imported, then a config outside the repo:
HP_CONFIG=/path/to/dev-config.php php -S 127.0.0.1:5312 -t public
# dev-config.php may set 'levels_file' => the output of
#   npm run leaderboard-levels --workspace=games/hitch-park
cd games/hitch-park && VITE_LB_API=/api/hitch-park npm run dev   # proxies /api to :5312
LB_API=http://127.0.0.1:5312/api/hitch-park LB_VERIFY_TOKEN=… npm run verify-runs
```

Without `VITE_LB_API` the dev server does not talk to a leaderboard at all.
