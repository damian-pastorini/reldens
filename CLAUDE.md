# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Reldens is an MMORPG Platform (v4.0.0-beta.39) built on Node.js, designed for developers to create multiplayer games. The platform integrates:
- **Server**: Colyseus 0.16 for multiplayer game server
- **Client**: Phaser 3 for game engine, Parcel for bundling
- **Database**: Supports multiple storage drivers (objection-js, mikro-orm, prisma)
- **Architecture**: Client-server with authoritative server, real-time synchronization via WebSockets

**Node Version**: >= 20.0.0

### Sub-Packages
- **@reldens/utils** - Core utilities, Shortcuts class (imported as `sc`), EventsManagerSingleton, Logger
- **@reldens/server-utils** - Server utilities, FileHandler, configuration helpers
- **@reldens/storage** - Multi-ORM database layer (ObjectionJS, MikroORM, Prisma)
- **@reldens/cms** - Content management system and admin panel
- **@reldens/items-system** - Items and inventory system
- **@reldens/modifiers** - Stats and modifiers system
- **@reldens/skills** - Skills and abilities system

## Essential Commands

```bash
# Testing
npm test
node tests/manager.js --filter="test-name" --break-on-error

# Building
reldens buildSkeleton                   # Build both styles and client
reldens fullRebuild                     # Complete rebuild from scratch

# Database
reldens generateEntities [--override]   # Generate entities from database schema

# User management
reldens createAdmin --user=username --pass=password --email=email@example.com
reldens resetPassword --user=username --pass=newpassword
```

**Full command reference**: See `.claude/commands-reference.md`

## Architecture Overview

### Client-Server Organization
The codebase follows a **client/server split architecture** within each feature module:

```
lib/
  ├── {feature}/
  │   ├── client/           # Client-side code (Phaser, UI, rendering)
  │   ├── server/           # Server-side code (Colyseus rooms, logic)
  │   ├── constants.js      # Shared constants
  │   └── schemas/          # Colyseus state schemas (if applicable)
```

### Core Entry Points
- **Server**: `server.js` → `lib/game/server/manager.js` (ServerManager)
- **Client**: `client.js` → `lib/game/client/game-manager.js` (GameManager)
- **Theme**: `theme/default/index.js` initializes client with custom plugins

### Feature Modules (23 Total)
The platform includes 23 feature modules: Game, Rooms, World, Config, Features, Actions, Inventory, Respawn, Rewards, Scores, Teams, Users, Chat, Audio, Prediction, Admin, Firebase, Ads, Import, Objects, Snippets, Bundlers.

**Detailed list**: See `.claude/feature-modules.md`

## Configuration System

Reldens uses a **database-driven configuration** with runtime overrides:

1. **Database Config** (`config` table): Path-based keys, scoped by `scope` field
2. **Environment Variables** (`.env`): Prefix `RELDENS_*` for all settings
3. **Custom Classes**: Passed via `customClasses` to override defaults

**Key Environment Variables:**
- `RELDENS_STORAGE_DRIVER` - Storage driver (objection-js, mikro-orm, prisma)
- `RELDENS_DB_HOST`, `RELDENS_DB_PORT`, `RELDENS_DB_NAME`, `RELDENS_DB_USER`, `RELDENS_DB_PASSWORD`
- `RELDENS_HOT_PLUG` - Enable hot-plug configuration updates (0/1)

**Full environment variables list**: See `.claude/environment-variables.md`

## Events System

The platform uses **@reldens/utils EventsManagerSingleton** for extensibility:

**Common Event Patterns**:
- `reldens.{action}Before` - Hook before operation
- `reldens.{action}After` - Hook after operation
- Events are synchronous (`emitSync`) or async (`emit`)

**Key Events**:
- `reldens.serverConfigFeaturesReady` - Features loaded
- `reldens.beforeJoinGame` - Before player joins
- `reldens.startGameAfter` - Game initialized
- `reldens.roomLoginOnAuth` - Custom authentication logic

**Plugin Pattern**:
```javascript
class ServerPlugin {
    setup({events}) {
        events.on('reldens.serverConfigFeaturesReady', (props) => {
            // Custom logic here
        });
    }
}
```

## Storage & Entity Management

### CRITICAL: Understanding getEntity()

`dataServer.getEntity()` returns a `BaseDriver` instance from `@reldens/storage`, NOT an Entity or Model class.

```javascript
// Correct - returns BaseDriver
let statsRepository = this.dataServer.getEntity('stats');

// BaseDriver provides unified interface:
await statsRepository.create({key: 'hp', label: 'Health Points'});
await statsRepository.loadAll();
await statsRepository.loadOneBy('key', 'hp');
await statsRepository.updateById(1, {label: 'HP'});
```

**Type Annotation:**
```javascript
/** @type {import('@reldens/storage').BaseDriver} */
this.statsRepository = this.dataServer.getEntity('stats');
```

**Storage Drivers:**
- `prisma` (current default): Modern ORM with type safety, custom validation
- `objection-js`: Uses Knex.js, direct SQL, no validation
- `mikro-orm`: ORM with decorators, supports MongoDB

**Detailed architecture**: See `.claude/storage-architecture.md`
**Entity list**: See `.claude/entities-reference.md`

## Theme & Customization

**Theme Structure** (`theme/`):
- `plugins/` - Custom client/server plugins for game-specific logic
- `default/` - Default theme assets (HTML, CSS, sprites, audio)
- `admin/` - Admin panel customizations

**Theme Management:**
ThemeManager (`lib/game/server/theme-manager.js`) handles asset copying, bundling, and CSS compilation.

### Client Bundling Best Practices

**CRITICAL**: Always use `themeManager.createClientBundle()` instead of calling `buildClient()` or `buildCss()` directly:

- **createClientBundle()** - Wrapper that checks `RELDENS_ALLOW_RUN_BUNDLER` environment variable (used during server startup)
- **buildClient()** - Direct method that checks `RELDENS_ALLOW_BUILD_CLIENT` environment variable
- **buildCss()** - Direct method that checks `RELDENS_ALLOW_BUILD_CSS` environment variable

**Environment Variables:**
- `RELDENS_ALLOW_RUN_BUNDLER` - Controls `createClientBundle()` execution (default: 0)
- `RELDENS_ALLOW_BUILD_CLIENT` - Controls `buildClient()` execution (default: 1)
- `RELDENS_ALLOW_BUILD_CSS` - Controls `buildCss()` execution (default: 1)

**Why this matters:** Production servers can regenerate clients and run Parcel builds for hot-reloading. These environment variables allow you to control when bundling happens, preventing unexpected builds during startup or deployment.

## Colyseus 0.16 - CRITICAL State Synchronization

**CRITICAL TIMING ISSUE**: Colyseus 0.16 state synchronization is asynchronous.

### Problem Pattern (WRONG)
```javascript
listenMessages(room, gameManager) {
    if(!room.state || !room.state.bodies){
        return false;  // ❌ WRONG - callbacks never set up!
    }
    this.setAddBodyCallback(room, gameManager);
}
```

### Correct Pattern (RIGHT)
```javascript
listenMessages(room, gameManager) {
    if(!room.state || !room.state.bodies){
        room.onStateChange.once((state) => {
            this.setAddBodyCallback(room, gameManager);  // ✅ Wait for state
        });
        return false;
    }
    this.setAddBodyCallback(room, gameManager);
}
```

**Alternative - Use Reactive Patterns:**
```javascript
activateRoom(room) {
    this.playersManager = RoomStateEntitiesManager.onEntityAdd(
        room,
        'players',
        (player, key) => {
            this.handlePlayerAdded(player, key);
        }
    );
}
```

**CRITICAL**: Colyseus auto-cleans all listeners. Never store manager references or add manual disposal code unless explicitly needed.

### Room Lifecycle
1. `onCreate(options)`: Initialize world, physics, objects
2. Player joins → `onJoin(client, options)`
3. Message handling → `onMessage(client, message)`
4. Player leaves → `onLeave(client, consented)`
5. Room disposal → `onDispose()`

## Common Development Patterns

### Adding a New Feature
1. Create feature module in `lib/{feature-name}/`
2. Add database table in `migrations/`
3. Create client/server subdirectories
4. Add feature entry to `features` table
5. Register in `lib/features/server/config-server.js`
6. Implement `setup()` method to hook events

### Modifying Game Logic
- **Combat/Skills**: Edit `lib/actions/server/battle.js` or `pve.js`
- **Player Stats**: Configure via database `stats` table
- **Room Behavior**: Extend `RoomScene` or hook `reldens.createRoomAfter` event
- **Client Rendering**: Modify Phaser scenes in `lib/game/client/scene-*.js`

### Working with Database
- Always use entity models via `dataServer.getEntity()`, never raw SQL
- Generated entities are read-only; extend in `server/models/`
- Use migrations for schema changes
- Regenerate entities after schema changes: `reldens generateEntities --override`

## Important Notes

- **Authoritative Server**: All game logic runs on server; client is display-only
- **Hot Plug**: Admin panel changes reload without restart if `RELDENS_HOT_PLUG=1`
- **Logging**: Use `@reldens/utils/Logger` (configurable via `RELDENS_LOG_LEVEL`)
- **File Operations**: Always use `@reldens/server-utils FileHandler` (never Node.js `fs`)
- **Shortcuts Class**: Import as `sc` from `@reldens/utils` - provides `sc.get`, `sc.hasOwn`, `sc.isArray`, etc.
- **Colyseus 0.16**: All client callbacks use `StateCallbacksManager` and `RoomStateEntitiesManager`
- **Buffer Polyfill**: Required for Parcel bundling with Colyseus 0.16

## Analysis Approach

When working on code issues:
- Always investigate thoroughly before making changes
- Read related files completely before proposing solutions
- Trace execution flows and dependencies
- Provide proof for issues, never guess or assume
- Verify file contents before creating patches
- A variable with an unexpected value is not an issue, it is the result of a previous issue

## Community & Support

- **Discord**: https://discord.gg/HuJMxUY
- **Demo**: https://dev.reldens.com/
- **Documentation**: https://www.reldens.com/documentation/installation
- **Issues**: https://github.com/damian-pastorini/reldens/issues
- **Contact**: info@dwdeveloper.com

## Detailed Reference Documentation

- **Commands**: `.claude/commands-reference.md` - All CLI commands
- **Environment Variables**: `.claude/environment-variables.md` - All RELDENS_* variables
- **Feature Modules**: `.claude/feature-modules.md` - All 23 feature modules
- **Storage Architecture**: `.claude/storage-architecture.md` - Entity management deep dive
- **Entities**: `.claude/entities-reference.md` - All 60+ entity types
- **Installer**: `.claude/installer-guide.md` - Web-based installation wizard guide
