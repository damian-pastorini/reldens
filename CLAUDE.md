# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Reldens is an MMORPG Platform built on Node.js, designed for developers to create multiplayer games. The platform integrates:
- **Server**: Colyseus for multiplayer game server
- **Client**: Phaser 3 for game engine, Parcel for bundling
- **Database**: Supports multiple storage drivers (objection-js, mikro-orm) with MySQL/MongoDB
- **Architecture**: Client-server with authoritative server, real-time synchronization via WebSockets

## Key Commands

### Development & Building
```bash
# Run tests
npm test
# Or with filters
node tests/manager.js --filter="test-name" --break-on-error

# Build commands (via reldens CLI)
reldens buildCss [theme-name]           # Build theme styles
reldens buildClient [theme-name]        # Build client HTML
reldens buildSkeleton                   # Build both styles and client
reldens fullRebuild                     # Complete rebuild from scratch

# Theme & asset management
reldens installDefaultTheme             # Install default theme
reldens copyAssetsToDist                # Copy assets to dist folder
reldens resetDist                       # Delete and recreate dist folder

# Database & entities
reldens generateEntities [--override]   # Generate entities from database schema
# This reads .env credentials and uses @reldens/storage to generate entities
# Generated entities are placed in the generated-entities/ directory
```

### Installation & Setup
```bash
reldens createApp                       # Create base project skeleton
reldens copyEnvFile                     # Copy .env.dist template
reldens copyKnexFile                    # Copy knexfile.js template
reldens copyIndex                       # Copy index.js template
```

## Architecture & Code Structure

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
- **Theme**: `theme/index.js` initializes client with custom plugins

### Major Feature Modules

**Actions** (`lib/actions/`): Combat system (PvP/PvE), skills, battle mechanics
- Server handles authoritative battle calculations
- Client receives battle states and renders animations

**Chat** (`lib/chat/`): Multi-channel chat (global, room, private messages)

**Inventory** (`lib/inventory/`): Items system with equipment and usable items

**Objects** (`lib/objects/`): Game objects (NPCs, interactables, respawn areas)
- `server/manager.js` loads and manages room objects
- Objects can listen to messages via `listenMessages` interface

**Rooms** (`lib/rooms/`): Core multiplayer room system
- `server/scene.js` (RoomScene): Main game room with physics, collisions, objects
- `server/login.js` (RoomLogin): Authentication and player initialization
- Client connects via `room-events.js` to handle server state synchronization

**Users** (`lib/users/`): Authentication, registration, player management
- Supports guest users, Firebase authentication
- `server/login-manager.js` handles all auth flows

**World** (`lib/world/`): Physics engine integration (P2.js), pathfinding, collisions

**Features** (`lib/features/`): Plugin-like modular system
- Features are loaded from database (`features` table with `is_enabled` flag)
- `server/manager.js` (FeaturesManager) dynamically loads enabled features
- Each feature can hook into events via `setup()` method

### Configuration System

Reldens uses a **database-driven configuration** with runtime overrides:

1. **Database Config** (`config` table):
   - Path-based keys (e.g., `server/rooms/disposeTimeout`)
   - Scoped by `scope` field (server/client)
   - Loaded by `ConfigManager` and exposed as nested objects

2. **Environment Variables** (`.env`):
   - Prefix: `RELDENS_*`
   - Database credentials, server settings, feature flags
   - See `lib/game/server/install-templates/.env.dist` for all options

3. **Custom Classes**: Passed via `customClasses` to override default implementations

### Events System

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

**Event Usage**: Server plugins and theme plugins hook events in `setup()` method

### Storage & Entity Management

**Entity Generation Workflow**:
1. Define database schema (SQL migrations in `migrations/`)
2. Run `reldens generateEntities --override`
3. Entities are generated in `generated-entities/`
4. Models in each feature's `server/models/` extend generated entities

**Storage Drivers**:
- `objection-js` (default): Uses Knex.js for SQL
- `mikro-orm`: ORM with decorators
- Configured via `RELDENS_STORAGE_DRIVER` in `.env`

**Entity Access**:
```javascript
// Via dataServer
let features = await this.dataServer.getEntity('features').loadAll();
let player = await this.dataServer.getEntity('players').load(playerId);
```

### Theme & Customization

**Theme Structure** (`theme/`):
- `index.js`: Client entry point with custom plugin setup
- `plugins/`: Custom client/server plugins for game-specific logic
  - `client-plugin.js`: Hooks client events
  - `server-plugin.js`: Hooks server events
- `default/`: CSS, assets, HTML templates
- `admin/`: Admin panel customizations

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

### Colyseus Room Lifecycle

**RoomScene** (main game room) lifecycle:
1. `onCreate(options)`: Initialize world, physics, objects
2. Player joins → `onJoin(client, options)`
3. Message handling → `onMessage(client, message)`
4. Player leaves → `onLeave(client, consented)`
5. Room disposal → `onDispose()`

**State Synchronization**:
- Server uses Colyseus Schema for state (see `lib/rooms/server/state.js`)
- Client listens to state changes in `room-events.js`
- Players, objects, and world state auto-sync to clients

## Common Development Patterns

### Adding a New Feature
1. Create feature module in `lib/{feature-name}/`
2. Add database table for feature config in `migrations/`
3. Create client/server subdirectories with appropriate code
4. Add feature entry to `features` table in database
5. Register in `lib/features/server/config-server.js` (ServerCoreFeatures)
6. Implement `setup()` method to hook into events

### Modifying Game Logic
- **Combat/Skills**: Edit `lib/actions/server/battle.js` or `pve.js`
- **Player Stats**: Configure via database `stats` table, processed by modifiers system
- **Room Behavior**: Extend `RoomScene` or hook `reldens.createRoomAfter` event
- **Client Rendering**: Modify Phaser scenes in `lib/game/client/scene-*.js`

### Working with Database
- Always use entity models, never raw SQL queries
- Generated entities are read-only; extend in `server/models/`
- Use migrations for schema changes
- Regenerate entities after schema changes

## Important Notes

- **Node Version**: Requires Node.js >= 20.0.0
- **Authoritative Server**: All game logic must run on server; client is display-only
- **Hot Plug**: Admin panel changes can reload without restart if `RELDENS_HOT_PLUG=1`
- **Entity Relations**: Use keys defined in `generated-entities/entities-config.js`
- **Logging**: Use `@reldens/utils/Logger` with configurable log levels (RELDENS_LOG_LEVEL)
- **Parcel Bundling**: Client code is bundled by Parcel; builds go to `dist/`
