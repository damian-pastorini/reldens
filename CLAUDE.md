# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Reldens is an MMORPG Platform (v4.0.0-beta.39) built on Node.js, designed for developers to create multiplayer games. The platform integrates:
- **Server**: Colyseus for multiplayer game server
- **Client**: Phaser 3 for game engine, Parcel for bundling
- **Database**: Supports multiple storage drivers (objection-js, mikro-orm, prisma) with MySQL/MongoDB
- **Architecture**: Client-server with authoritative server, real-time synchronization via WebSockets

## Project Metadata

- **Name**: reldens
- **Version**: 4.0.0-beta.39
- **Author**: Damian A. Pastorini
- **License**: MIT
- **Homepage**: https://www.reldens.com/
- **Repository**: https://github.com/damian-pastorini/reldens.git
- **Demo**: https://dev.reldens.com/
- **Discord Community**: https://discord.gg/HuJMxUY
- **Support**: Ko-fi, Patreon
- **Node Version**: >= 20.0.0

## Project Structure

### Main Project
- `reldens/lib` - Main Reldens source code

### Sub-Packages
All related packages are:
- **@reldens/utils** - Core utilities, Shortcuts class (imported as `sc`), EventsManagerSingleton, Logger
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

### CLI Binaries
The project provides three main CLI entry points:
- `reldens` - Main command router (bin/reldens-commands.js)
- `reldens-generate` - Data generation tool (bin/generate.js)
- `reldens-import` - Data import tool (bin/import.js)

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
reldens copyDefaultAssets               # Copy default assets to dist/assets
reldens copyDefaultTheme                # Copy default theme to project
reldens copyPackage                     # Copy reldens module packages to project
reldens resetDist                       # Delete and recreate dist folder
reldens removeDist                      # Delete dist folder only

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
reldens installSkeleton                 # Install skeleton
reldens copyEnvFile                     # Copy .env.dist template
reldens copyKnexFile                    # Copy knexfile.js template
reldens copyIndex                       # Copy index.js template
reldens copyServerFiles                 # Reset dist and run fullRebuild
reldens copyNew                         # Copy all default files for fullRebuild
reldens help                            # Show all available commands
reldens test                            # Test file system access
```

### Data Generation Tools
```bash
# Generate game data (via reldens-generate)
reldens-generate players-experience     # Generate player XP per level
reldens-generate monsters-experience    # Generate monster XP per level
reldens-generate attributes             # Generate attributes per level
reldens-generate maps                   # Generate maps with various loaders

# Data import (via reldens-import)
reldens-import [data-type]              # Import game data
```

### User Management Commands
```bash
# Create admin user
reldens createAdmin --user=username --pass=password --email=email@example.com
# Creates an admin user with role_id from config (default: 1)
# Validates email format and username/email uniqueness
# Password is automatically encrypted using PBKDF2 SHA-512

# Reset user password
reldens resetPassword --user=username --pass=newpassword
# Resets password for existing user
# Password is automatically encrypted
# Works for any user (admin or regular)

# Examples:
reldens createAdmin --user=admin --pass=SecurePass123 --email=admin@yourgame.com
reldens resetPassword --user=someuser --pass=NewSecurePass456
```

**Implementation Details:**
- Service classes: `CreateAdmin` and `ResetPassword` in `lib/users/server/`
- Both receive `serverManager` in constructor (following importer pattern)
- Services return boolean result with `error` property for failure details
- `createAdmin` uses existing `usersRepository.create()` with `role_id` in userData
- `resetPassword` uses `usersRepository.loadOneBy()` and `updateById()`
- Admin role ID from config: `server/admin/roleId` (default: 1)
- Email validation via `sc.validateInput(email, 'email')` from `@reldens/utils`
- Commands initialize ServerManager automatically from `.env` (pattern from `bin/import.js`)
- Password encryption uses `Encryptor` from `@reldens/server-utils` (100k iterations, SHA-512)

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

### All Feature Modules (23 Total)

The platform includes 23 feature modules under `lib/`:

**Core/Game Management:**

**Game** (`lib/game/`): Core game engine
- ServerManager - Main server orchestrator (lib/game/server/manager.js)
- GameManager - Main client orchestrator (lib/game/client/game-manager.js)
- Data server configuration
- Entities loader
- Maps loader
- Login manager
- Installation scripts
- Theme manager

**Rooms** (`lib/rooms/`): Core multiplayer room system
- `server/scene.js` (RoomScene): Main game room with physics, collisions, objects
- `server/login.js` (RoomLogin): Authentication and player initialization
- Client connects via `room-events.js` to handle server state synchronization

**World** (`lib/world/`): Physics engine integration (P2.js), pathfinding, collisions
- Authoritative physics calculations
- Collision detection and handling
- Pathfinding algorithms

**Config** (`lib/config/`): Configuration management
- Database-driven configuration
- Environment variable handling
- Runtime configuration overrides

**Features** (`lib/features/`): Plugin-like modular system
- Features are loaded from database (`features` table with `is_enabled` flag)
- `server/manager.js` (FeaturesManager) dynamically loads enabled features
- Each feature can hook into events via `setup()` method

**Gameplay Systems:**

**Actions** (`lib/actions/`): Combat system (PvP/PvE), skills, battle mechanics
- Server handles authoritative battle calculations
- Client receives battle states and renders animations
- `server/battle.js` - Main battle system
- `server/pve.js` - PvE combat logic
- `server/pvp.js` - PvP combat logic

**Inventory** (`lib/inventory/`): Items system with equipment and usable items
- Integrates with @reldens/items-system
- Item management, equipment slots, consumables

**Respawn** (`lib/respawn/`): Player and NPC respawn system
- Death handling
- Respawn points configuration

**Rewards** (`lib/rewards/`): Loot and rewards system
- Drop tables
- Reward distribution

**Scores** (`lib/scores/`): Leaderboards and ranking system
- Player scores tracking
- Global leaderboards

**Teams** (`lib/teams/`): Party/guild system
- Team formation
- Shared objectives
- Clan levels and bonuses

**Player Systems:**

**Users** (`lib/users/`): Authentication, registration, player management
- Supports guest users, Firebase authentication
- `server/login-manager.js` handles all auth flows
- Player creation and management

**Chat** (`lib/chat/`): Multi-channel chat (global, room, private messages)
- Message types and tabs
- Real-time messaging

**Audio** (`lib/audio/`): Sound and music system
- Background music management
- Sound effects for actions and events
- Audio configuration per scene/room

**Prediction** (`lib/prediction/`): Client-side prediction system
- Reduces perceived latency
- Smooths player movement

**Integration/Support:**

**Admin** (`lib/admin/`): Admin panel integration with @reldens/cms
- Manages game configuration through web interface
- Handles entity CRUD operations
- Supports hot-plug configuration updates

**Firebase** (`lib/firebase/`): Firebase integration
- Firebase authentication
- Client-side Firebase SDK integration

**Ads** (`lib/ads/`): Advertisement integration system
- Third-party ad network support (CrazyGames, GameMonetize)
- Ad placement configuration

**Import** (`lib/import/`): Data import utilities
- File handlers
- MIME type detection
- Bulk data import tools

**Objects** (`lib/objects/`): Game objects (NPCs, interactables, respawn areas)
- `server/manager.js` loads and manages room objects
- Objects can listen to messages via `listenMessages` interface

**Snippets** (`lib/snippets/`): Reusable code snippets and utilities
- Common helper functions
- Shared utilities across modules

**Bundlers** (`lib/bundlers/`): Asset bundling drivers
- Parcel integration
- CSS and JavaScript bundling
- Theme asset compilation

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

### Environment Variables Reference

**Application Server:**
- `NODE_ENV` - Environment mode (production/development)
- `RELDENS_DEFAULT_ENCODING` - Default encoding (default: utf8)
- `RELDENS_APP_HOST` - Application host
- `RELDENS_APP_PORT` - Application port
- `RELDENS_PUBLIC_URL` - Public URL for the application

**HTTPS Configuration:**
- `RELDENS_EXPRESS_USE_HTTPS` - Enable HTTPS
- `RELDENS_EXPRESS_HTTPS_PRIVATE_KEY` - Private key path
- `RELDENS_EXPRESS_HTTPS_CERT` - Certificate path
- `RELDENS_EXPRESS_HTTPS_CHAIN` - Certificate chain path
- `RELDENS_EXPRESS_HTTPS_PASSPHRASE` - HTTPS passphrase

**Express Server:**
- `RELDENS_USE_EXPRESS_JSON` - Enable JSON parsing
- `RELDENS_EXPRESS_JSON_LIMIT` - JSON payload limit
- `RELDENS_EXPRESS_URLENCODED_LIMIT` - URL encoded limit
- `RELDENS_GLOBAL_RATE_LIMIT` - Global rate limiting
- `RELDENS_TOO_MANY_REQUESTS_MESSAGE` - Rate limit message
- `RELDENS_USE_URLENCODED` - Enable URL encoding
- `RELDENS_USE_HELMET` - Enable Helmet security
- `RELDENS_USE_XSS_PROTECTION` - Enable XSS protection
- `RELDENS_USE_CORS` - Enable CORS
- `RELDENS_CORS_ORIGIN` - CORS origin
- `RELDENS_CORS_METHODS` - CORS methods
- `RELDENS_CORS_HEADERS` - CORS headers
- `RELDENS_EXPRESS_SERVE_HOME` - Serve dynamic home page
- `RELDENS_EXPRESS_TRUSTED_PROXY` - Trusted proxy
- `RELDENS_EXPRESS_RATE_LIMIT_MS` - Rate limit window (default: 60000)
- `RELDENS_EXPRESS_RATE_LIMIT_MAX_REQUESTS` - Max requests per window (default: 30)
- `RELDENS_EXPRESS_RATE_LIMIT_APPLY_KEY_GENERATOR` - Apply key generator
- `RELDENS_EXPRESS_SERVE_STATICS` - Serve static files

**Admin Panel:**
- `RELDENS_ADMIN_ROUTE_PATH` - Admin panel route path
- `RELDENS_ADMIN_SECRET` - Admin authentication secret
- `RELDENS_HOT_PLUG` - Enable hot-plug configuration updates (0/1)

**Colyseus Monitor:**
- `RELDENS_MONITOR` - Enable Colyseus monitor
- `RELDENS_MONITOR_AUTH` - Enable monitor authentication
- `RELDENS_MONITOR_USER` - Monitor username
- `RELDENS_MONITOR_PASS` - Monitor password

**Storage & Database:**
- `RELDENS_STORAGE_DRIVER` - Storage driver (objection-js, mikro-orm, prisma)
- `RELDENS_DB_CLIENT` - Database client (mysql, mysql2, mongodb)
- `RELDENS_DB_HOST` - Database host
- `RELDENS_DB_PORT` - Database port
- `RELDENS_DB_NAME` - Database name
- `RELDENS_DB_USER` - Database username
- `RELDENS_DB_PASSWORD` - Database password
- `RELDENS_DB_POOL_MIN` - Connection pool minimum (default: 2)
- `RELDENS_DB_POOL_MAX` - Connection pool maximum (default: 10)
- `RELDENS_DB_LIMIT` - Query limit (default: 0)
- `RELDENS_DB_URL` - Full database URL (auto-generated if not specified)
- `RELDENS_DB_URL_OPTIONS` - Additional URL options

**Logging:**
- `RELDENS_LOG_LEVEL` - Log level (0-7, default: 7)
- `RELDENS_ENABLE_TRACE_FOR` - Enable trace for specific levels (emergency,alert,critical)

**Mailer:**
- `RELDENS_MAILER_ENABLE` - Enable email functionality
- `RELDENS_MAILER_SERVICE` - Mail service provider
- `RELDENS_MAILER_HOST` - SMTP host
- `RELDENS_MAILER_PORT` - SMTP port
- `RELDENS_MAILER_USER` - SMTP username
- `RELDENS_MAILER_PASS` - SMTP password
- `RELDENS_MAILER_FROM` - From email address
- `RELDENS_MAILER_FORGOT_PASSWORD_LIMIT` - Forgot password attempts limit (default: 4)

**Bundler:**
- `RELDENS_ALLOW_RUN_BUNDLER` - Allow bundler execution (default: 1)
- `RELDENS_FORCE_RESET_DIST_ON_BUNDLE` - Force reset dist on bundle
- `RELDENS_FORCE_COPY_ASSETS_ON_BUNDLE` - Force copy assets on bundle
- `RELDENS_JS_SOURCEMAPS` - Enable JavaScript source maps
- `RELDENS_CSS_SOURCEMAPS` - Enable CSS source maps

**Game Server:**
- `RELDENS_PING_INTERVAL` - Ping interval in ms (default: 5000)
- `RELDENS_PING_MAX_RETRIES` - Max ping retries (default: 3)

**Firebase:**
- `RELDENS_FIREBASE_ENABLE` - Enable Firebase authentication
- `RELDENS_FIREBASE_API_KEY` - Firebase API key
- `RELDENS_FIREBASE_APP_ID` - Firebase app ID
- `RELDENS_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `RELDENS_FIREBASE_DATABASE_URL` - Firebase database URL
- `RELDENS_FIREBASE_PROJECT_ID` - Firebase project ID
- `RELDENS_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `RELDENS_FIREBASE_MESSAGING_SENDER_ID` - Firebase sender ID
- `RELDENS_FIREBASE_MEASUREMENTID` - Firebase measurement ID

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

**Generated Entities Structure:**
The `generated-entities/` directory contains:
- `entities/` - 60+ auto-generated entity classes for all database tables
- `models/` - Custom entity overrides (extend generated entities)
- `entities-config.js` - Entity relationship mappings and configuration
- `entities-translations.js` - Translation/label mappings for admin panel

**All Entity Types:**
Ads (ads, ads-banner, ads-event-video, ads-played, ads-providers, ads-types),
Audio (audio, audio-categories, audio-markers, audio-player-config),
Chat (chat, chat-message-types),
Clans (clan, clan-levels, clan-levels-modifiers, clan-members),
Config (config, config-types),
Drops (drops-animations),
Features (features),
Items (items-group, items-inventory, items-item, items-item-modifiers, items-types),
Locale (locale, users-locale),
Objects (objects, objects-animations, objects-assets, objects-items-inventory, objects-items-requirements, objects-items-rewards, objects-skills, objects-stats, objects-types),
Operations (operation-types),
Players (players, players-state, players-stats),
Respawn (respawn),
Rewards (rewards, rewards-events, rewards-events-state, rewards-modifiers),
Rooms (rooms, rooms-change-points, rooms-return-points),
Scores (scores, scores-detail),
Skills (skills-class-level-up-animations, skills-class-path, skills-class-path-level-labels, skills-class-path-level-skills, skills-groups, skills-levels, skills-levels-modifiers, skills-levels-modifiers-conditions, skills-levels-set, skills-owners-class-path, skills-skill, skills-skill-animations, skills-skill-attack, skills-skill-group-relation, skills-skill-owner-conditions, skills-skill-owner-effects, skills-skill-owner-effects-conditions, skills-skill-physical-data, skills-skill-target-effects, skills-skill-target-effects-conditions, skills-skill-type),
Snippets (snippets),
Stats (stats, target-options),
Users (users, users-login)

### Theme & Customization

**Theme Structure** (`theme/`):
- `index.js.dist`: Theme initialization template
- `plugins/`: Custom client/server plugins for game-specific logic
    - `client-plugin.js`: Hooks client events
    - `server-plugin.js`: Hooks server events
    - `bot.js`: Bot/NPC AI implementation
    - `objects/`: Custom game objects
- `default/`: Default theme assets
    - `index.html`: Main game HTML (14KB)
    - `es-index.html`: ES module variant
    - `config.js`: Theme-specific configuration
    - `css/`: Stylesheets
    - `assets/`: Images, sprites, audio files
    - `site.webmanifest`: PWA manifest
- `admin/`: Admin panel customizations

**Theme Management:**
The ThemeManager (`lib/game/server/theme-manager.js`) handles:
- Theme path resolution
- Asset copying and bundling
- CSS compilation
- Client HTML generation
- Integration with Parcel bundler

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

### Testing

**Test Infrastructure** (`tests/`):
- `manager.js` - Test orchestrator and runner
- `run.js` - Test execution script
- `base-test.js` - Base test class with common utilities
- `utils.js` - Test helper functions
- `database-reset-utility.js` - Database reset for tests

**Test Suites:**
- `test-admin-auth.js` - Admin authentication tests
- `test-admin-crud.js` - Admin CRUD operation tests
- `test-admin-features.js` - Feature management tests

**Test Configuration:**
- `config.json` - Test environment configuration

**Test Fixtures:**
- `fixtures/crud-test-data.js` - CRUD test data sets
- `fixtures/entities-list.js` - Entity definitions for testing
- `fixtures/features-test-data.js` - Feature test scenarios
- `fixtures/generate-entities-fixtures.js` - Fixture generator
- Test files: test-file.json, test-file.png, test-audio.mp3

**Running Tests:**
```bash
npm test
# Or with filters
node tests/manager.js --filter="admin-auth" --break-on-error
```

### Installation GUI

The `install/` directory contains:
- Installation web interface (HTML, CSS, assets)
- Wizard-based installation process
- Database setup and configuration
- Initial data seeding

## Key Dependencies

**Game Framework:**
- `@colyseus/core` (0.15.57) - Multiplayer room management
- `@colyseus/schema` (2.0.37) - State synchronization
- `@colyseus/ws-transport` (0.15.3) - WebSocket transport
- `colyseus.js` (0.15.26) - Client library
- `@colyseus/monitor` (0.15.8) - Room monitoring

**Game Engine:**
- `phaser` (3.90.0) - Client-side rendering and game engine
- `p2` (0.7.1) - Physics engine
- `pathfinding` (0.4.18) - Pathfinding algorithms

**Build System:**
- `@parcel/*` (2.16.1) - 40+ Parcel bundler plugins
- Asset transformers, optimizers, and packagers

**Database/ORM:**
- `@reldens/storage` - Multi-driver abstraction layer
- `knex` - Query builder
- `objection` - ObjectionJS ORM
- `mikro-orm` - MikroORM
- `prisma` - Prisma ORM
- `mysql2` - MySQL driver
- `mongodb` - MongoDB driver

**Utilities:**
- `express` - Web server
- `express-basic-auth` - Basic authentication
- `dotenv` (17.2.3) - Environment variables
- `nodemailer` (7.0.11) - Email sending
- `@sendgrid/mail` (8.1.6) - SendGrid integration
- `mustache` (4.2.0) - Template engine
- `jimp` (1.6.0) - Image manipulation
- `core-js` (3.47.0) - Polyfills
- `regenerator-runtime` (0.14.1) - Async runtime

**Firebase:**
- `firebase` (12.6.0) - Firebase SDK

## Important Notes

- **Node Version**: Requires Node.js >= 20.0.0
- **Authoritative Server**: All game logic must run on server; client is display-only
- **Hot Plug**: Admin panel changes can reload without restart if `RELDENS_HOT_PLUG=1`
- **Entity Relations**: Use keys defined in `generated-entities/entities-config.js`
- **Logging**: Use `@reldens/utils/Logger` with configurable log levels (RELDENS_LOG_LEVEL)
- **Parcel Bundling**: Client code is bundled by Parcel; builds go to `dist/`
- **File Operations**: Always use `@reldens/server-utils FileHandler` instead of core Node.js `fs` module
- **Shortcuts Class**: The `@reldens/utils` Shortcuts class (imported as `sc`) provides essential helpers like `sc.get`, `sc.hasOwn`, `sc.isArray`, etc.
- **CLI Commands**: Execute via `reldens` command (uses bin/commander.js and lib/game/server/theme-manager.js)
- **Theme Customization**: Modify `theme/` directory and rebuild with `reldens buildSkeleton`
- **Data Generators**: Use `reldens-generate` for automatic data generation (XP tables, maps, etc.)

## Community & Support

- **Discord**: https://discord.gg/HuJMxUY - Join for questions, discussions, and support
- **Demo**: https://dev.reldens.com/ - Try the live demo
- **Admin Panel**: https://demo.reldens.com/reldens-admin/ - Demo admin access
- **Documentation**: https://www.reldens.com/documentation/installation - Installation guide
- **Feature Requests**: https://www.reldens.com/features-request - Request new features
- **Issues**: https://github.com/damian-pastorini/reldens/issues - Report bugs
- **Support**: Ko-fi and Patreon available for project support
- **Contact**: info@dwdeveloper.com - Direct email support

## Feature Highlights

The platform provides 60+ features including:
- Installation GUI for easy setup
- Administration Panel for game management
- Automatic data generators for XP, levels, maps
- Trade System (player-to-player and NPC trading)
- Full In-game Chat (global, room, private messages)
- Configurable Player Stats (HP, MP, custom stats)
- Items System (usable items and equipment)
- Combat System (PVP, PVE, skills, attacks)
- NPCs, Enemies, and Respawn Areas
- Teams and Clans System with bonuses
- Drops and Rewards system
- Game Rewards (daily/weekly login events)
- Game Scores and leaderboards
- Physics Engine and Pathfinder
- Gravity World configuration
- Sounds System (configurable categories)
- In-game Ads (CrazyGames, GameMonetize)
- Minimap with configuration options
- Player name and life-bar visibility control
- Terms and Conditions support
- Guest Users support
- User Registration with double login protection
- Multiple Players per account
- Firebase Authentication integration
- Multiple server switch support
- Database-driven with multiple storage drivers

## Analysis Approach

When working on code issues:
- Always investigate thoroughly before making changes
- Read related files completely before proposing solutions
- Trace execution flows and dependencies
- Provide proof for issues, never guess or assume
- Verify file contents before creating patches
- Never jump to early conclusions
- A variable with an unexpected value is not an issue, it is the result of a previous issue
