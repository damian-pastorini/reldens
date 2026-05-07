## Project Overview

Reldens is an MMORPG Platform (v4.0.0-beta.39) built on Node.js for developers to create multiplayer games.

- **Server**: Colyseus 0.16 (authoritative game server, WebSockets via `@colyseus/ws-transport`)
- **Client**: Phaser 3 (game engine), Parcel 2 (bundler)
- **Database**: Multi-driver via `@reldens/storage` (Prisma, ObjectionJS, MikroORM)
- **Node Version**: >= 20.0.0

## @reldens Packages

### `@reldens/utils`

Provides the core utilities used throughout the entire codebase on both client and server:

- **`sc` (Shortcuts)**: imported as `sc` from `@reldens/utils`. Used everywhere for safe operations: `sc.get(obj, 'key', default)`, `sc.hasOwn(obj, 'key')`, `sc.isArray(v)`, `sc.deepMergeProperties(target, source)`.
- **`EventsManagerSingleton`**: global event bus shared across all modules. Plugins and features hook into lifecycle events via `events.on('reldens.eventName', callback)`. Events fire with `events.emit()` (async) or `events.emitSync()` (sync).
- **`Logger`**: structured logging with levels (critical, error, warning, notice, info, debug). Configured via `RELDENS_LOG_LEVEL`.
- **`ErrorManager`**: standardized error throwing used in server-side validation.

### `@reldens/server-utils`

Server-only utilities:

- **`FileHandler`**: all file I/O in the codebase goes through this class. Never use Node.js `fs` directly.
- **`AppServerFactory`**: creates the Express app and HTTP/HTTPS server. Used in `ServerManager` to set up the web server before Colyseus attaches to it.

### `@reldens/storage`

Abstracts the database across three ORM drivers (Prisma, ObjectionJS, MikroORM). The key interface is `BaseDriver`, returned by `dataServer.getEntity('entityName')`:

```javascript
/** @type {import('@reldens/storage').BaseDriver} */
let repo = this.dataServer.getEntity('stats');
await repo.create({key: 'hp', label: 'Health Points'});
await repo.loadAll();
await repo.loadOneBy('key', 'hp');
await repo.loadBy('scope', 'server');
await repo.updateById(1, {label: 'HP'});
```

Entity names map to database tables. All 60+ entities are listed in `.claude/entities-reference.md`.

### `@reldens/cms`

Provides the admin panel UI. Wired into Reldens via `lib/admin/server/plugin.js`, which registers routes, entity editors, and wizard subscribers on the Express app. The panel is accessible at `/reldens-admin`. See `.claude/admin-panel-guide.md` for its sections and usage.

### `@reldens/items-system`

Manages items, equipment slots, and consumables. Integrated via `lib/inventory/server/plugin.js` and `lib/inventory/client/plugin.js`. The server-side plugin loads player inventories on scene join and handles item use/equip messages.

### `@reldens/modifiers`

Applies stat modifiers to players and NPCs. Used in `lib/actions/server/plugin.js` and `lib/actions/server/battle.js` to calculate changes to HP, attack, defense, and other stats during combat or skill activation.

### `@reldens/skills`

Manages class paths, skill trees, and skill casting. Integrated in `lib/actions/server/plugin.js` - when a player joins a scene, their skills are loaded via `lib/actions/server/skills-class-path-loader.js` and attached to the player object. Skills fire events before and after casting that other modules can hook into.

## Architecture

### Module Structure

Each feature lives under `lib/{feature}/` and contains:

- `client/` - Phaser UI, client-side logic
- `server/` - Colyseus room logic, database access
- `constants.js` - shared constants between client and server
- `schemas/` - Colyseus state schemas (where applicable)

The 23 modules: Game, Rooms, World, Config, Features, Actions, Inventory, Respawn, Rewards, Scores, Teams, Users, Chat, Audio, Prediction, Admin, Firebase, Ads, Import, Objects, Snippets, Bundlers.

See `.claude/feature-modules.md` for details on each module.

### Entry Points

- `server.js` - exports `ServerManager` from `lib/game/server/manager.js`
- `client.js` - exports `GameManager` from `lib/game/client/game-manager.js`
- `theme/default/index.js` - bundled client entry: instantiates `GameManager`, registers custom plugins, starts on `DOMContentLoaded`

## Server Startup Flow

1. `theme/plugins/server-plugin.js` instantiates `ServerManager` with a config object.
2. `ServerManager` constructor loads `.env` via `dotenv`, creates `ThemeManager` and `AppServerFactory`, sets up the `Installer`.
3. `createServers()` creates the Express/HTTP app server. If not yet installed, it launches the web installer and halts.
4. Once installed, `start()` runs in sequence:
   - `initializeStorage()` - connects to database, generates entities via the configured driver
   - `initializeConfigManager()` - loads all config from the `config` table into `ConfigManager`
   - `themeManager.validateOrCreateTheme()` - copies assets to the dist folder
   - `startGameServerInstance()` - loads maps, creates Colyseus `GameServer`, initializes all managers
5. Manager initialization order: `Mailer` -> `FeaturesManager` -> `UsersManager` -> `RoomsManager` -> `LoginManager` -> `defineServerRooms()`
6. `FeaturesManager.loadFeatures()` queries the `features` table for `is_enabled=1`, instantiates each feature package, and calls `setup()` on it. After all features load, fires `reldens.serverConfigFeaturesReady`.
7. `RoomsManager` registers the login room and all scene rooms on the Colyseus game server.
8. `ThemeManager.createClientBundle()` runs Parcel to build the client bundle if `RELDENS_ALLOW_RUN_BUNDLER=1`.
9. `gameServer.listen(port)` opens the WebSocket server and fires `reldens.serverReady`.

## Client Startup Flow

1. `theme/default/index.js` instantiates `GameManager`, registers any custom client plugin, and calls `clientStart()` on `DOMContentLoaded`.
2. `clientStart()` renders the login/register UI in the DOM.
3. On form submit, `startGame(formData)` -> `joinGame()` connects to the `ROOM_GAME` login room via WebSocket.
4. The server `RoomLogin.onAuth()` validates credentials, loads the player from the database, and sends back a `START_GAME` message containing the game config, features list, and player data.
5. The client receives `START_GAME`, merges the game config into `ConfigManager`, loads client-side features via `FeaturesManager.loadFeatures()`, and calls `initEngine()`.
6. `initEngine()` creates the `GameEngine` (Phaser instance), joins any feature-specific rooms (chat, teams, etc.), then joins the player's scene room.
7. A `RoomEvents` instance is created for the scene and `activateRoom()` begins listening to Colyseus state changes, setting up physics body callbacks and player rendering.

## Scene Room Flow

Each scene room extends `RoomScene extends RoomLogin` (`lib/rooms/server/scene.js`):

- `onCreate` - initializes physics world (`lib/world/server/p2world.js`), collision handlers (`lib/world/server/collisions-manager.js`), loads objects via `lib/objects/server/manager.js`
- `onAuth` - validates the joining player (inherited from `RoomLogin`)
- `onJoin` - creates the server-side player object, loads stats/skills/inventory, adds body to physics world
- `onMessage` - routes incoming messages to registered action handlers
- `onLeave` - removes player body from world, persists state
- `onDispose` - cleans up the physics world and all object instances

## Admin Flow

The admin panel is mounted by `lib/admin/server/plugin.js` during server startup. It uses `@reldens/cms` to expose entity editors over HTTP at `/reldens-admin`.

Entity changes go through the same `dataServer.getEntity()` pattern. With `RELDENS_HOT_PLUG=1`, config changes are applied to the running server without restart. Without it, a restart is required for changes to take effect.

See `.claude/admin-panel-guide.md` for which entities are managed through admin vs SQL.

## Installation

On first launch (no lock file), the server starts the web installer at `http://localhost:8080`. The wizard:

1. Collects database connection settings
2. Runs migrations and seeds sample data
3. Generates storage entities for the selected driver
4. Writes `.env` and creates the installation lock file

```bash
npm start
# Navigate to http://localhost:8080 to run the installer
```

See `.claude/installer-guide.md` for supported storage drivers and manual setup options.

## Configuration

1. **Database** (`config` table): path-based keys (e.g. `server/players/guestsUser/emailDomain`) scoped by `scope` field (`server` or `client`)
2. **Environment** (`.env`): `RELDENS_*` prefix for all settings, loaded via `dotenv` at startup
3. **Custom Classes**: passed via `customClasses` in the `ServerManager` config object to override default implementations

Key variables: `RELDENS_STORAGE_DRIVER`, `RELDENS_DB_*`, `RELDENS_HOT_PLUG`, `RELDENS_LOG_LEVEL`.

See `.claude/environment-variables.md` for the full list.

## Theme & Client Bundling

`ThemeManager` (`lib/game/server/theme-manager.js`) resolves all paths between the project root, `theme/`, and `dist/`, and drives Parcel bundling.

- `theme/default/` - default HTML, CSS, sprites, audio
- `theme/plugins/` - custom server and client plugins
- `theme/admin/` - admin panel CSS and template overrides

Use `themeManager.createClientBundle()` for bundling (checks `RELDENS_ALLOW_RUN_BUNDLER`). Do not call `buildClient()` or `buildCss()` directly during startup.

## Essential Commands

```bash
# Unit tests
npm test
# Build styles and client
npm exec -- reldens buildSkeleton
# Full rebuild from scratch
npm exec -- reldens fullRebuild
# Regenerate DB entities
npm exec -- reldens generateEntities [--override]
# Create admin user
npm exec -- reldens createAdmin --user=u --pass=p --email=e
# Reset password
npm exec -- reldens resetPassword --user=u --pass=p
```

See `.claude/commands-reference.md` for the full command reference.

## Reference Documentation

- `.claude/commands-reference.md` - All CLI commands
- `.claude/environment-variables.md` - All `RELDENS_*` variables
- `.claude/feature-modules.md` - All 23 feature modules
- `.claude/storage-architecture.md` - Entity management deep dive
- `.claude/entities-reference.md` - All 60+ entity types
- `.claude/admin-panel-guide.md` - Admin panel sections and entity overrides
- `.claude/installer-guide.md` - Web-based installation wizard
- `.claude/player-animations-configuration.md` - Sprite size, frame ranges, class-path overrides

## Community & Support

- **Documentation**: https://www.reldens.com/documentation/installation
- **Discord**: https://discord.gg/HuJMxUY
- **Issues**: https://github.com/damian-pastorini/reldens/issues
