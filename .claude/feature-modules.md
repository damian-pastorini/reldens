# Feature Modules Reference

Complete reference for all 23 feature modules under `lib/`.

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
- Client connects via `room-events.js` to handle server state synchronization

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
- `server/login-manager.js` handles all auth flows
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

### Import (`lib/import/`)
Data import utilities
- File handlers
- MIME type detection
- Bulk data import tools

### Objects (`lib/objects/`)
Game objects (NPCs, interactables, respawn areas)
- `server/manager.js` loads and manages room objects
- Objects can listen to messages via `listenMessages` interface

### Snippets (`lib/snippets/`)
Reusable code snippets and utilities
- Common helper functions
- Shared utilities across modules

### Bundlers (`lib/bundlers/`)
Asset bundling drivers
- Parcel integration
- CSS and JavaScript bundling
- Theme asset compilation
