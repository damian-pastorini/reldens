# Server Health Monitor

Keeps every server of a game under configured usage limits. While a limit is exceeded the server is overloaded, and when the blocking is enabled an overloaded server is blocking: it rejects the new load, the new game logins, the players arriving from another server and the creation of new scene rooms. The players already in the game keep playing and moving between the rooms that already exist on that server. Before a player enters a room (login, player or room selection, scene change) the room availability is checked on the server of that room, so the player gets a message instead of a failed join. With the blocking disabled the health is only a monitor: the usage, the exceeded limits and the other servers are shown in the administration panel and nothing is rejected.

## Blocking Switch

`health/blockingEnabled` (env `RELDENS_HEALTH_BLOCKING_ENABLED`, default `1`) is the general switch of the whole blocking process:

- `ServerHealthMonitor` always samples the usage and computes the exceeded limits: `isOverloaded` is true while any limit is exceeded, `isBlocking` is `blockingEnabled && isOverloaded`. Both are in the `usageReport` with `blockingEnabled`.
- Every rejection reads `isBlocking`, never `isOverloaded`: the game login (`RoomLogin.isServerBlocking()`), the scene room creation (`RoomScene.onCreate()`) and the room availability.
- `RoomsAvailability.fetchRoomAvailability()` returns every room as available when the blocking is disabled, without requesting the other servers status, so the scene changes, the login without selection and the selection labels never block; a room of another server is not available when that server answers `isBlocking`, so a server with its own blocking disabled accepts the arriving players.
- The administration panel still requests every server status (`RoomsAvailability.fetchServersStatuses()`) and shows "OK, monitor only (blocking disabled)" or "Over the limits, monitor only (blocking disabled)" with the exceeded tiles marked.
- The overloaded state change logs a warning that says whether the new load is rejected or the blocking is disabled.

## Files

- `lib/game/server/health/constants.js` - `HealthConst`: the defaults, the limits checks and the signed status token value.
- `lib/game/server/health/server-usage-sampler.js` - `ServerUsageSampler`: reads the usage on every `sample()` call.
- `lib/game/server/health/server-health-monitor.js` - `ServerHealthMonitor`: samples on an interval, compares the usage with the limits and keeps `isOverloaded`, `isBlocking` and `usageReport`.
- `lib/game/server/health/remote-servers-status.js` - `RemoteServersStatus`: signed status requests to the other servers, with timeout, response time and cache.
- `lib/game/server/health/server-status-route.js` - `ServerStatusRoute`: answers the signed status requests of the other servers.
- `lib/game/server/health/rooms-availability.js` - `RoomsAvailability`: tells if a room can be entered, and lists every server status for the administration.
- `lib/admin/server/subscribers/server-health-subscriber.js` - `ServerHealthSubscriber`: the administration panel usage block and route.
- `theme/admin/templates/server-usage.html`, `theme/admin/js/admin-server-usage-renderer.js`, `theme/admin/css/container-server-usage.css` - the usage block markup, rendering and styles.

## Configuration

Environment variables `RELDENS_HEALTH_*` (see `.claude/environment-variables.md`) read by `EnvironmentVariablesReader.fetchHealthFromEnvironmentVariables()` into `server/health`, overridden by the `config` rows (scope `server`) installed by the basic configuration and the beta.39.9 update:

- `health/blockingEnabled` (boolean, `1`) - general switch of the whole blocking process; with `0` the health is only a monitor (see Blocking Switch).
- `health/checkIntervalMs` (`5000`) - interval between the checks, also the cache time of the other servers status; a value of 0 or lower does not start the checks.
- `health/maxMemoryPercent` (`90`) - maximum system memory used percent.
- `health/maxCpuPercent` (`90`) - maximum system CPU used percent of all the cores.
- `health/maxEventLoopDelayMs` (`1000`) - maximum mean event loop delay.
- `health/remoteStatusTimeoutMs` (`3000`) - time to wait for the status of another server.

Each limit is a maximum and `0` disables it. The rows are read once at startup, a change needs a restart.

## Usage Values

`ServerUsageSampler.sample()` returns:

- `memoryPercent` - `(os.totalmem() - os.freemem()) / os.totalmem()`. On Linux `os.freemem()` is the `MemAvailable` value (libuv 1.42.0 and later), so the reclaimable cache is not counted as used.
- `cpuPercent` - the not idle time of all the cores (`os.cpus()` times) since the previous sample, so it counts every process of the host (database, other Node.js apps), not only this server.
- `eventLoopDelayMs` - mean of the `perf_hooks.monitorEventLoopDelay()` histogram (20 ms resolution) minus the resolution, reset on every sample; it is 0 when no interval was recorded. The mean measures a sustained delay, a single long task does not move it much.
- `freeMemoryMb`, `totalMemoryMb`, `processMemoryMb` (RSS) and `heapUsedMb` - information only, without limits.

## Startup

`ServerManagersInitializer.initializeServerHealth()` runs after the `LoginManager`:

- creates the `ServerHealthMonitor` with `configManager.getWithoutLogs('server/health', {})` and calls `start()` (one check right away, then one per interval, the interval is `unref()`);
- creates the `RemoteServersStatus` with the `LoginManager` `expiringHmacToken` (the signed tokens secret shared by every server), `remoteStatusTimeoutMs` as timeout and `checkIntervalMs` as cache time;
- creates the `RoomsAvailability` with the monitor, the remote status, `RoomsManager.isRoomCreated()`, the `client/rooms/servers` map (room name to server URL, filled by `ServerConfigEnricher.enrichRoomsServersUrls()`) and this server URLs (`server/publicUrl` and `server/baseUrl`);
- registers `GET /reldens-server-status` (`GameConst.ROUTE_PATHS.SERVER_STATUS`, also in the `ServerManager.enableRoutesRateLimit()` list) answered by the `ServerStatusRoute`.

The monitor and the availability are kept on the `ServerManager` (`serverHealthMonitor`, `roomsAvailability`) and passed to every room options by `RoomsManager.defineRoom()`.

When the overloaded state changes the monitor logs one warning (with the exceeded limits, the usage and whether the new load is rejected or the blocking is disabled) or one notice when the usage is back under the limits.

## Room Availability

`RoomsAvailability.fetchRoomAvailability(roomName)` returns `{isAvailable, reason}`, the reason is a client snippet key from `GameConst.ROOM_UNAVAILABLE`:

- With the blocking disabled every room is available and no other server is requested.
- A room of this server (its server URL is this server or it is not in the map) is available when it is already created (`RoomsManager.isRoomCreated()`) or when this server is not blocking; otherwise `SERVER_BUSY`.
- A room of another server requests that server status (`RemoteServersStatus.fetchStatus()`): not reachable (timeout, network error, an error status like `403` for a different secret, or an invalid answer without `isBlocking`) is `SERVER_UNREACHABLE`; blocking is `SERVER_BUSY`, since that server rejects the arriving players even for its created rooms; otherwise available.

`RoomsAvailability.fetchRoomsAvailability(roomsNames)` requests every room at the same time, so the login with rooms of several not responding servers waits one timeout, not one per server.

The status request is `GET <server URL>/reldens-server-status?token=<ExpiringHmacToken>`, the token signs `HealthConst.STATUS_TOKEN_VALUE` and expires in `GameConst.SIGNED_TOKENS.SERVER_STATUS_EXPIRATION`. Without the signed tokens secret no token is generated and the other servers are not reachable, the same secret is already required by the multi-server user disconnection. The answers are cached per server for the cache time, the requests in progress are shared. A slow server that answers before the timeout is available, its response time is kept as `latencyMs` and shown in the administration panel. The Colyseus ping (`RELDENS_PING_INTERVAL`, `RELDENS_PING_MAX_RETRIES`) is a different thing: it closes the connected clients that stop answering.

## Cases

Every case below applies only with the blocking enabled, with the blocking disabled none of them rejects anything.

- Login on a blocking server: `RoomLogin.onAuth()` rejects the game room (`RoomsConst.ROOM_TYPE_GAME`) with `GameConst.SERVER_BUSY_MESSAGE` before the joins limit and the user load, the login, registration and guest forms show it.
- Player arriving from another server to an existing scene room of a blocking server: the source server checks the destination status before the scene change, but that status can be cached up to `checkIntervalMs` and the client skips the destination game room join when it already has that connection. So `RoomLogin.isArrivalRejected()` also rejects the scene room join (`RoomsConst.ROOM_TYPE_SCENE`) with `GameConst.SERVER_BUSY_MESSAGE` when the server is blocking and the user has no session in another scene room of this server (`ActivePlayers.playersSessionsByUserId` and the `roomType` of the `RoomsManager.createdInstances`). A move between the rooms of this server keeps working because the client joins the new room before leaving the previous one.
- Login without player selection (one player, `client/players/multiplePlayers/enabled` and `client/rooms/selection/allowOnLogin` disabled) when the room of the player is not available, on this or on another server: `RoomGame.onJoin()` rejects with `GameConst.PLAYER_ROOM_UNAVAILABLE_MESSAGE` before updating the last login, and the login form shows it.
- Login with player or room selection: `RoomGame.onJoin()` sends `roomsAvailability` (room name to availability) for the scenes of the players and the selection rooms in the start game message. The players options (when the room selection on login is disabled) and the room options show `game.roomUnavailableLabel` next to the not available ones.
- Starting with a selected player or room that can not be joined: `GameManager.initEngine()` creates the game engine once and moves the player scene only after the join, so `handleSceneJoinError()` shows the error in the player selection (`.player-selection-form-errors`, or the player creation form error) and the user can choose another player or room; without the selection screen it shows the error and reloads. The busy server message is translated to `game.errors.roomServerBusy`. The features rooms already joined are not joined again for the same player; when the user chooses another player, `GameManager.leaveFeaturesRoomsOfAnotherPlayer()` leaves them (the server `RoomChat.onLeave()` removes the previous active player) and they are joined again with the new selected player, so the chat messages are sent and saved with the right character.
- Scene change to a room that is not available: `RoomScene.nextSceneInitialPosition()` checks `isNextRoomAvailable()` before the changing scene broadcast and the player state save, so the player stays in the current room and receives a chat error message with the reason snippet (`game.errors.roomServerBusy` or `game.errors.roomServerUnreachable`); walking into the change point again retries.
- The server becomes overloaded after a player logged in: the moves between the already created rooms keep working, the moves to rooms that need to be created or to an overloaded server are rejected as above.
- The limit is reached between the availability check and the join (race): the scene room creation is rejected by `RoomScene.onCreate()` with `GameConst.SERVER_BUSY_MESSAGE`; on a scene change `GameManager.reconnectGameClient()` shows the translated busy message and reloads, on the start the player selection error or the reload above applies, and on the next login the cases above apply.
- Only the scene rooms creation is rejected: the game room and the features rooms (chat and others) are light and are created at the first login.

## Administration Panel

`ServerHealthSubscriber` is created by the `AdminPlugin` on `reldens.beforeSetupAdminManager` with `serverManager.roomsAvailability`:

- Its constructor replaces the `{{&serverUsage}}` placeholder of `adminFilesContents.dashboard` and `adminFilesContents.management` with the `serverUsage` template (`TemplatesList`), before `buildAdminContents()` renders and caches the pages. The dashboard shows the block in its first panel, above the "Logged users" panel, the control panel (Server Management page) shows it in its own box.
- On `reldens.setupAdminManagers` it registers the authenticated `GET <admin path>/server-health/usage` route, which answers `{servers: RoomsAvailability.fetchServersStatuses()}`: this server first and then every other server of the rooms (requested in parallel, cached), each with `serverUrl`, `isSelf`, `isReachable`, `latencyMs`, `usageReport` (`blockingEnabled`, `isOverloaded`, `isBlocking`, `exceededLimits`, `limits`, `usage`) and `error`.
- `admin-server-usage-renderer.js` requests the route every `data-refresh-ms` (5000), resolving the admin path from the page path, and renders one block per server from the `.server-item-template` element: the server URL, the status (OK, overloaded and blocking, monitor only with or without exceeded limits, or not available with the error), the response time of the other servers and the usage tiles from the `data-usage-key`, `data-limit-key` and `data-unit` attributes, the exceeded tiles get the `exceeded` class.

Projects created before this feature do not have the new admin files. `AdminPlugin.extendAdminTemplates()` (on `reldens.beforeCreateAdminManager`, before the templates loader) points `adminTemplates.serverUsage` to the reldens package `theme/admin/templates/server-usage.html` when the project file is missing and logs a warning, since the admin templates loader fails and the whole administration panel is not activated when a registered template is missing. The project dashboard and control panel templates without the `{{&serverUsage}}` placeholder simply do not show the block; run `reldens copyAdmin` and then `reldens copyAdminFiles` to get the block, its JS and its CSS.

## Tests

- `tests/test-server-health-monitor.js` - limits evaluation, separated CPU and memory limits, disabled limits, the monitor only mode with the blocking disabled, recovery, start, the sampler values and CPU percent, the environment variables.
- `tests/test-rooms-availability.js` - local created and not created rooms while blocking, remote blocking, unreachable and available servers, every room available without requests with the blocking disabled, the rooms of different servers requested at the same time, the servers statuses list.
- `tests/test-remote-servers-status.js` - the signed request answered by the `ServerStatusRoute`, the different secret rejection, the failed request, the missing secret and the cache.
- `tests/test-server-health-subscriber.js` - the block injection into the real templates and the servers usage route.
- `tests/test-room-login-auth.js` - the game login rejected while blocking, the scene join of a player moving between the rooms of this server accepted and of a player arriving from another server rejected.
- `tests/test-scene-join-admission.js` - the scene room creation rejected while overloaded, the scene change to a not available room and to an available room.
- `tests/test-login-manager-user-request.js` - the login without selection rejected for a not available player room, the rooms availability sent for the selection, the join of an already selected player.
