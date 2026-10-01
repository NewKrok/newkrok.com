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
5. **Ghosts** (`ghost.php`): the game can drive a recorded run again beside
   the player on a sim of its own: the level's record (best verified run),
   or any run by id from a "Challenge a friend" link
   (`https://newkrok.com/gamer-zone/hitch-park?ghost=<run id>-<HMAC>`, signed
   so runs cannot be listed by counting ids; the site
   passes the query on to the game's iframe). The player's own best ghost
   stays in the browser.

The physics is bit-for-bit deterministic on every JavaScript engine because
`games/hitch-park/src/detmath.js` replaces the engine's `Math.sin`, `cos`,
… with versions built from basic arithmetic.

A board belongs to a level's **fingerprint** (`levelFingerprint()` in
`src/run.js`): changing a level's layout, or bumping `SIM_VERSION` after a
physics or tuning change, starts that level's board afresh. Old runs stay in
the database.

## Setup

Done once (2026-10-01): database and user `xtozeqfm_hitchpark` on the
cPanel host (MariaDB, `localhost`), and these repository secrets:

| Secret | What |
| --- | --- |
| `LB_DB_NAME`, `LB_DB_USER`, `LB_DB_PASS` | the database |
| `LB_RUN_SECRET` | signs the run tokens |
| `LB_VERIFY_TOKEN` | lets the replay check and the deploy call `verify.php` / `install.php` |
| `LB_API` | `https://newkrok.com/api/hitch-park`, for the replay check |

Every deploy (`.github/workflows/prod-ci.yml`) writes `config.php` into the
build from the secrets (`scripts/write-lb-config.js`; `.htaccess` keeps it
from being served), uploads it, then calls `install.php`, which creates any
missing table from `schema.sql`. A new column on an existing table needs an
`ALTER TABLE` by hand (phpMyAdmin). To rotate a secret, change it in GitHub
and redeploy.

Check: `https://newkrok.com/api/hitch-park/board.php?scope=total` answers
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
