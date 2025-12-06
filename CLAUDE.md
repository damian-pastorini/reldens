# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Reldens is an MMORPG Platform (v4.0.0-beta.39) built on Node.js, designed for developers to create multiplayer games. The platform integrates:
- **Server**: Colyseus for multiplayer game server
- **Client**: Phaser 3 for game engine, Parcel for bundling
- **Database**: Supports multiple storage drivers (objection-js, mikro-orm, prisma) with MySQL/MongoDB
- **Architecture**: Client-server with authoritative server, real-time synchronization via WebSockets

## Project Structure

### Main Project
- `reldens/lib` - Main Reldens source code

### Sub-Packages
All related packages are:
- **@reldens/utils** - Core utilities, Shortcuts class (imported as `sc`)
- **@reldens/server-utils** - Server utilities, FileHandler, configuration helpers
- **@reldens/storage** - Multi-ORM database layer (ObjectionJS, MikroORM, Prisma)
- **@reldens/cms** - Content management system and admin panel
- **@reldens/items-system** - Items and inventory system
- **@reldens/modifiers** - Stats and modifiers system
- **@reldens/skills** - Skills and abilities system
- **@reldens/tile-map-generator** - Procedural map generation
- **@reldens/game-data-generator** - Game data generation utilities
- **@reldens/markdown** - Markdown processing utilities
- **tile-map-optimizer** - Map optimization tools

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

# Direct entity generation with connection arguments (bypasses .env):
npx reldens-storage generateEntities --user=reldens --pass=reldens --database=reldens_clean --driver=objection-js
```

### Prisma-Specific Commands

**IMPORTANT:** Prisma requires a separate client generation step before entities can be generated.

```bash
# Step 1: Generate Prisma schema and client from existing database
# This introspects the database and creates prisma/schema.prisma + prisma/client/
npx reldens-storage-prisma --host=localhost --port=3306 --user=reldens --password=reldens --database=reldens_clean --clientOutputPath=./client

# Step 2: Generate Reldens entities using Prisma driver
npx reldens-storage generateEntities --user=reldens --pass=reldens --database=reldens_clean --driver=prisma

# Full parameter list for reldens-storage-prisma:
# --host          Database host (default: localhost)
# --port          Database port (default: 3306)
# --user          Database username (required)
# --password      Database password (required)
# --database      Database name (required)
# --clientOutputPath  Output path for Prisma client (default: ./client)
# --schemaPath    Path for schema.prisma file (default: ./prisma)
```

**Prisma Workflow:**
1. Run `reldens-storage-prisma` to generate schema.prisma and Prisma client
2. The command introspects your MySQL database and creates the Prisma schema
3. Run `reldens-storage generateEntities` with `--driver=prisma` to generate Reldens entities
4. Set `RELDENS_STORAGE_DRIVER=prisma` in your `.env` file to use Prisma at runtime

**Environment Variables for Prisma:**
```
RELDENS_STORAGE_DRIVER=prisma
RELDENS_DB_URL=mysql://user:password@host:port/database
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

**Admin** (`lib/admin/`): Admin panel integration with @reldens/cms
- Manages game configuration through web interface
- Handles entity CRUD operations
- Supports hot-plug configuration updates

**Ads** (`lib/ads/`): Advertisement integration system
- Third-party ad network support
- Ad placement configuration

**Audio** (`lib/audio/`): Sound and music system
- Background music management
- Sound effects for actions and events
- Audio configuration per scene/room

**Chat** (`lib/chat/`): Multi-channel chat (global, room, private messages)

**Inventory** (`lib/inventory/`): Items system with equipment and usable items
- Integrates with @reldens/items-system
- Item management, equipment slots, consumables

**Objects** (`lib/objects/`): Game objects (NPCs, interactables, respawn areas)
- `server/manager.js` loads and manages room objects
- Objects can listen to messages via `listenMessages` interface

**Prediction** (`lib/prediction/`): Client-side prediction system
- Reduces perceived latency
- Smooths player movement

**Respawn** (`lib/respawn/`): Player and NPC respawn system
- Death handling
- Respawn points configuration

**Rewards** (`lib/rewards/`): Loot and rewards system
- Drop tables
- Reward distribution

**Rooms** (`lib/rooms/`): Core multiplayer room system
- `server/scene.js` (RoomScene): Main game room with physics, collisions, objects
- `server/login.js` (RoomLogin): Authentication and player initialization
- Client connects via `room-events.js` to handle server state synchronization

**Scores** (`lib/scores/`): Leaderboards and ranking system

**Snippets** (`lib/snippets/`): Reusable code snippets and utilities

**Teams** (`lib/teams/`): Party/guild system
- Team formation
- Shared objectives

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
- `objection-js` (default): Uses Knex.js for SQL, direct database access, no validation
- `mikro-orm`: ORM with decorators, supports MongoDB
- `prisma`: Modern ORM with type safety, custom validation, database default support
- Configured via `RELDENS_STORAGE_DRIVER` in `.env`

**Driver Differences:**

*ObjectionJS:*
- Direct SQL via Knex query builder
- No field validation before database
- Database handles defaults and constraints
- Foreign keys as direct field values
- Less informative error messages

*Prisma:*
- Type-safe Prisma Client
- Custom `ensureRequiredFields()` validation before database
- Skips validation for fields with database defaults
- Foreign keys use relation connect syntax: `{players: {connect: {id: 1001}}}`
- VARCHAR foreign key support
- Better error messages for missing required fields
- Metadata-driven field type casting

**Entity Access**:

Models can be referenced in three ways:

1. **From getEntity method**:
```javascript
let features = await this.dataServer.getEntity('features').loadAll();
let player = await this.dataServer.getEntity('players').load(playerId);
```

2. **From [method]+WithRelations methods**:
```javascript
let skillData = await this.dataServer
    .getEntity('skillsClassLevelUpAnimations')
    .loadAllWithRelations();
```

3. **From loaded model instances with relations**:
```javascript
let relatedSkills = classPathModel.related_skills_levels_set.related_skills_levels;
```

**Important Notes**:
- Relations can be nested
- Entity relations keys are defined in `generated-entities/entities-config.js`
- Generated entities are in `generated-entities/` directory
- Custom entity overrides are in `lib/[plugin-folder]/server/entities` or `lib/[plugin-folder]/server/models`

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
class ServerPlugin
{
    setup({events})
    {
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

### Entity Overrides and Database Defaults

**Auto-Populated Fields:**

Some fields should be auto-populated by the database or application logic, not manually entered through the admin panel.

**Example: scores_detail.kill_time**
```javascript
// Database schema (migrations/production/reldens-install-v4.0.0.sql)
`kill_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP

// Entity override (lib/scores/server/entities/scores-detail-entity-override.js)
class ScoresDetailEntityOverride extends ScoresDetailEntity {
    static propertiesConfig(extraProps) {
        let config = super.propertiesConfig(extraProps);
        // Remove kill_time from admin panel edit form
        config.editProperties.splice(config.editProperties.indexOf('kill_time'), 1);
        return config;
    }
}

// Game logic auto-populates when creating through code
// (lib/scores/server/scores-updater.js)
let scoreDetailData = {
    player_id: attacker.player_id,
    obtained_score: obtainedScore,
    kill_time: sc.formatDate(new Date()),  // Auto-populated
    kill_player_id: props.killPlayerId || null,
    kill_npc_id: props.killNpcId || null,
};
```

**How It Works:**
1. Field removed from `editProperties` - not shown in admin panel
2. Database has `DEFAULT CURRENT_TIMESTAMP` - auto-fills when missing
3. Game logic explicitly sets value when creating programmatically
4. Prisma driver skips validation for fields with database defaults

**Important:** With Prisma driver, validation automatically skips required fields that have database defaults, allowing admin panel creates to succeed even when these fields are excluded from the form.

## Important Notes

- **Node Version**: Requires Node.js >= 20.0.0
- **Authoritative Server**: All game logic must run on server; client is display-only
- **Hot Plug**: Admin panel changes can reload without restart if `RELDENS_HOT_PLUG=1`
- **Entity Relations**: Use keys defined in `generated-entities/entities-config.js`
- **Logging**: Use `@reldens/utils/Logger` with configurable log levels (RELDENS_LOG_LEVEL)
- **Parcel Bundling**: Client code is bundled by Parcel; builds go to `dist/`
- **File Operations**: Always use `@reldens/server-utils FileHandler` instead of core Node.js `fs` module
- **Shortcuts Class**: The `@reldens/utils` Shortcuts class (imported as `sc`) provides essential helpers like `sc.get`, `sc.hasOwn`, `sc.isArray`, etc.

## Analysis Approach

When working on code issues:
- Always investigate thoroughly before making changes
- Read related files completely before proposing solutions
- Trace execution flows and dependencies
- Provide proof for issues, never guess or assume
- Verify file contents before creating patches
- Never jump to early conclusions
- A variable with an unexpected value is not an issue, it is the result of a previous issue
