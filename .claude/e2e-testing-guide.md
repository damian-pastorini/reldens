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
- `--filter=<text>` - passed to Playwright as a quoted `--grep`, so a filter with spaces works (`"--filter=Combat System"`),
  with `--no-deps`, so filtering a spec of the exclusive group does not run the other groups first
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
instead of burning the whole suite on one upstream break. Never override it with `RELDENS_E2E_MAX_FAILURES`,
`--max-failures` or `--all` when running the suite: fix the failing case first, then run the suite again.

## Database

The suite uses its OWN database, `reldens_local`, declared in `tests/config.json`. This is deliberate: it keeps
the e2e run from touching the app database named in the app `.env`. `collect-game-data.js` calls
`DatabaseEnvVarsExporter.apply(config)`, so the values in `tests/config.json` override the app `.env` for the
whole run.

Do NOT point `tests/config.json` at the app database.

`--db-reset` rebuilds the e2e database from scratch on every run, so each run starts from the same content:
`DatabaseResetUtility` (`tests/database-reset-utility.js`) drops every table of the configured database with
`tests/fixtures/database-drop-tables.sql`, then runs the production scripts from `migrations/production`:
`reldens-install-v4.0.0.sql`, `reldens-basic-config-v4.0.0.sql` and `reldens-sample-data-v4.0.0.sql`. The
self-hosted integration tests (`npm run test:default`) run the same drop and install before the basic config and
`migrations/development/reldens-test-sample-data-v4.0.0.sql`. Tables or columns left by an older schema never
survive a reset.

### Required accounts

The sample data must contain the three users the specs log in as: `root`, `root2` and `root3`, with players
`ImRoot`, `ImRoot2` and `ImRoot3`; the users of the other parallel spec groups (`root4` to `root9`) are created from
them on the setup. The players snapshots used by the reset are taken for all 9 users
(`PlayerStateReset.captureSnapshots`, `tests/e2e/helpers/player-state-reset.js`), while `game-data.json` only collects
the 3 base players (`CollectGameData.buildPlayersData`). When a base user is missing the setup logs
`[collect-game-data] User not found: root2` and `[test-data-setup] Base user not found: root2`, its copies in the
other users sets are not created and fewer players are snapshotted. Every multi-player spec (global, private and
cross-player chat, teams, trading, double login) then fails waiting for `#player-selection:not(.hidden)`, which reads
as a chat or trading bug but is really a missing account.

## App under test

The suite runs against its OWN app instance, never a shared project (like a demo or a development project): its
`.env`, `generated-entities/` and theme are the ones the server reads.

`tests/config.json` is local and gitignored, create it from `tests/config.json.dist`. Its `serverPath` defaults to
`../app`, a project next to the Reldens checkout. A relative `serverPath` is resolved from the folder the tests
run in (`tests/server-path-resolver.js`), an absolute path is used as it is.

The `serverPath` project is a regular Reldens project with `reldens` installed from the checkout (a `file:` dependency
with the relative path to the checkout in its `package.json`), so the run uses the checkout code. Its `.env` must use
the storage driver its `generated-entities/` were generated for (`RELDENS_STORAGE_DRIVER=knex` by default, refresh
them with `npm exec -- reldens generateEntities --override` from that project root after a driver change).

The server is booted in process by the Playwright `globalSetup` (`tests/e2e/collect-game-data.js`) and the browser
loads that app's `dist/index.html`. When `serverPath` does not exist the setup logs
`[collect-game-data] serverPath not found` and skips the server startup.

If `dist/index.html` still references `src="./index.js"` the client was never bundled, so `window.reldens`
never exists and every spec times out after 10 seconds waiting for it. `ClientBundleCheck.isMissing()` detects
this, and `ClientBundleCheck.isOutdated()` detects a bundle older than any client source of the checkout (a `lib` js
file outside a `server` folder changed after `dist/index.html` was built), so a client fix is always tested; in both
cases the setup enables the bundler for that run, which adds about a minute before the first test.

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
  the test mailer; every e2e account of every users set (`root` to `root9`) is queued on the startup, so the first
  reset also clears the times left by a previous run on the same database
- restores the real mailer state captured on the startup and clears the emails recorded by the test sender

The global teardown (`tests/e2e/server-teardown.js`) runs the same `SecurityState.resetAll()` before it shuts the
server down, so a ban or a deny list left by the last test of a run never reaches the next run on the same database.

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

## Deterministic room setup

Every spec that needs a player next to an object builds that state on the server after the login, instead of walking
the player to wherever the random movement left the objects: the rooms are created with the objects in random places,
the spec sends one setup request that stops the random movement of the object it needs and places the bodies on exact
positions, and the case starts from known values. Never chase a moving object across the map in a spec: a path through
a body the path finder grid does not know (a tree, another object) blocks the player and the case fails by chance.

- `POST /api/e2e/room-objects/place-enemy` (`{roomName, sessionId, enemyKey, enemyLife}`,
  `tests/e2e/helpers/room-enemy-placement.js`) - restores the first enemy of that key or asset key, stops its random
  movement, places it on the first walkable position 40px from the player (inside the 50px `attackShort` range, out of
  contact with the 25px player body) and, with `enemyLife`, sets its life so a single hit kills it; it returns the
  enemy key, its body state key (`bodyKey`, the client `objectsAnimations` and `room.state.bodies` key), the exact
  position and the experience its stored rewards give on its death
- `RoomObjectsApi.placeAndTargetEnemy` waits until the client body state of `bodyKey` is exactly on the placed position
  and targets that exact body, so the combat specs (`test-combat.spec.js`), the XP spec (`test-stats.spec.js`, the XP
  after the kill must equal the XP before plus the returned experience) and the passive enemy spec
  (`test-objects-movement.spec.js`) never chase an enemy
- `POST /api/e2e/room-objects/place-player-next-to-object` (`{roomName, sessionId, objectKey}`,
  `tests/e2e/helpers/room-player-placement.js`) - stops the random movement of the first object of that key or asset
  key (any object with a physics body, with or without a body state, so the chest is found too) and places the player
  on the center of the closest walkable tile around the object tile that does not overlap any colliding body of the
  room (the object, the objects next to it and the other players) except the player itself (closest distance first,
  then the lowest row and column, so the same room always gives the same tile);
  `RoomObjectsApi.placePlayerNextToObject` waits until the client player state is exactly on the placed position, and
  the NPC, trader, chest, mining rock and fishing spot specs interact with the returned `bodyKey`
- the moved NPC case places the NPC with `RoomMovementApi.placeObject` on the closest walkable tile of its spawn tile
  (it keeps its original tile) instead of waiting for a random wander
- the town movement specs (`test-movement.spec.js` and both pathfinding specs, through
  `MovementScenario.pauseMovingObjects`) stop every moving NPC and trader of the room and place it back on its spawn
  tile, so the walks, the routes and the blocked targets always run on the same room layout

Both placements receive the client `sessionId` (`room.sessionId`) and move that exact player schema
(`RoomObjectsState.findPlayer`), never the first player found by name, so a body left by another session of the same
user can never take the placement.

The players reset before every test (`/api/e2e/reset-players`, with the group of the test) first waits until no scene
room holds a player of that group (`PlayerStateReset.waitForTestPlayersToLeave`: the closed page of the previous test
leaves, the room saves the player and removes it), so no previous session stays in a room the next test uses or
overwrites the restored state; then it restores the stats, the inventory and the state of the group players (placed
on the default return point of the group start room), and the enemies and the random movement stopped by a setup
request (`RoomEnemiesReset.restoreAll`, `RoomMovementState.restoreRandomMovement`) only in the group rooms.

## Parallel spec groups

The specs run in groups (`tests/e2e/helpers/parallel-spec-groups.js`), every group is a Playwright project with one
worker, so its specs run one after the other, and the groups run at the same time:

- `world` - the town specs that need the town layout (NPCs, player and object pathfinding), users set 0 (`root`,
  `root2`, `root3`), start room `reldens-new-age-town`
- `forest` - combat, stats, interactive objects, timing objects, objects movement and animation frames, users set 1
  (`root4` to `root6`), start room `reldens-forest-level-1`
- `social` - chat, teams, clans, trading, items, rewards, quests and the game login flow, users set 2 (`root7` to
  `root9`), start room `reldens-new-age-town-house-01`
- `exclusive` - the specs that change the server wide state (login and admin security), create players
  (authentication, character system) or use more than one room (movement), users set 0, it runs after every other
  group ended and its reset restores every room

Players collide with every other body, so two groups never share a room: every group starts its players on the
default return point of its own start room and the per test reset only touches the group players and rooms. The
users sets after the set 0 are created on the setup (`TestDataSetup.createGroupsUsers`) as a copy of the user of the
same slot (same password, stats, class path, level and inventory), the `gameConfig` fixture gives every spec the users
of its group (`e2eUsername`, `e2eUsername2`, `e2eUsername3` and the player names), so the specs never name a user.
A new spec must be added to one group, the config stops the run when a spec does not belong to any group.

The forest specs start in `reldens-forest-level-1` (`Login.loginAndEnterForest`), entering at its default return
point near the bottom of a 72x100 tiles map. `ObjectChase` (`tests/e2e/helpers/object-chase.js`) is only kept for its
side step offsets (`SIDESTEP_OFFSETS`, `offsetPoint`) used by the move cancel case of `test-timing-objects-cancel.spec.js`
and its stuck log, which includes the server body snapshot of the player (`RoomMovementApi.fetchPlayer`).

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
- `POST /api/e2e/room-objects/enemy-attack` (`{roomName, playerName, assetKey}`, `RoomEnemyPlacement`) - places one
  enemy of that asset key the same way as `place-enemy` and starts its battle with the player
- `POST /api/e2e/room-objects/place-player` (`{roomName, playerName, nearPlayerName}`) - places the player 40px from
  the other player (found by name), on the first walkable side of right, left, down and up, inside the 50px
  `attackShort` range and out of contact with its body, so a player versus player hit never pushes the target
- `POST /api/e2e/room-objects/player-affected-property` (`{roomName, playerName, value}`) - sets the affected property
  (`client/actions/skills/affectedProperty`, the hp) of the live player to that value, saves the stats and sends them to
  the player client (`RoomScene.savePlayerStats`)

`TimingObjectSession` (`tests/e2e/helpers/timing-object-session.js`) holds the shared steps of the chest, mining and
fishing specs: enter the forest with its enemies disabled, place the player next to the first instance
(`placeNextToObject`), read the reward quantity from the inventory, record the `timingStart`, `timingCancel` and
`timingComplete` messages and start a timing on the placed instance.

The game data (`collect-game-data.js`) collects the objects of the rooms the specs use (`SPECS_ROOMS_NAMES`: the town
and the forest level 1), keyed by room name, whatever room the players were saved in, with per room object
`layerName`, `tileIndex`, `childObjectType`, `isAggressive`, `interactionRadio`, `randomMovementTiles` and the
`respawnAreas` list (class type 7), read through `BaseE2eTest.loadGameData`, `BaseE2eTest.loadRoomObjects(roomName)`
and `BaseE2eTest.loadRoomEntries(roomName, listsKeys, onlyMoving)`:

- `test-npc.spec.js` - the town NPCs wander inside their area (synced bodies sampled with
  `PhaserRange.collectPositionRanges` and checked with `PhaserRange.summarizeMovement`), and a moving NPC still opens
  its dialogue after it was placed on a tile away from its spawn tile
- `test-objects-movement.spec.js` - the aggressive and the passive forest enemies wander inside their own area: the
  server snapshots are sampled every 250ms for 30 seconds (`EnemiesWanderSummary`,
  `tests/e2e/helpers/enemies-wander-summary.js`), the enemies that were in battle at any sample are left out, and for
  the others every destination tile must be at most `maxTiles` columns and rows from the original tile, a rest outside
  the area (pushed by another body) must end within `maxDelay` and a path blocked on the same tile must be dropped
  within two moves (`2 * maxDelay`); every invalid enemy is reported with its whole trail (tile, original tile,
  position, velocity, path, contacts and battle per sample); the objects without random movement keep their
  position, and a passive enemy does not attack a player standing next to it (the aggressive enemies are disabled
  with `onlyAggressive` and the passive enemy is placed 40px from the player with `place-enemy`)
- `test-interactive-objects.spec.js` - the chest, the mining rock and the fishing spot with the forest enemies disabled
- `test-timing-objects-cancel.spec.js` - the mining is cancelled and gives no reward when the player moves, when an
  enemy hits the player (placed by `enemy-attack`) and when another player hits the player (`attackShort` sent by the
  second player of the group, `gameConfig.e2ePlayerName2`, `ImRoot5` in the forest group, placed next to the miner by
  `place-player`); the hit cases also check the player HP went down and the position did not
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
- `console-<Y-m-d-H-i-s>.log` - the whole output of a run when it is started from the checkout root with
  `> "test-results/console-$(date +%Y-%m-%d-%H-%M-%S).log" 2>&1`, follow it with `tail -f`
- `server.log` - the console output of the Playwright main process, where the game server runs: the server log lines,
  the framework output (Colyseus included) and any uncaught exception
- `tests.log` - the console output of the test worker, which also receives the game server log lines written while
  the specs run
- `playwright/test-<spec>-<hash>-<title>/` - only created for failures, holds `error-context.md` and
  `test-failed-1.png`; Playwright empties its `test-results/playwright/` output folder when a run starts, so the logs
  above are kept

An uncaught exception in the game server makes Colyseus shut it down and exit the run: the stack is written to
`server.log` and to the run output, and the reporter prints the `Run aborted` line with the test it stopped at.

## Reading a failure

Start with `test-results/playwright/test-*/error-context.md`: it names the spec, the failing call and the page snapshot
at that moment. Then check `test-results/tests.log` and `test-results/server.log` for the server side of the same
timestamp. A timeout on
`#player-selection:not(.hidden)` means login never completed; a timeout on `window.reldens` means the client
bundle never initialized.
