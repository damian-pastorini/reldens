# E2E Testing Guide

Playwright end-to-end suite under `tests/e2e/`. It boots a real Reldens server against a real database and
drives the real client in a browser.

## Commands

```bash
npm run test:e2e
# wipes test-results/ first
npm run test:e2e:clean
# slowMo 400ms and longer waits, for watchable videos
npm run test:e2e:long
npm run test:e2e:long:clean
```

Flags accepted by `tests/e2e/run-tests.js`:

- `--long` - slow motion plus scaled timeouts (also via `LONG_RUN=1`)
- `--filter=<text>` - passed to Playwright as a quoted `--grep`, so a filter with spaces works (`"--filter=Combat System"`)
- `--port=<port>` - overrides the port from `tests/config.json`; when the port is busy the runner logs a warning and
  tries the next one, up to 5 ports, and stops with a critical log when all of them are busy
- `--clean-output` - removes `test-results/` before the run
- `--db-reset=<dbName>` - drops every table and rebuilds the database from `migrations/production` before the run;
  the value must match `dbName` in `tests/config.json` (`--db-reset=reldens_local`), otherwise the run stops without
  touching the database, so a wrong `dbName` can never drop another database
- `--max-failures=<n>` - overrides the stop-on-failure limit
- `--all` - runs every test regardless of failures

## Stop on first failure

`maxFailures` defaults to `1` (`tests/e2e/playwright.config.js`), so the run aborts on the first failing test
instead of burning the whole suite on one upstream break. Override with `RELDENS_E2E_MAX_FAILURES` or `--all`.

## Database

The suite uses its OWN database, `reldens_local`, declared in `tests/config.json`. This is deliberate: it keeps
the e2e run from touching the branch database named in `app/.env`. `collect-game-data.js` calls
`DatabaseEnvVarsExporter.apply(config)`, so the values in `tests/config.json` override the app `.env` for the
whole run.

Do NOT point `tests/config.json` at the branch database.

`--db-reset` rebuilds the e2e database from scratch on every run, so each run starts from the same content:
`DatabaseResetUtility` (`tests/database-reset-utility.js`) drops every table of the configured database with
`tests/fixtures/database-drop-tables.sql`, then runs the production scripts from `migrations/production`:
`reldens-install-v4.0.0.sql`, `reldens-basic-config-v4.0.0.sql` and `reldens-sample-data-v4.0.0.sql`. The
self-hosted integration tests (`npm run test:default`) run the same drop and install before the basic config and
`migrations/development/reldens-test-sample-data-v4.0.0.sql`. Tables or columns left by an older schema never
survive a reset.

### Required accounts

The sample data must contain the three users the specs log in as: `root`, `root2` and `root3`, with players
`ImRoot`, `ImRoot2` and `ImRoot3`. The setup logs `[collect-game-data] User not found: root2` and snapshots
fewer than 3 players when they are missing. Every multi-player spec (global, private and cross-player chat,
teams, trading, double login) then fails waiting for `#player-selection:not(.hidden)`, which reads as a chat or
trading bug but is really a missing account.

## App under test

`tests/config.json` `serverPath` points at the app folder (a sibling `app/` checkout). The server is booted in
process by the Playwright `globalSetup` (`tests/e2e/collect-game-data.js`) and the browser loads that app's
`dist/index.html`.

If `dist/index.html` still references `src="./index.js"` the client was never bundled, so `window.reldens`
never exists and every spec times out after 10 seconds waiting for it. `ClientBundleCheck.isMissing()` detects
this and the setup enables the bundler for that run; the bundle step adds about a minute before the first test.

## Security state between tests

The page fixture calls `/api/e2e/reset-players` before every test (`PlayerReset.resetAll()`), and that endpoint runs
`SecurityState.resetAll()` (`tests/e2e/helpers/security-state.js`) before restoring the players, so the limits, the
lockouts and the blocks left by one spec never reach the next one:

- restores the login attempts maximum, the registration and guests limits per address and the game login joins limit
  (also on the created rooms) captured on the startup
- clears the in memory login attempts, joins and creation counters
- restores the status of the accounts banned by a spec
- lifts the deny list: restores the address lists switch, deletes every `ip_lists` row and rebuilds the lists
- clears the `password_reset_sent_at` of the accounts marked by a spec and of the accounts that received an email from
  the test mailer; the three e2e accounts are queued on the startup, so the first reset also clears the times left by
  a previous run on the same database
- restores the real mailer state captured on the startup and clears the emails recorded by the test sender

The security specs (`test-login-security.spec.js`, `test-admin-security.spec.js`) drive the server state through the
`/api/e2e/security/*` endpoints, wrapped by `tests/e2e/helpers/security-api.js`:

- `POST settings` - lowers the limits a spec needs to reach quickly
- `POST ban-user` - bans an account by username
- `POST deny-addresses` - stores `deny` rows for the given addresses, enables the lists and lifts them after
  `durationMs`, since the browser runs on the same address as the specs
- `GET stored-blocks` and `POST restore-blocks` - lists the stored temporary address blocks and restores them into a
  cleared login attempts registry, which is what a restart does
- `POST mark-reset-sent` and `GET reset-sent-time` - store and read the last reset password email time of a user
- `POST mailer` (`{enabled}`) and `GET sent-emails` - switch the running server mailer on with a test sender that only
  records the emails (never a real one), or off, and read the recorded emails; the forgot password specs cover the
  mailer off (form hidden), on inside the interval (same answer, nothing sent) and on outside the interval (one email),
  so they never depend on the `RELDENS_MAILER_*` values of the app `.env`

The server runs on `localhost`, which turns on the development mode of `AppServerFactory`, so the administration
panel login limiter allows 10 times `RELDENS_ADMIN_LOGIN_MAX_ATTEMPTS`; the limiter spec reads the real limit from the
`RateLimit` response header. See `.claude/ip-lists-and-login-blocks.md` for the lists and blocks flow.

## Forest navigation and moving objects

The forest specs start in `reldens-forest-level-1` (`Login.loginAndEnterForest`), entering at its default return
point near the bottom of a 72x100 tiles map, so the rocks and the fishing spots are a whole map crossing away: those
specs walk with `TimeConstants.MAP_CROSSING` instead of `TimeConstants.NAVIGATION`.

`ObjectChase.moveToObjectWithinRange` (`tests/e2e/helpers/object-chase.js`, also `moveToEnemyWithinRange`) returns
the key of the reached object instance, or false:

- picks the closest matching instance to the player and locks it, then reads its position again on every step, from
  the synced server body (`room.state.bodies`) when the object has a body state, so the moving NPCs and enemies are
  followed; when the locked instance is gone (dead or disabled) it picks the closest one again
- sends path finder moves (`{act: 'mp', column, row}`, `Navigation.moveToWorldPoint`) to the walkable tile inside the
  range nearest to the player side (`PhaserRange.approachOffsets` and `PhaserRange.filterWalkableOffsets`, which apply
  the server path finder rule on the client map: a tile on a `collisions` or `change-points` layer blocks, an empty
  tile on a `pathfinder` layer blocks), and sends it again when that tile changes or the player reached the last sent
  point; this is what reaches the fishing spot, its own tile is a lake collision
- when the player does not move for `STUCK_MS` (4 seconds) it walks one walkable tile in a different direction (the
  four directions rotate on every stuck) and the chase starts again
- a target closer than `CONTACT_DISTANCE` (40px) is reached even for a smaller range: the 25px player body and a 32px
  object body touch at about 29 to 36px and can not get any closer
- every move goes through the path finder, which treats the change points as unwalkable (`P2world.markPathFinderTile`
  for the map layer ones, `StorageChangePointsCreator.markPositionAsChangePoint` for the stored ones), so a stuck player
  never walks into a room exit; raw arrow key steps would (the forest level 1 entry is two tiles above the town exit)
- once in range it sends a move to the player own tile, which ends the path, and waits for the player to stand still
  (`PhaserRange.waitForPlayerToStandStill`), because the timing objects (`cancelOnMove`) cancel on any position change

The callers interact with the returned instance key (`Phaser.triggerObjectInteraction`), so the mining rock clicked is
the one the player reached, and `Phaser.targetEnemy` already targets the closest visible enemy.

`RoomObjectsState` (`tests/e2e/helpers/room-objects-state.js`, registered by `collect-game-data.js`) exposes the live
scene rooms to the specs, wrapped by `tests/e2e/helpers/room-objects-api.js`:

- `GET /api/e2e/room-objects?roomName=` - every room object with a body state: key, asset key, type, position,
  velocity, the bodies in contact with it, the current tile (`currentCol`, `currentRow`), the original tile
  (`originalCol`, `originalRow`), the destination tile and the steps of the path it follows, state, the players in
  battle with it, `isAggressive` and the random movement `maxTiles` and `maxDelay`
- `POST /api/e2e/room-objects/disable-enemies` (`{roomName, onlyAggressive}`) - stops every enemy of the room (or only
  the aggressive ones with `onlyAggressive: true`) until the next players reset: no path, no battle, no collision
  response, affected property 0 (so the aggression and the hits never start a battle) and the `DISABLED` state (so the
  body is not integrated and the random movement never moves it)
- `POST /api/e2e/room-objects/enemy-attack` (`{roomName, playerName, assetKey}`) - restores one enemy of that asset
  key, places it 40px from the player on a walkable tile (inside the 50px `attackShort` range, out of contact with the
  25px player body) and starts its battle with the player
- `POST /api/e2e/room-objects/player-affected-property` (`{roomName, playerName, value}`) - sets the affected property
  (`client/actions/skills/affectedProperty`, the hp) of the live player to that value, saves the stats and sends them to
  the player client (`RoomScene.savePlayerStats`)

`TimingObjectSession` (`tests/e2e/helpers/timing-object-session.js`) holds the shared steps of the chest, mining and
fishing specs: enter the forest with its enemies disabled, reach the closest instance, read the reward quantity from
the inventory, record the `timingStart`, `timingCancel` and `timingComplete` messages and start a timing on the
reached instance.

The game data (`collect-game-data.js`) adds per room object `layerName`, `tileIndex`, `childObjectType`,
`isAggressive`, `interactionRadio`, `randomMovementTiles` and the `respawnAreas` list (class type 7), read through
`BaseE2eTest.loadGameData`, `BaseE2eTest.loadPlayerRoomObjects` and `BaseE2eTest.loadPlayerRoomEntries`:

- `test-npc.spec.js` - the town NPCs wander inside their area (synced bodies sampled with
  `PhaserRange.collectPositionRanges` and checked with `PhaserRange.summarizeMovement`), and a moving NPC still opens
  its dialogue after it left its spawn tile
- `test-objects-movement.spec.js` - the aggressive and the passive forest enemies wander inside their own area: the
  server snapshots are sampled every 250ms for 30 seconds (`EnemiesWanderSummary`,
  `tests/e2e/helpers/enemies-wander-summary.js`), the enemies that were in battle at any sample are left out, and for
  the others every destination tile must be at most `maxTiles` columns and rows from the original tile, a rest outside
  the area (pushed by another body) must end within `maxDelay` and a path blocked on the same tile must be dropped
  within two moves (`2 * maxDelay`); every invalid enemy is reported with its whole trail (tile, original tile,
  position, velocity, path, contacts and battle per sample); the objects without random movement keep their
  position, and a passive enemy does not attack a player standing 3 to 4 tiles away from it (the aggressive enemies
  are disabled with `onlyAggressive`, the closest active passive enemy is read from the server snapshot and the player
  walks with `ObjectChase.moveToPointWithinRange`)
- `test-interactive-objects.spec.js` - the chest, the mining rock and the fishing spot with the forest enemies disabled
- `test-timing-objects-cancel.spec.js` - the mining is cancelled and gives no reward when the player moves, when an
  enemy hits the player (placed by `enemy-attack`) and when another player hits the player (`attackShort` sent by
  `ImRoot2` standing next to the miner); the hit cases also check the player HP went down and the position did not
  change, so the cancel comes from `cancelOnHit` and not from `cancelOnMove`
- `test-combat.spec.js` and `test-movement.spec.js` - the death and revive and the return point after death:
  `TestCombatDeath.killPlayerWithEnemyAttack` sets the player hp to 1 (`player-affected-property`) and places a Tree
  next to the player with its battle started (`enemy-attack`), so the death comes from one real enemy hit

`RoomEnemiesReset` (run by the player reset before every test) resets the path of every respawned body
(`resetAuto`), as `EnemyObject.respawn` does, otherwise a body moved to a new respawn tile keeps walking its old random
path.

## Browser binaries

The Playwright version in `package.json` pins a chromium revision (`node_modules/playwright-core/browsers.json`).
When the matching build is not installed every test fails instantly with
`browserType.launch: Executable doesn't exist`. Install it with `npx playwright install chromium`, or point
`PLAYWRIGHT_BROWSER_EXECUTABLE` at an installed chromium executable.

The config launches the `chromium` channel (the full Chromium build in the new headless mode) instead of the
`chrome-headless-shell` build: with the headless shell the administration login button never passed the Playwright
stable check within the 1 second action timeout.

## Outputs

Written under `test-results/` (gitignored):

- `videos/<test-title-slug>.webm` - one per test, plus `-player2` for two-page specs
- `screenshots/<test-title-slug>/` - numbered captures taken by the specs
- `console-<Y-m-d-H-i-s>.log` - the whole output of a run when it is started with
  `> "<branch>/reldens/test-results/console-$(date +%Y-%m-%d-%H-%M-%S).log" 2>&1`, follow it with `tail -f`
- `server.log` - the console output of the Playwright main process, where the game server runs: the server log lines,
  the framework output (Colyseus included) and any uncaught exception
- `tests.log` - the console output of the test worker, which also receives the game server log lines written while
  the specs run
- `playwright/test-<spec>-<hash>-<title>/` - only created for failures, holds `error-context.md` and
  `test-failed-1.png`; Playwright empties its `test-results/playwright/` output folder when a run starts, so the logs
  above are kept

An uncaught exception in the game server makes Colyseus shut it down and exit the run: the stack is written to
`server.log` and to the run output, and the reporter prints the `Run aborted` line with the test it stopped at.

The manual verification pages in `.claude/tests-guide/` link these videos with a relative path, so they only
resolve when the guide is opened from the same working copy that produced the run.

## Reading a failure

Start with `test-results/playwright/test-*/error-context.md`: it names the spec, the failing call and the page snapshot
at that moment. Then check `test-results/tests.log` and `test-results/server.log` for the server side of the same
timestamp. A timeout on
`#player-selection:not(.hidden)` means login never completed; a timeout on `window.reldens` means the client
bundle never initialized.
