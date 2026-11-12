# E2E Testing Guide

Playwright end-to-end suite under `tests/e2e/`. It boots a real Reldens server against a real database and
drives the real client in a browser.

ALL TESTS (UNIT, INTEGRATION, E2E) MUST ALWAYS RUN IN THEIR OWN SELF-HOSTED ENVIRONMENT: the e2e suite boots its own
server (see "App under test") and the unit and integration tests run with `RELDENS_TESTS_CONFIRMED=1 npm run
test:default` (`tests/default/run-default.js`, it boots its own server on the `tests/config.json` port + 100), never
with `npm test`, which targets an external server on the `tests/config.json` port that nothing starts (every admin
integration test then fails with an empty `Error:`, the connection refused). Every checkout uses its own
`tests/config.json` test database and ports. The only exception is `npm run test:unit` (`run-default.js --unit`), which
runs the unit tests alone, without the database reset and the server, and skips the classes marked `isIntegration`.

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

- `--long` - slow motion plus scaled timeouts (also via `LONG_RUN=1`); the gameplay features specs also run the
  `tests/e2e/helpers/long-run-showcase.js` steps, only in the long run, so their videos show the tested result: the
  video is recorded with `page.screencast` from the game start (`BaseE2eTest.startGameplayRecording()`, the login and
  the player selection are left out and an opaque top banner, over the page header, shows the test title, that the
  player teleports skip the walks and the current step, the `tests/e2e/assets/e2e-overlays.css` styles added with it
  move the whole scene label box 18rem left of the top center, so it never covers the player, and the game over box
  30% down from the top), the first step is given to the recording start
  (`LongRunShowcase.startGameplayRecording(page, longRun, firstStep, zoom, suffix)`), so no video starts without it, the
  steps tell the general flow of the test and the HUD, the life bars and the panels show the live values (a step that
  changes with every value cannot be read), every step stays on screen for `TimeConstants.STEP_READ` (4 seconds,
  `RecordingStepReadTimer`: the next `LongRunShowcase.showStep()` and the end of the recording wait for it, so a step
  never goes between a timed action and its check), the result stays on screen for `TimeConstants.SHOWCASE` (2
  seconds), the panel that shows it (inventory, chat, scores, player stats) is opened, the
  recovery amounts are raised, the recovering enemy (a passive one with no `over-player` map layer tile, the tree tops
  drawn above the sprites, within 2 tiles) is targeted with the player 2 tiles away (touching it starts a battle) and
  far enough from the map borders that the camera keeps the player at the center, away from the panels, the killed
  Tree keeps its full life and is fought near the map center (the aggressive enemies are disabled before the player
  moves there, and the placed Tree aggression is held until the player attacks it, since the center is inside its
  respawn area and it would start the battle and chase the player before the targeting sees its placed position), the
  death videos place the passive enemy of the map center next to the player with the player life lowered and its
  battle keeps hitting until the player dies; every placement and disabled enemy is done before the recording starts,
  and the recording starts with the camera on the player (its lerp is instant until the screencast runs and then
  `BaseE2eTest.recordingCameraLerp`, kept by the recording view, which every `BaseE2eTest.recordingViewIntervalMs` also
  keeps the zoom, hides the weather clouds and puts back the Phaser DOM container a click scrolled), once the game
  camera stopped (`BaseE2eTest.waitForCameraStill()`, its scroll checked every `BaseE2eTest.cameraStillPollMs`) and 1
  second after the banner (`BaseE2eTest.gameplayRecordingStartDelayMs`), because its first frame is the last frame
  already captured for the context video; the recorded cursor dot hides after 1.5 seconds without moving; a canvas click
  on a sprite right after a placement waits for the same still camera in every run (the camera follows the player with
  a slow interpolation, so a click computed while it pans misses the sprite)
- `--filter=<text>` - passed to Playwright as a quoted `--grep`, so a filter with spaces works (`"--filter=Combat System"`),
  with `--no-deps`, so filtering a spec of the exclusive group does not run the other groups first, and with
  `--workers=1`, so a filter that matches specs of several groups runs them one at a time and the exclusive specs,
  which reset and disable the enemies of every room, never run at the same time as another group
- `--port=<port>` - overrides the port from `tests/config.json`; when the port is busy the runner logs a warning and
  tries the next one, up to 5 ports, and stops with a critical log when all of them are busy
- `--clean-output` - removes `test-results/` before the run
- `--db-reset=<dbName>` - drops every table and rebuilds the database from `migrations/production` before the run;
  the value must match `dbName` in `tests/config.json` (`--db-reset=reldens_local`), otherwise the run stops without
  touching the database, so a wrong `dbName` can never drop another database
- `--skip-servers=server-2` - the second game server instance is not created (see "Server instances"), the specs that
  need it fail on `E2eServerInstances.forServer()` with the instance named
- `--skip-db-reset=server-1,server-2` - the database reset of the listed instances is skipped (with `--db-reset`), a
  database shared by several instances is reset only once
- `--instance=<name>` - runs the suite as an isolated instance (see "Isolated instances"), the name uses lower case
  letters, numbers and hyphens (`--instance=server-3`)
- `--max-failures=<n>` - overrides the stop-on-failure limit
- `--all` - runs every test regardless of failures

## Server instances

Every run boots the numbered game servers `server-1` and `server-2` (`tests/e2e/helpers/e2e-server-instances.js`):
both share the `tests/config.json` database and the `RELDENS_SIGNED_TOKENS_SECRET` of the app `.env`, `server-1` runs
on the found e2e port and `server-2` on the next free port (`run-tests.js` passes them in `RELDENS_E2E_SERVERS_PORTS`).
`server-1` boots in the Playwright global setup process (`collect-game-data.js`), `server-2` in its own child process
(`tests/e2e/forked-server-instance.js`, a second `ServerManager` in one process would share the events manager
singleton) with the same startup and the same e2e endpoints, it logs to `test-results/server-2.log` and the global
teardown shuts it down. A `servers` entry in `tests/config.json` overrides the config of one instance, like
`{"servers": {"server-2": {"serverPath": "../other-checkout/app"}}}`. The per test reset runs on every instance and a
spec reaches `server-2` with `E2eServerInstances.forServer(gameConfig, 'server-2')`, the game config whose
`serverBaseUrl` is used by the e2e endpoints requests (`SecurityApi`) and by the client pages it opens
(`Login.openClientPage()`).

## Isolated instances

`--instance=<name>` runs a complete second suite from the same checkout at the same time as the default run (or as
another instance), for example two sessions working on the same branch, without touching each other
(`tests/e2e/helpers/e2e-instance.js`, the name is kept in `RELDENS_E2E_INSTANCE` for the whole run):
- database: the `tests/config.json` `dbName` with the instance name appended, hyphens as underscores
  (`reldens_local_server_3`); create it once (`CREATE DATABASE reldens_local_server_3 CHARACTER SET utf8mb4 COLLATE
  utf8mb4_unicode_ci`), the run is confirmed with that name,
  `npm run test:e2e -- --instance=server-3 --db-reset=reldens_local_server_3`, and an instance always runs with
  `--db-reset` since its database starts empty
- ports: its `server-1` looks for a free port from the `tests/config.json` port plus 20, its `server-2` on the next
  free port, the same as the default run (`--port=<port>` still overrides it)
- outputs: everything the default run writes in `test-results/` and `tests/e2e/` (playwright results, videos,
  screenshots, `server.log`, `server-2.log`, `tests.log`, `game-data.json`, `server-events.jsonl`) goes to
  `test-results/instances/<name>/`; the `--clean-output` of an instance removes only its folder and the one of the
  default run keeps `test-results/instances/`
- an `instances` entry in `tests/config.json` overrides any config value of one instance, like
  `{"instances": {"server-3": {"dbName": "reldens_other_tests", "port": 5060}}}`
- servers with their own database: an instance entry with `"crossServerNamesCheck": true` and a `servers` entry giving
  `server-2` its own `dbName` boots every server of the run with all the run servers URLs in `RELDENS_ROOMS_DATABASES`
  (each server skips its own URL), so the usernames, emails and player names are checked between them; both databases
  are reset with `--db-reset=<server-1 dbName>,<server-2 dbName>` (every database of the run must be listed, the
  server-2 one created once like the instance one). `tests/e2e/test-cross-server-names.spec.js` runs its own databases
  cases only on such a run and skips them on the others

Both runs still boot their servers from the same `serverPath` app, so they share its `.env` (the database values are
overridden by each run), its theme and its client bundle.

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

### Sample data files sync

`migrations/development/reldens-test-sample-data-v4.0.0.sql` is a copy of `migrations/production/reldens-sample-data-v4.0.0.sql`
plus the test-only rows (ids 100+ and 1001+). Every change to one of them, including the rows seeded by a new
`migrations/development/*-sql-update.sql`, must be applied to the other one in the same change: when they drift, a
database last reset by the unit tests misses the e2e data (the `root2` and `root3` accounts were only in the production
file until 2026-10-12). Every checkout uses its own `dbName` in `tests/config.json`, never a database shared with
another checkout or the app, and always runs the suite with `--db-reset=<dbName>`.

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

The setup turns off the server health blocking (`server/health/blockingEnabled`, on `reldens.beforeInitializeManagers`),
the monitor keeps sampling and reporting: the browsers of the parallel groups run on the same machine, so the system
CPU percent the monitor reads includes the test load, and a login during a spike over `maxCpuPercent` failed waiting
for `#player-selection:not(.hidden)` with `The server is busy right now` on the login form. The blocking cases are
covered by the unit tests listed in `.claude/server-health-monitor.md`.

If `dist/index.html` still references `src="./index.js"` the client was never bundled, so `window.reldens`
never exists and every spec times out after 10 seconds waiting for it. `ClientBundleCheck.isMissing()` detects
this, and `ClientBundleCheck.isOutdated()` detects a bundle older than any client source (a `lib` js file of the
checkout or a `theme/plugins` js file of the app, outside a `server` folder, or an `html` or `scss` file of the tested
theme, `tests/config.json` `themeName`, outside its `assets` folder, changed after `dist/index.html` was built) or a
missing tested theme folder, so a client or theme styles fix is always tested; in both
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

## Seeded rows and config overrides

The specs that need their own data seed it through the `/api/e2e/data/*` endpoints
(`tests/e2e/helpers/e2e-seed-and-restore-endpoints.js`, wrapped by `tests/e2e/helpers/e2e-seed-and-restore-api.js`),
every request carries the spec group (`e2eGroup` fixture) and everything is undone only for that group by the players
reset before its next test (`E2eSeedAndRestoreEndpoints.resetGroup`, called by `/api/e2e/reset-players`) and for every
group by the global teardown:

- `POST create` (`{group, entityKey, row}`) - creates a row with `dataServer.getEntity(entityKey).create(row)`; the
  reset deletes the created rows of the group in reverse order
- `POST update-created` (`{group, entityKey, id, patch}`) - updates a row created by the same group (any other row is
  refused), for example disabling a seeded locale after the login; the reset deletes it like every created row
- `POST preserve` (`{group, entityKey, filters}`) - stores the rows matching the filters; the reset deletes the rows
  created since then for the same filters, creates again with their own ids the stored rows the spec deleted (the
  scores reset deletes every scores row) and writes the stored values back, before it deletes the created rows, so a
  preserved row that references a seeded row (a user locale pointing to a seeded locale, a clan membership) never
  blocks that delete
- `POST load` (`{entityKey, filters}`) - returns the stored rows a spec asserts
- `POST config` (`{group, path, value}`) - overrides a value of the running `ConfigManager` (for example
  `server/chat/messages/global_enabled`); the reset restores the original value, or removes the path when it was not
  set
- `POST reload-locales` (`{group}`) - runs the snippets `ConfigurationEnricher` again so a seeded locale reaches the
  client config of the next login; the reset reloads the locales again after deleting the seeded rows

The values read once on startup (like the rewards provider config) can not be changed with `config`, those cases are
covered by unit tests.

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
  movement, places it on the first walkable position around the player (40px right, left, down and up, then the 40px
  diagonals, then 32px right, left, down and up: all inside the 50px `attackShort` range) where its body does not
  overlap any colliding body of the room, the player body included
  (`RoomObjectsState.findAttackPosition`: the enemies restored on random respawn tiles, the trees, the walls), since an
  overlapped body is pushed off the placed position and the exact position targeting never matches, and, with
  `enemyLife`, sets its life so a single hit kills it; it returns the
  enemy key, its body state key (`bodyKey`, the client `objectsAnimations` and `room.state.bodies` key), the exact
  position, the experience its stored rewards give on its death and its `killScore` private param (0 without one)
- `RoomObjectsApi.placeAndTargetEnemy` waits until the client body state of `bodyKey` is exactly on the placed position
  and targets that exact body, so the combat specs (`test-combat.spec.js`), the XP spec (`test-stats.spec.js`, the XP
  after the kill must equal the XP before plus the returned experience) and the passive enemy spec
  (`test-objects-movement.spec.js`) never chase an enemy
- `POST /api/e2e/room-objects/place-player-next-to-object` (`{roomName, sessionId, objectKey, minimumTilesDistance}`,
  `tests/e2e/helpers/room-player-placement.js`) - stops the random movement of the first object of that key or asset
  key (any object with a physics body, with or without a body state, so the chest is found too) and places the player
  on the center of the closest walkable tile around the object tile that does not overlap any colliding body of the
  room (the object, the objects next to it and the other players) except the player itself (closest distance first,
  then the lowest row and column, so the same room always gives the same tile), skipping the tiles closer than
  `minimumTilesDistance` (0 by default; the long run uses 2, so the player never touches an enemy that starts a battle
  on the hit); `RoomObjectsApi.placePlayerNextToObject()` waits for the client state and the player sprite on that
  position;
  `RoomObjectsApi.placePlayerNextToObject` waits until the client player state is exactly on the placed position, and
  the NPC, trader, chest, mining rock and fishing spot specs interact with the returned `bodyKey`
- `POST /api/e2e/room-objects/place-player-in-line-of-object` (`{roomName, sessionId, objectKey, distances}`,
  `RoomPlayerPlacement.placePlayerInLineOfObject`) - stops the random movement of the object, places it on the center
  of its tile and places the player on the first tile at one of the `distances` (in that order) right, left, down or
  up (in that order) whose line is walkable on the path finder grid and crossed by no body of the room except the
  object and the player (`RoomPlayerPlacement.findClearLineTile`: the walls, the change points, the objects with or
  without state, the disabled enemies and the other players), so a shot always crosses the same free tiles; the
  bullet interpolation spec disables the other enemies first (the snapshot `bodyKey` of `/api/e2e/room-objects`), so
  no enemy wanders into the line after it is chosen
- `GET /api/e2e/movement/clear-line-tile` (`roomName`, `playerName`, `distances`,
  `RoomPlayerPlacement.fetchPlayerWalkTile`) - the walk target of a player with the same rule, its line rectangle
  starting on the player body bounds, so a walk never stops on a body the path finder grid does not know (a tree, an
  object without state): the grid path alone was not enough, a path to a grid walkable tile ended with the player
  pushing against an object body one tile before the target
- the moved NPC case places the NPC with `RoomMovementApi.placeObject` on the closest walkable tile of its spawn tile
  (it keeps its original tile) instead of waiting for a random wander
- the town movement specs (`test-movement.spec.js` and both pathfinding specs, through
  `MovementScenario.pauseMovingObjects`) stop every moving NPC and trader of the room and place it back on its spawn
  tile, so the walks, the routes and the blocked targets always run on the same room layout
- `POST /api/e2e/room-objects/place-player-on-line-start` (`{roomName, sessionId, distances}`,
  `RoomLinePlacement.placePlayerOnLineStart`) - places the player on the closest free tile around its current tile
  (closest distance first, then the lowest row and column) that has a clear line of tiles at one of the `distances`,
  and returns that `position` and the walk target `tile`; `MovementScenario.walkPlayerToTile` walks the player to the
  returned tile, so a walk (the zero game over revive case of `test-death-stored-state-and-timers.spec.js`) never stops
  on a body
- `POST /api/e2e/room-objects/place-player-next-to-object-with-room` (`{roomName, sessionId, playerName, objectKey,
  enemyKey}`, `RoomEnemyPlacement.placePlayerNextToObjectWithRoom`) - places the player on the first of the 8 tiles
  around an active object of that asset key (the objects sorted by key) inside the object interaction area
  (`isValidInteraction`), free of other bodies and with room for the given enemy next to the player
  (`RoomAnchoredPlacement.findAttackPosition`), so the enemy hit case of `test-timing-objects-cancel.spec.js` places
  the enemy without moving the miner; `TimingObjectSession.prepareMining` uses it when an enemy key is given
- `RoomMovementApi.waitForPlayerStill` waits until the server player has no path steps and no velocity, used after a
  walk before the next action (`test-game-session-lifecycle.spec.js`, the mining restart of
  `test-timing-objects-rules.spec.js`), so a body still moving never cancels or changes the next step

Both placements receive the client `sessionId` (`room.sessionId`) and move that exact player schema
(`RoomObjectsState.findPlayer`), never the first player found by name, so a body left by another session of the same
user can never take the placement.

The players reset before every test (`/api/e2e/reset-players`, with the group of the test) first waits until no scene
room holds a player of that group (`PlayerStateReset.waitForTestPlayersToLeave`: the closed page of the previous test
leaves, the room saves the player and removes it), so no previous session stays in a room the next test uses or
overwrites the restored state; then it restores the stats, the inventory, the scores and score details (back to the
rows captured on the setup, so a kill of an earlier test never leaves a score row) and the state of the group players
(placed on the default return point of the group start room), and the enemies, the random movement stopped by a setup
request and the drops left by the tests (`RoomEnemiesReset.restoreAll`, `RoomMovementState.restoreRandomMovement`,
`DropsProbe.clearRoomsDrops`) only in the group rooms.

## Parallel spec groups

The specs run in groups (`tests/e2e/helpers/parallel-spec-groups.js`, the specs of every group are listed in
`tests/e2e/helpers/parallel-spec-groups-list.js`, where a new spec is added), every group is a Playwright project with one
worker, so its specs run one after the other, and the groups run at the same time:

- `world` - the town specs that need the town layout (NPCs, player and object pathfinding), users set 0 (`root`,
  `root2`, `root3`), start room `reldens-new-age-town`
- `forest` - combat, stats, interactive objects, timing objects, objects movement, animation frames and item growth,
  users set 1 (`root4` to `root6`), start room `reldens-forest-level-1`
- `social` - private chat, teams, clans, trading, items, rewards, locale selector and the game login flow, users
  set 2 (`root7` to `root9`), start room `reldens-new-age-town-house-01`
- `exclusive` - the specs that change the server wide state (login and admin security, the scores reset and every spec
  that overrides a config value: the config is one for the whole server and its client values reach every player that
  logs in, so a parallel group would get them), create players (authentication, character system) or use more than one
  room (movement, client interpolation, teleport NPC, death teleport), users set 0, it runs after every other group
  ended and its reset restores every room

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
- `POST /api/e2e/room-objects/disable-enemies` (`{roomName, onlyAggressive, exceptBodyKey}`) - stops every enemy of the
  room (or only the aggressive ones with `onlyAggressive: true`, never the body state key `exceptBodyKey`) until the
  next players reset: no path, no battle, no collision
  response, affected property 0 (so the aggression and the hits never start a battle) and the `DISABLED` state (so the
  body is not integrated and the random movement never moves it)
- `POST /api/e2e/room-objects/enemy-attack` (`{roomName, playerName, assetKey}`, `RoomEnemyPlacement`) - places one
  enemy of that asset key the same way as `place-enemy` and starts its battle with the player
- `POST /api/e2e/room-objects/place-player` (`{roomName, playerName, nearPlayerName}`) - places the player 40px from
  the other player (found by name), on the first walkable side of right, left, down and up where it does not overlap
  any other colliding body, inside the 50px
  `attackShort` range and out of contact with its body, so a player versus player hit never pushes the target
- `POST /api/e2e/room-objects/player-affected-property` (`{roomName, playerName, value}`) - sets the affected property
  (`client/actions/skills/affectedProperty`, the hp) of the live player to that value, saves the stats and sends them to
  the player client (`RoomScene.savePlayerStats`)

`TimingObjectSession` (`tests/e2e/helpers/timing-object-session.js`) holds the shared steps of the chest, mining and
fishing specs: enter the forest with its enemies disabled, place the player next to the first instance
(`placeNextToObject`), read the reward quantity from the inventory, record the `timingStart`, `timingCancel` and
`timingComplete` messages and start a timing on the placed instance.
`TimingObjectSession.pinRespawnOutOfReach` (`POST /api/e2e/timing-objects/pin-respawn-out-of-reach`, `{roomName, group,
objectKey, playerName}`, `TimingObjectsProbe.pinRespawnOutOfReach`) overrides the respawn tile of that object until the
group reset: the free respawn tile closest to its old place among the tiles out of the interaction reach of the player
(interaction area plus half a tile from the player position), falling back to the random tile, so the mined rock of
`test-interactive-objects-rocks.spec.js` never respawns next to the miner.

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
  the area (pushed by another body) must end within one move and a path blocked on the same tile must be dropped
  within two moves; the moves are the `ObjectRandomMovement.movesCount` of the snapshot, never the elapsed time, since
  the move timers run late on a loaded machine (a blocked path once lasted 18.4s against a `2 * maxDelay` limit of
  16s), and the moves count of every enemy must keep growing: a stretch without a new move longer than `2 * maxDelay`
  (one full delay of room for the late timers) reports a stopped movement loop, which the moves rules never see; every invalid
  enemy is reported with its whole trail (tile, original tile, position, velocity, path, contacts, battle and moves per
  sample); the objects without random movement keep their
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

## Client interpolation specs

The client scene interpolation (`SceneDynamic.processPlayersPositionInterpolation` and
`processObjectsPositionInterpolation`) is checked in the browser on the real bundle, frame by frame:

- `InterpolationFramesRecorder` (`tests/e2e/helpers/interpolation-frames-recorder.js`) listens to the `preupdate` and
  `postupdate` events of the active scene and records, for the tracked players, objects animations and bullets, the
  sprite position before and after the scene update and the interpolation entry the update read (the state `x`, `y`
  and `mov`); `summarize()` checks every frame against the real Phaser `Linear` (`node_modules/phaser/src/math/Linear.js`)
  and the configured `client/general/engine/interpolationSpeed`: a moving entry steps the sprite and is kept, a stopped
  entry places the sprite on the state position and ends, an entry already on the sprite position (rounded) ends
  without moving it and a sprite without entry never moves; the players use 2 decimals and the players size offsets,
  the objects and bullets integers; it also collects the page errors, so a client update that throws fails the spec
- `test-client-interpolation.spec.js` (exclusive) - the own player walk (intermediate steps and the stop placed on the
  server position), the own player placement next to the `e2eNpcKey` NPC (one frame jump, no step), another player
  walking and placed as the first client sees it, the `e2eNpcKey` NPC placed on a tile and walking back to its original
  tile, an `attackBullet` bullet flying to a passive forest enemy over a clear line of 4 (or 3) tiles
  (`RoomObjectsApi.placePlayerInLineOfObject`, the other enemies disabled before), and the walk in the forest after
  entering it through the town change point, with every forest enemy disabled; the other player and the forest walks
  go with the pointer to a tile on a clear line of 3 (or 2) tiles (`MovementScenario.walkClearLine`, the target from
  `RoomMovementApi.fetchClearLineTile`) until the server reports the player still on it, and the clients are checked
  against that final server state (`GameplayE2eStateApi.fetchPlayer`), so no timed walk runs into a body and keeps
  moving after the stop (the long run slow motion made the timed keyboard walk reach an NPC); every failed player wait
  reports the expected server position, the state, the sprite and the entry it saw
  (`InterpolationFramesRecorder.readPlayerPositions`); the flying bullet frames keep the rendered texture, it must be
  `default_bullet`. Its long run steps are in `ClientInterpolationShowcase` and `ClientInterpolationBulletShowcase`: the
  walkers get a slower live speed (`POST /api/e2e/live-objects/body-property`, restored by
  `/api/e2e/live-objects/restore`), the bullet flies at its stored speed, the own placement target is marked on the
  map and the camera stops following, the first client of the two players case uses a wider zoom, and the player stands
  off the NPC walking line
- `SceneInterpolationProbe` (`tests/e2e/helpers/scene-interpolation-probe.js`) calls the live scene interpolation
  methods inside one page evaluation with the crafted entries the real movements never create (no state, no sprite,
  no animation, already in place, the interpolation disabled, no player engine), ending with the real state so the
  sprites end where they started, and reads the depth of every map layer
- `test-scene-interpolation-branches.spec.js` (exclusive) - asserts those branches, that every town map layer gets
  the `client/map/layersDepth` depth of its name, or its index times the map height in pixels for the over player
  layers, and that with `client/general/engine/clientInterpolation` overridden to `false` for the group the walking
  player sprite is placed on its state position on every state change (`PlayerEngine.updatePlayer`), with no frame
  moved by the scene update; the long run steps are in `SceneInterpolationShowcase` and
  `SceneInterpolationBranchesShowcase`, the probe entries run first and the video replays them slowed with one caption
  per group of branches

## Gameplay features specs

The specs of the features described in `.claude/gameplay-features.md` read every expected value from the stored
rows (config, items, ads, objects), enable the disabled features with `POST config` for their group and use
`GameplayE2eStateProbe` (`tests/e2e/helpers/gameplay-e2e-state-probe.js`, registered by `collect-game-data.js`,
wrapped by `GameplayE2eStateApi`):

- `GET /api/e2e/gameplay/player?roomName=&playerName=` - the live player avatar key, life, base life, stats, state and
  scene
- `POST /api/e2e/gameplay/enemy-life` (`{roomName, enemyKey, life}`) and
  `GET /api/e2e/gameplay/enemy-life?roomName=&bodyKey=` - set the life of an active enemy out of battle (the life bar
  update is broadcast like a hit does), then read that exact body
- `POST /api/e2e/gameplay/scores-reset-check` (`{isoDate, previousPeriodKey}`) - stores the previous period key in
  its config row and runs the scores plugin reset check on that date

The shared helpers: `E2eSeedAndRestoreApi.seedInventoryItem()`, `loadInventoryRows()` and `fetchConfigValue()`,
`AdMessagesPlayer` (`tests/e2e/helpers/ad-messages-player.js`: enables an ad, its CrazyGames provider and the client
provider for the group, with the provider `sdkUrl` set to the SDK mock `tests/e2e/assets/crazy-games-sdk-mock.js`
served by `E2eAssetsEndpoints` at `/api/e2e/assets/`; the client loads the mock and plays the ad on its event: an
advertisement overlay is shown for the provider minimum duration and the client provider sends the start and end
messages, or the failed message after `failNextAd()`), `ForestEnemyKill` (`tests/e2e/helpers/forest-enemy-kill.js`:
the configured forest enemy placed and targeted with one hit point, with its full life in the long run) and
`RoomObjectsApi.attackTargetUntil()` (the `attackShort` skill repeated until a condition is reached). The player
placements wait for the client sprite on the placed position, not only for the state.

- `test-auto-recovery.spec.js` (forest) - a player life and an idle enemy life set to 1 recover on the next ticks, and
  the life of an escaped player recovers only after the chase time out and the start delay. The steps are in
  `AutoRecoverySteps`; the long run ones in `AutoRecoveryShowcase` (shorter start delay and tick time, the tick time
  reaches the live room through `POST /api/e2e/gameplay/restart-recovery-ticks`; the bigger life bars change only the
  client config object of the recording page, a server override would reach the parallel specs, and an object bar takes
  the width of its sprite, the only one drawn centered, and the escape walk stops on the closest tile with no tree drawn
  over the player); its steps tell the lowered life, the recovered points per tick and the start delay
- `test-kill-score.spec.js` (forest) - killing the Tree adds its `killScore` to the player scores row; the check that no
  late score arrives with the switch disabled keeps its whole wait, the long run walks the player during it; the long
  run step changes as soon as the scores panel shows the new score (`LongRunShowcase.showStepWhenText()`) and the player
  kill test disables every enemy in the long run, so none walks around in its videos
- `test-item-growth.spec.js` (forest) - the equipped growing sword stores the kill experience and level in its
  `items_inventory.customData` and the player attack grows with the scaled modifier; the long run steps tell the attack
  before and after the equip and, after the level up, the stored experience and level (the game panels never show them)
- `test-ad-skins.spec.js` (exclusive) - the skin ticket use keeps the ticket, the played skin ad consumes it and rewards
  the skin item, and equipping it changes the server and client avatar until it is unequipped; a failed skin ad (the
  mock calls the provider error callback after the server opened the play) closes the play keeping the ticket and gives
  no skin item
- `test-ad-skins-display.spec.js` (exclusive) - the skin item seeded in the inventory: its equip is stored as active and
  seen by the other client in the room and by a player joining after, the unequip stores it inactive and restores the
  class path avatar on every client; the skin is applied again after a new login (seen by the player already in the
  room) and after a scene change and back, an unequipped one is not; a trashed equipped skin restores the avatar; a walk
  plays the skin walk animation. `SkinSteps` (`tests/e2e/helpers/skin-steps.js`) loads the skin ad, ticket and reward
  item keys from the stored rows and reads or waits for a player sprite avatar, texture and animation; it also enters
  the group players with their skin tickets seeded and the skin ad enabled (`enterWithTickets()`), sends the skin ad
  start and end messages with the wait for the provider minimum duration (`playAd()`, `endAdAfterMinimumDuration()`)
  and checks the stored played skin ads and ticket and skin item quantities
- `test-movement-return-points.spec.js` (exclusive) - every change point tile of both ways between the sample rooms
  (the town and the forest, the town houses, the forest levels one to six, the first house floors, the second house
  gravity room and the bots forest house) leads to the next room and saves the player on the next room return point of
  the previous room. `ChangePointsSteps` (`tests/e2e/helpers/change-points-steps.js`) reads the rooms, change points and
  return points rows, builds the round trips that use every tile, places the player on each tile body
  (`RoomObjectsApi.placePlayerOnChangePoint()` with a tile index, `GET /api/e2e/room-objects/change-points` lists the
  stored change points of a room with their created body and walkable tile) and waits for the player to leave the
  previous room before checking the stored arrival, because that room leave saves the state again (ISSUE #331). The
  bots forest is entered by its return point stored as the player state before the login
  (`ChangePointsSteps.storeRoomArrival()`)
- `test-movement-rules.spec.js` (world) - the town moving objects paused and the player placed on the town return point
  before every walk: every direction message moves the body on its axis and sign and the stop stands it still; two
  directions at once move it at the movement speed normalized on both axes, and four directions at once from a still
  body keep that normalized speed on both axes (the server runs one interval per held direction, so the order of those
  timers picks the signs); pointer moves with huge, non numeric or fractional tiles leave the player on its tile and
  the next walk still works; a burst of direction messages carrying position and time values moves the body only at
  the movement speed
- `test-movement-keyboard.spec.js` (world) - every arrow and WASD key pressed on the page moves the player on its axis
  and sign with a single direction message and its release sends the stop; the arrows typed in the focused chat input
  send no direction (only the release stop) and move the player again once the input loses the focus, and the same for
  the quantity input of the trader buy tab (opened by the trader interaction and its buy value); releasing one of
  two held keys sends the stop for every direction and the key still held sends its direction again; the keys held
  while the scene transition or the scene change flag is on send no direction; an open NPC dialog with no input focused
  keeps the arrow keys working. The keys are
  pressed once the scene fade-in ended with no input focused (the scene ignores them before). The movement
  messages a player sends are recorded on the server (`GameplayE2eStateApi.recordMovementMessages()` and
  `fetchMovementMessages()`, the gameplay probe listens to `reldens.beforeSceneExecuteMessages`)
- `test-movement-pointer.spec.js` (world) - real canvas clicks (`Navigation.navigateToWorldPoint()` with the mouse
  button, after `Navigation.waitForCameraSettled()`): the sample `primaryMove` is off, so the secondary button walks the
  player to the clicked tile with one pointer move and shows the pointer arrow while the primary button moves nothing,
  and with `primaryMove` set on in the client config the secondary button moves nothing and the primary one walks; a
  touch tap (`Navigation.TOUCH_BUTTON`, from a page opened by `Login.openClientPage()` with `{hasTouch: true}`) walks
  the player and its touch end sends the joystick stop; a second click destroys the first arrow; a click with the chat input focused blurs it and walks; a click on an NPC
  sprite sends no pointer move; a disabled player keys and clicks send only stops and the player walks again once
  active; the client pointer arrow off shows no arrow and the client tap movement off sends no pointer move. The
  joystick controller (registered by default, `useJoystick` and `useJoystickOnLowResolutions` default on) sends a stop
  on every document mouse release, so every click is recorded as its pointer move followed by a stop
- `test-movement-controls.spec.js` (world) - every on-screen arrow button pressed walks the player with one direction
  message and the opacity class while pressed, and its release stops it (the button and the joystick document release
  both send a stop), the same with a touch held on every button from a page opened with `{hasTouch: true}` (the touch
  start and end sent with the Chromium `Input.dispatchTouchEvent`, Playwright only has the tap); the mouse leaving a pressed button stops the player while the mouse is still down; and a right
  click on the canvas has its browser menu prevented; on a 700px wide page (resized after the login, the joystick
  scrolled into view) the joystick replaces the arrow buttons and its thumb drag walks every axis, stops inside the
  threshold and on the release. The recording starts after the button hover, because every button mouse out sends a
  stop (ISSUE #335). The controls box is created once by the first scene preloader of the session, so its options are
  set before the engine starts (`InitialClientConfig.overrideBeforeEngine()`, an init script that hooks the
  `reldens.beforeCreateEngine` event and assigns the values after the login game config merge): with only the low
  resolutions joystick on the box gets both joystick classes and the arrows walk; with the controls off no arrow
  button nor joystick is shown (the login skips the HUD selectors check) and the keyboard still walks the player
- `test-movement-world-bounds.spec.js` (world) - the own player placed on the free walkable tile closest to each town
  map border (`/api/e2e/room-borders/place-player`, `RoomBorderPlacement`, read inside the map only, the path finder
  grid has an extra column and row outside it) and pushed against that border with its direction, then stopped: the
  stopped server body stays inside the map and, once the client settled, the sample collideWorldBounds keeps the sprite
  body inside the world bounds and the camera is clamped on that border; with collideWorldBounds off (set before the
  engine starts) the sprite follows the server body. A body held against a wall bounces a few pixels on every step, so
  the server position is read after the client settled
- `test-client-interpolation-observers.spec.js` (exclusive) - the bullets seen by another client of the forest: a bullet
  shot by the first player at a passive enemy and one shot by the aggressive Tree (the sample enemy with the
  attackBullet skill, its battle started by `RoomObjectsApi.startEnemyBattle()`) are recorded on the observer client
  (`InterpolationFramesRecorder` with the bullets), follow the interpolation of their entries, render their texture
  and are destroyed on the observer and on the first player client once they end; the sample fireball bullet renders
  the texture of its flight direction; and the town NPC placement and walk back (`ObjectInterpolationSteps`, shared
  with the object test of `test-client-interpolation.spec.js`) are recorded on another client of the town; the same
  NPC walked with its area grid before the second player logs in is created on the joining client on its current body
  (`InterpolationFramesRecorder.waitForObjectOnBody()`), and both clients show it on its body after its next walk
- `test-client-interpolation-states.spec.js` (exclusive) - the first player walks a long pointer path in the town (the
  second player placed next to the town NPC first, so the first one stands alone on the return point) and, once its
  sprite moves on both clients, its page closes (the other client removes its sprite without errors) or the server sets
  it disabled or dead (`GameplayE2eStateApi.setPlayerState()`): on both clients its interpolation entry ends and its
  sprite stays still for the next frames
- `test-client-interpolation-speed.spec.js` (exclusive) - the interpolationSpeed set before the engine starts: the
  speed 1 lands every moving frame on its state target, another value steps the sprite with that value
- `test-client-interpolation-disabled.spec.js` (exclusive) - with the clientInterpolation config overridden off for
  the group, every frame that moves another player sprite (observer client), the town NPC sprite and a bullet sprite
  (observer client, `BulletObserverSetup`) leaves it exactly on its state with no interpolation entry
- `test-scene-interpolation-entries.spec.js` (exclusive) - the live objects interpolation with crafted entries: a
  sprite 0.49 pixels away ends its entry in place, 0.5 pixels away keeps it and steps, and an object animation with
  "bullet" in its key is moved by the object path
- `test-scene-tileset-animations.spec.js` (exclusive) - the town tileset animations are registered, every one is
  destroyed on the change to the forest and the forest registers its own
- `test-player-name-sprites.spec.js` (exclusive) - the client/ui/players name options set on the first client before
  its engine starts (`InitialClientConfig.overrideBeforeEngine()`): the own name off with a names limit shows only the
  other player name cut to the limit, the names off with the own name on shows only the own full name
- `test-player-walk-animations.spec.js` (exclusive) - the walker alone on the town return point (`WalkObserverSetup`)
  walks a clear line while both clients record its sprite every frame: the moving frames play the walk animation of
  the line direction (the last move places the sprite on the stopped state and stops it), the name sprite keeps its
  relative position and the depth is the sprite Y plus its body height
- `test-minimap.spec.js` (exclusive) - the sample round minimap: the open button shows the minimap camera and its
  circle and the close button hides them; the player marker follows the player walk on the minimap image (polled
  until the marker offset is zero, the marker updates one frame before the sprite interpolation); a closed minimap
  stays hidden in the next room (one left open is closed by the room change, ISSUE #336)
- `test-movement-gravity.spec.js` (exclusive) - the sample gravity room, entered by its return point stored as the
  player state before the login (`ChangePointsSteps.storeRoomArrival()`), with the player placed on a wall by
  `RoomMovementApi.placePlayer()` (`POST /api/e2e/movement/player-place`, half the 25px body above the wall top): the
  down key sends its direction and moves nobody; the up key jumps the player off the floor and it lands back on it;
  walking off a platform ledge falls, the stop in the air only stops the horizontal move and the player lands on a
  lower wall; the up key held under a platform jumps the player through it to stand on top (pass walls from below);
  a canvas click sends no pointer move and a pointer move finds no path (the room has no path finder). The room has no
  objects in the collected game data, so it is entered with `MovementScenario.enterReadyRoom(context, room, false)`
- `test-movement-scene-changes.spec.js` (exclusive) - a change point to a busy room (`WorldE2eStateApi.blockSceneChanges()`)
  gets the translated busy chat line, keeps the player walking and its retry after the block changes the room; the
  other client in the origin room gets the scene change broadcast, keeps its scene visible and removes the sprite and
  the target of the player that left; the client already in the destination room shows the arriving player with its
  name, avatar and direction; the room and position stored by a change point are loaded on the next login; a second
  visit to a room reuses its preloader scene (`reldens.createdPreloaderRecurring`); and a logout with a direction held
  leaves no movement interval in the room (`GameplayE2eStateApi.fetchMovementIntervals()`).
- `test-movement-change-points.spec.js` (exclusive) - a player placed below the forest change point
  (`RoomMovementApi.placePlayer()`) that walks into it with the up key held arrives standing still on the forest return
  point and walks again once the scene fade ends (the test repeats the key down like a real held key: the keys of the
  new scene only see the key events sent after they exist); a pointer move onto the change point tile finds no path
  (the change point tiles are blocked on the path finder grid); and the town house door object with no collision
  response is walked through from the town return point of the house into the house
- `test-movement-other-clients.spec.js` (exclusive) - the sprites a client shows for the other players of its room,
  read with the player engine offsets added back: a player that walked away before another client logs in is shown on
  its current server position and was added from the players queue (filled while the client engine has not started);
  a client logging in while another player walks a long pointer path sees it moving and stopping on its server
  position (the path ends three tiles before the map border, a sprite near the border is kept inside the world bounds);
  and an NPC dialog stays open when another player of the room changes scene
  The player dropped on the center of a change point body is pushed by the physics against the map border, so the walk
  after a rejected change starts from the room return point placed on the server
- `test-game-session-interruptions.spec.js` (exclusive) - a send while the room connection is closing (the socket
  `close()` sets the closing state at once, the send in the same page step is skipped without the connection lost
  modal, the room leave of the closed connection shows its server down modal); the F5 key marking the forced
  disconnection, so the connection the server drops right after shows no server down modal; a scene change whose
  reconnect fails after the next room join (a client `reldens.joinedRoom` listener throws) showing the reconnect modal;
  and the players state handler of the town switched on with its time out (`/api/e2e/game-session/state-handler`): the
  player joined without life is blocked (with a time out longer than the test), turns active once a short time out
  ends, and the player that leaves before it keeps the dead state on its removed schema
  (`/api/e2e/game-session/watch-player` keeps the schema to read it after the leave)
- `test-ad-skins-tickets.spec.js` (exclusive) - two tickets give two rewarded skin ads, each consuming one ticket (the
  consumed ticket row is deleted and the play stored as ended); a ticket trashed while the ad plays gives no skin item;
  two ticket uses sent at once give one skin item; the ticket use plays the skin ad on its own client only and never
  consumes the ticket of the other player in the room
- `test-ad-skins-ad-states.spec.js` (exclusive) - a skin ad ended while an open trade locks the inventory gives no skin
  item and keeps the ticket; a ticket traded away during the ad gives no skin item to anyone; the movement of a player
  in a skin ad is ignored until the ad ends (the walk to a clear line tile works again after the ad failure); the ad
  start of a walking player clears its movement intervals and stops it; a page
  reload during the ad keeps the ticket and the open play, the player is active on the new login and the kept ticket
  plays the ad again
- `test-ads-event-videos.spec.js` (exclusive) - the sample room activation ad played by the e2e SDK mock when the player
  logs in to its room (the SDK loads after the room activation, the provider queues the ad until it is ready) rewards
  its item without a ticket and stores the play as ended
- `test-teleport-npc.spec.js` (exclusive) - the teleport NPC option moves the player to its destination room; the long
  run moves the pointer off the NPC after the click (`ShowcaseSteps.clickObjectAndLeave()`), because a pointer that goes
  from the sprite to a DOM dialog never fires its pointer out and the green hover highlight stays on
- `test-teleport-npc-destinations.spec.js` and `test-teleport-npc-relocations.spec.js` (exclusive) - the town teleport
  NPC dialog opened next to it (`TeleportNpcSteps`), with an e2e destination option added to the live NPC for the
  group (`GameplayE2eStateApi.addTeleportOption()`) and the option sent as the dialog option message: the "Nowhere"
  option, a destination position and direction, an invalid position, a same room destination on both clients, an
  invalid room, a guest room without allowGuest (the guest rooms computed with allowOnRooms off), an option out of the
  options and out of reach; a disabled player, a blocked destination room, a failed state save, two option messages
  at once, an option while walking, the origin and destination room observers, two dialogs open and the stored room
  on the next login
- `test-teleport-npc-arrivals.spec.js`, `test-teleport-npc-options.spec.js`, `test-teleport-npc-observers.spec.js` and
  `test-teleport-npc-teams.spec.js` (exclusive) - the town teleport NPC Portia (`TeleportNpcSteps`): where a destination
  leaves the player (return point, position and direction, the stored room, the closed dialogs and the reconnect modal
  of a rejected join); the option checks (invalid values, another object id, out of reach, the room custom data, a
  second teleport and a guest); what the other town player keeps (its target cleared, its own NPC dialog, the game over
  box, a skill or a cast on the teleported player); and the clan kept by a teleported member (a team is disbanded,
  ISSUE #351). The direct PvP attack and kill steps live in `helpers/test-combat-death.js`
- `test-death-player-kill.spec.js` (exclusive) - a player killed by another player with the death teleport on revives
  in the town, and with the death teleport off the teleport NPC dialog choice is ignored and the player revives in the
  town room at the game over time
- `test-npc-dialogs.spec.js`, `test-npc-dialog-players.spec.js` and `test-npc-rewards.spec.js` (exclusive) - the town
  NPC dialogs (`helpers/npc-dialog-steps.js`: the NPC random movement stopped on its original tile, the player placed
  next to it, the room custom data and one live object property changed for the group through
  `/api/e2e/live-objects/object-property`): the stored title and content, the close and the pause list, the
  interaction out of reach or disallowed, the real canvas click; the dialogs of several players and the scene change;
  and the healer, weapons master and quest NPC options with their answers and items
- `test-trader-shop.spec.js` and `test-trader-rules.spec.js` (exclusive) - the town trader Gimly
  (`helpers/trader-steps.js`, the player inventory preserved and the traded quantities set on the live inventory, the
  prices and rewards read from the stored rows): the real Buy and Sell buttons, the cart, the confirmed texts, the
  bought and sold items stored and kept after a new login; the refused items without coins or with invalid
  quantities, the unknown actions and sub actions, a sub action with no transaction (the live trader transactions
  cleared first, ISSUE #356), a confirm after the close, out of reach with and without the close, two players at once,
  one player closing while the other confirms and the clean shop after a new login
- `test-animation-objects.spec.js` (exclusive) - the town house door run on hit and visible to the room (both clients
  play it, the other client rewinds and pauses it after its stored restart time) or changed to be visible only to the
  player, and Alfred run on action visible only to the player or changed to the room (the animation messages recorded
  on both clients and the sprite animation events watched); the door walk is
  `ChangePointsSteps.walkUpIntoRoom()`
- `test-death-teleport.spec.js` (exclusive) - the dead player revives in the town, or in the forest consuming the
  restoration item seeded or rewarded by the resurrection ad played while dead; without the restoration item auto
  consume the game over box asks to use the item (yes revives in the forest consuming it, no keeps it and revives in
  the town); without the auto revive the box tells the seconds left, the player stays dead once that time passed and
  the revive button revives it where it died, with the teleport disabled or consuming the chosen item. The death and
  revive steps live in `helpers/death-revive-steps.js` (`DeathReviveSteps`, over a context with the page, the
  screenshots, the game config, the e2e group and the long run flag); the long run ones in
  `helpers/death-revive-showcase.js` (`DeathReviveShowcase`): the group gets a 5 seconds game over time, 9 when the box
  asks for the item, plus the ad duration in the ad case, and no item drop (`server/players/drop/percent` 0), the
  player life is lowered before the recording, the steps tell the general flow of each case (the attack, the death and
  how the case goes on, the choice, the revive) and the clicks hover the button near its corner, so the recorded cursor
  never hides its label
- `test-scores-reset.spec.js` (exclusive) - the check on a new period deletes every score and empties the open scores
  panel, the panels of the players in the same and in another scene room (`Login.startThirdPlayer()` in the forest)
  with their own scores at 0, a panel closed during the reset and the panel of a player away during the reset after
  its login; the scores rows and the last period key row are preserved and created again by the group reset
- `test-scores-panel.spec.js` (exclusive) - the scores panel own score line, configured labels, close and reopen, the
  join broadcast of the room only and the panel across a scene change; the scores rows of the group players are
  preserved and every seeded total is set over the highest stored score, so the seeded rows are always in the top 10;
  `test-scores-page.spec.js` (exclusive) covers the full scores page pager, invalid page parameters and page sizes, the
  tied scores order and the title. Both check a player named with the stored HTML payload
  (`KillScoreSteps.createHtmlNamedPlayer()`, seeded straight in the database since the player creation cleans the
  names) shown as text with no script run (`KillScoreSteps.expectNameAsText()`)
- `test-teams-scene-change.spec.js` (exclusive) - the team kept across a scene change (`TeamSteps.changeScene()` places
  the player on the change point and records its room messages and chat again once the preloader of the new scene runs),
  the owner client of the team after the owner scene change (`GET /api/e2e/teams/owner-session`), a team deleted while
  the member changes the scene (its join to the next room held by a `page.route()` on the matchmake request) and a team
  update received before the UI scene exists (`POST /api/e2e/teams/changing-room-record` seeds the scene change record
  of a logged out player); the cases that end with a team of three disband it before the pages close
- `test-teams-cancelled-events.spec.js` (exclusive) - every cancellable team and clan event cancelled for the group
  (`TeamSteps.cancelEvent()`, `POST /api/e2e/live-objects/cancel-event` with the flag of that event); the clan cases wait
  for the cancelled run of the event (`TeamSteps.waitForCancelled()` reads the count of every cancelled event from
  `GET /api/e2e/live-objects/cancelled-events`) instead of a fixed pause
- `test-clans-members.spec.js` and `test-clans-sessions.spec.js` (exclusive) - the clan leave, remove and disband
  flows, the members across reloads, scene changes and logins, and the clan lines. `ClanSteps.enterWithClan()` seeds a
  clan level modifier of `atk`, enters the group players, preserves their clan rows and creates the clan with the given
  members, and `ClanSteps.seedGroupClan()` seeds a clan before the logins (with the owner player id as clan id for the
  shared leave class case, which needs that id free: every clan spec preserves the clan rows it creates). The clan
  message received before the UI scene exists is forced by holding the preloader loading template
  (`**/assets/html/ui-loading.html`) until the clan update is queued on the page

- `test-locale-selector-rules.spec.js` and `test-locale-selector-sessions.spec.js` (exclusive, they change the shared
  locales and the town room custom data) - the language selector with one locale left, the guest default locale, a
  saved locale disabled later, the options labels, the save error of a change blocked by the room actions (translated
  in the active locale), after a scene change and only for its player, a change right before a reload, after the
  connection closed, from a dead player and from a guest. `LocaleSteps` seeds the locales and snippets for the group
  (the server locales are reloaded through `POST /api/e2e/data/reload-locales`, and again by the group reset), changes
  a locale row with its values preserved, preserves the user locale rows and reads the client active locale

- `test-quests-tracking.spec.js` (exclusive, it seeds global quest rows that every player gets and changes the rooms) -
  the quest keys of the player and global rows on every room join, a row added during the session or after the logout
  and the guest rows; the seeded `questsProgress` rows use the `e2e-quest-` keys and only those keys are compared

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
