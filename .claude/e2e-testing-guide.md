# E2E Testing Guide

Playwright end-to-end suite under `tests/e2e/`. It boots a real Reldens server against a real database and
drives the real client in a browser.

ALL TESTS (UNIT, INTEGRATION, E2E) MUST ALWAYS RUN IN THEIR OWN SELF-HOSTED ENVIRONMENT: the e2e suite boots its own
server (see "App under test") and the unit and integration tests run with `RELDENS_TESTS_CONFIRMED=1 npm run
test:default` (`tests/default/run-default.js`, it boots its own server on the `tests/config.json` port + 100), never
with `npm test`, which targets an external server on the `tests/config.json` port that nothing starts (every admin
integration test then fails with an empty `Error:`, the connection refused). Every checkout uses its own
`tests/config.json` test database and ports.

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
- `forest` - combat, stats, interactive objects, timing objects, objects movement, animation frames, auto recovery,
  kill score and item growth, users set 1 (`root4` to `root6`), start room `reldens-forest-level-1`
- `social` - chat, teams, clans, trading, items, rewards, scores, locale selector, quests, the game login flow and the
  ad skins, users set 2 (`root7` to `root9`), start room `reldens-new-age-town-house-01`
- `exclusive` - the specs that change the server wide state (login and admin security, the scores reset), create
  players (authentication, character system) or use more than one room (movement, client interpolation, teleport NPC,
  death teleport), users set 0, it runs after every other group ended and its reset restores every room

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
- `test-ad-skins.spec.js` (social) - the skin ticket use keeps the ticket, the played skin ad consumes it and rewards
  the skin item, and equipping it changes the server and client avatar until it is unequipped; a failed skin ad (the
  mock calls the provider error callback after the server opened the play) closes the play keeping the ticket and gives
  no skin item
- `test-teleport-npc.spec.js` (exclusive) - the teleport NPC option moves the player to its destination room; the long
  run moves the pointer off the NPC after the click (`ShowcaseSteps.clickObjectAndLeave()`), because a pointer that goes
  from the sprite to a DOM dialog never fires its pointer out and the green hover highlight stays on
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
  panel; the scores rows and the last period key row are preserved and created again by the group reset

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
