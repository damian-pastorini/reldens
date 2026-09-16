# Feature Modules Reference

Complete reference for all 24 feature modules under `lib/`.

## Core/Game Management

### Game (`lib/game/`)
Core game engine
- ServerManager - Main server orchestrator (lib/game/server/manager.js)
- GameManager - Main client orchestrator (lib/game/client/game-manager.js)
- Data server configuration
- Entities loader
- Maps loader
- Login manager
- Installation scripts
- Theme manager

### Rooms (`lib/rooms/`)
Core multiplayer room system
- `server/scene.js` (RoomScene): Main game room with physics, collisions, objects
- `server/login.js` (RoomLogin): Authentication and player initialization
- Client connects via `lib/game/client/room-events.js` to handle server state synchronization

### World (`lib/world/`)
Physics engine integration (P2.js), pathfinding, collisions
- Authoritative physics calculations
- Collision detection and handling
- Pathfinding algorithms

### Config (`lib/config/`)
Configuration management
- Database-driven configuration
- Environment variable handling
- Runtime configuration overrides

### Features (`lib/features/`)
Plugin-like modular system
- Features are loaded from database (`features` table with `is_enabled` flag)
- `server/manager.js` (FeaturesManager) dynamically loads enabled features
- Each feature can hook into events via `setup()` method

## Gameplay Systems

### Actions (`lib/actions/`)
Combat system (PvP/PvE), skills, battle mechanics
- Server handles authoritative battle calculations
- Client receives battle states and renders animations
- `server/battle.js` - Main battle system
- `server/pve.js` - PvE combat logic
- `server/pvp.js` - PvP combat logic

### Inventory (`lib/inventory/`)
Items system with equipment and usable items
- Integrates with @reldens/items-system
- Item management, equipment slots, consumables

### Respawn (`lib/respawn/`)
Player and NPC respawn system
- Death handling
- Respawn points configuration

### Rewards (`lib/rewards/`)
Loot and rewards system
- Drop tables
- Reward distribution

### Scores (`lib/scores/`)
Leaderboards and ranking system
- Player scores tracking
- Global leaderboards

### Teams (`lib/teams/`)
Party/guild system
- Team formation
- Shared objectives
- Clan levels and bonuses

## Player Systems

### Users (`lib/users/`)
Authentication, registration, player management
- Supports guest users, Firebase authentication
- `lib/game/server/login-manager.js` handles all auth flows
- Player creation and management

### Chat (`lib/chat/`)
Multi-channel chat (global, room, private messages)
- Message types and tabs
- Real-time messaging

### Audio (`lib/audio/`)
Sound and music system
- Background music management
- Sound effects for actions and events
- Audio configuration per scene/room

### Prediction (`lib/prediction/`)
Client-side prediction system
- Reduces perceived latency
- Smooths player movement

## Integration/Support

### Admin (`lib/admin/`)
Admin panel integration with @reldens/cms
- Manages game configuration through web interface
- Handles entity CRUD operations
- Supports hot-plug configuration updates

### Firebase (`lib/firebase/`)
Firebase integration
- Firebase authentication
- Client-side Firebase SDK integration

### Ads (`lib/ads/`)
Advertisement integration system
- Third-party ad network support (CrazyGames, GameMonetize)
- Ad placement configuration

### Sync (`lib/sync/`)
Colyseus primitives isolation layer
- `server/colyseus/sync-server-driver.js`: Node-only `Server`, `Room`, `CloseCode`, `WebSocketTransport` and `monitor`
- `shared/colyseus/sync-schema-driver.js`: isomorphic `@colyseus/schema` primitives safe for the client bundle
- `client/colyseus/sync-client-driver.js`: browser `Client` and `getStateCallbacks` from `@colyseus/sdk`

### Import (`lib/import/`)
Data import utilities
- Maps and objects importers, rooms associations creator
- Skills, class paths, attributes and experience per level importers
- Tile and map image extruders, published map merger

### Objects (`lib/objects/`)
Game objects (NPCs, interactables, respawn areas)
- `server/manager.js` loads and manages room objects
- Objects can listen to messages via `listenMessages` interface
- Physical collision behavior is configured via `private_params` in the `objects` DB table:
  - `"collisionType":2` - makes the object body STATIC (p2.js Body.STATIC), blocking the player from walking through it
  - `"collisionType":1` - DYNAMIC body (default), enemies and moving objects use this
  - `"hasState":true` - required alongside `collisionType:2` for respawnable objects that need Colyseus state sync
  - See `.claude/collision-configuration-guide.md` for full details

### Snippets (`lib/snippets/`)
Text snippets, locales and translations
- `snippets`, `locale` and `usersLocale` entities for the UI and message texts
- `translator.js` plus the client translations mapper and templates handler

### Bundlers (`lib/bundlers/`)
Asset bundling driver configuration
- `drivers/parcel-config.json`: the Parcel config `ThemeManager` passes to the client and CSS bundling

### Quests (`lib/quests/`)
Quest progress tracking system (persistence layer only, not a full quest definition system)
- `quests_progress` DB table: per-player and global quest flag storage (`player_id` nullable for global flags)
- `server/plugin.js` (QuestsPlugin): listens `reldens.createPlayerAfter`, queries `questsProgress` entity for player and global rows, sends merged keys to client via `{act: 'playerQuestsData', quests: [...]}` message
- `client/plugin.js` (QuestsClientPlugin): listens `reldens.activateRoom`, stores received quest keys on `gameManager.playerQuestsData`, emits `reldens.playerQuestsLoaded`
- Objects and features consume `gameManager.playerQuestsData` to restore state on room join
- Entity key: `questsProgress` (maps to `quests_progress` table in all storage drivers)
