# Admin Panel Guide

## Overview

The **admin panel is the primary way to configure Reldens**. Most game data (stats, objects, rooms, skills, items, etc.) should be set up and modified through the admin panel interface. SQL queries are a secondary option — useful for bulk operations, migrations, or scripted setup, but NOT the preferred approach for day-to-day configuration.

The admin panel is accessible at `/reldens-admin` and is powered by the `@reldens/cms` package.

---

## Admin Panel Sections and Controlled Tables

The admin panel groups entities into 14 navigation sections. The section structure is defined in:
`lib/admin/server/entities-config-override.js`

### Settings
Configuration keys and operation types used throughout the platform.
- `config` — Key/value configuration entries (`config` table)
- `configTypes` — Types for configuration entries
- `operationTypes` — Operation type definitions

### Rooms
Room definitions and player transition points.
- `rooms` — Room definitions (name, type, map file, etc.)
- `roomsChangePoints` — Points that move a player to another room
- `roomsReturnPoints` — Points where a player returns after death/warp

### Game Objects
NPC and interactive object definitions, their visuals, stats, and skills.
- `objects` — Object definitions (key, class path, type, room assignment)
- `objectsTypes` — Object type definitions
- `objectsAnimations` — Sprite animations per object
- `objectsAssets` — Asset references per object
- `objectsStats` — Stat values assigned to objects
- `objectsSkills` — Skills assigned to objects
- `objectsItemsInventory` — Items in object inventories
- `objectsItemsRequirements` — Item requirements for objects
- `objectsItemsRewards` — Items objects drop as rewards
- `targetOptions` — Options for targeting behavior

### Skills
Skill definitions, attack data, animations, and effect conditions.
- `skillsSkill` — Core skill definitions
- `skillsSkillType` — Skill type classifications
- `skillsSkillAttack` — Attack data (damage, range, etc.)
- `skillsSkillAnimations` — Animations associated with skills
- `skillsSkillPhysicalData` — Physical properties (hitbox, etc.)
- `skillsGroups` — Skill groups/categories
- `skillsSkillGroupRelation` — Skill-to-group assignments
- `skillsSkillOwnerConditions` — Conditions checked on the skill owner
- `skillsSkillOwnerEffects` — Effects applied to skill owner
- `skillsSkillOwnerEffectsConditions` — Conditions on owner effects
- `skillsSkillTargetEffects` — Effects applied to skill target
- `skillsSkillTargetEffectsConditions` — Conditions on target effects
- `skillsLevelsModifiersConditions` — Conditions on level modifier application

### Classes & Levels
Class paths, level sets, and level-based stat modifiers.
- `skillsClassPath` — Class path definitions
- `skillsClassPathLevelLabels` — Display labels for levels per class path
- `skillsClassPathLevelSkills` — Skills unlocked at specific levels
- `skillsClassLevelUpAnimations` — Level-up animation assignments
- `skillsLevelsSet` — Groups of level definitions
- `skillsLevels` — Individual level entries
- `skillsLevelsModifiers` — Stat modifiers applied at each level

### Users
Player accounts, stats, scores, and class assignments.
- `users` — User accounts
- `usersLogin` — Login records/sessions
- `usersLocale` — Per-user locale settings
- `players` — Player entities linked to users
- `playersState` — Player runtime state data
- `playersStats` — Player stat values (hp, mp, atk, etc.)
- `stats` — Stat type definitions (the list of available stats)
- `scores` — Player score records
- `scoresDetail` — Detailed score breakdowns
- `skillsOwnersClassPath` — Class path assignments per player

### Items & Inventory
Item types, groups, and inventory data.
- `itemsItem` — Item definitions
- `itemsTypes` — Item type classifications
- `itemsGroup` — Item group definitions
- `itemsItemModifiers` — Stat modifiers applied by items
- `itemsInventory` — Inventory records (who holds what items)

### Rewards
Drop tables, reward events, and modifiers.
- `rewards` — Reward definitions
- `rewardsModifiers` — Stat modifiers granted by rewards
- `rewardsEvents` — Events that trigger reward distribution
- `rewardsEventsState` — State tracking for reward events
- `dropsAnimations` — Visual animations for item drops

### Respawn
Respawn point and behavior configuration.
- `respawn` — Respawn configuration entries

### Audio
Sound effects, music, and per-player audio config.
- `audio` — Audio file references
- `audioCategories` — Audio category groupings
- `audioMarkers` — Markers within audio tracks
- `audioPlayerConfig` — Per-player audio preferences

### Chat
Chat messages and message type configuration.
- `chat` — Chat message log
- `chatMessageTypes` — Chat message type definitions

### Translations
Localization strings and text snippets.
- `snippets` — Text snippets used in UI and messages
- `locale` — Locale string entries

### Ads
Ad banners, providers, and playback tracking.
- `ads` — Ad definitions
- `adsBanner` — Banner ad data
- `adsProviders` — Ad provider configurations
- `adsTypes` — Ad type classifications
- `adsEventVideo` — Video ad event data
- `adsPlayed` — Ad playback tracking records

### Clan
Clan definitions, levels, modifiers, and membership.
- `clan` — Clan definitions
- `clanLevels` — Clan level definitions
- `clanLevelsModifiers` — Stat modifiers applied at clan levels
- `clanMembers` — Clan membership records

### Features
Feature flags and plugin enablement.
- `features` — Feature definitions and enabled/disabled state

---

## Entity Override System

### What Are Entity Overrides?

Generated entities in `generated-entities/entities/` are auto-created from the database schema by running `reldens generateEntities`. They are **read-only** — regenerated whenever the schema changes.

Entity overrides are manually created files that **extend** generated entities to customize admin panel behavior. They live in:
```
lib/{plugin}/server/entities/{entity-name}-entity-override.js
```

**Important**: Entity overrides only affect the admin panel UI — they do NOT change the database schema, server logic, or data layer. The override system controls:
- Which columns appear in the admin list view
- Which fields appear in the edit form
- The sort order within admin navigation menus
- How rows are labeled in dropdowns and lists
- Default sort order for list views

### What Overrides Can Do

**Control navigation position** (order in the admin menu):
```javascript
static propertiesConfig(extraProps) {
    let config = super.propertiesConfig(extraProps);
    config.navigationPosition = 950;
    return config;
}
```

**Remove columns from the list view**:
```javascript
config.listProperties = sc.removeFromArray(config.listProperties, [
    'description',
    'qty_limit'
]);
```

**Remove fields from the edit form** (prevents accidental edits of critical fields):
```javascript
config.editProperties.splice(config.editProperties.indexOf('player_id'), 1);
```

**Set the display title field** (which property is shown as the row label):
```javascript
config.titleProperty = 'key';
```

**Set default sort for list views**:
```javascript
config.sort = {sortBy: 'path'};
```

### How Overrides Are Registered

Each plugin registers its overrides in `lib/{plugin}/server/entities-config.js`:
```javascript
module.exports.entitiesConfig = {
    players: PlayersEntityOverride,
    playersState: PlayersStateEntityOverride,
    playersStats: PlayersStatsEntityOverride,
};
```

The `EntitiesLoader` (`lib/game/server/entities-loader.js`) discovers all `entities-config.js` files across plugin folders and merges them during server startup.

**Override priority** (highest wins):
1. Implementation custom classes (passed via `customClasses` to ServerManager)
2. Plugin entity overrides (each module's `entities-config.js`)
3. Admin menu structure (`lib/admin/server/entities-config-override.js`)
4. Generated base entity configuration

### Model Overrides

Some features use custom model files that extend the generated database models:
```
lib/{plugin}/server/models/{entity-name}-model.js
```

Model overrides add business logic methods, relationships, or hooks at the ORM layer — beyond what the admin panel configuration layer provides. See `storage-architecture.md` for details on the storage driver and entity access patterns.

---

## When to Use Admin Panel vs SQL

**Use the admin panel** for:
- Setting up game data (stats, objects, rooms, skills, items)
- Creating and editing configuration entries
- Managing users, players, and class paths
- Day-to-day game tuning and balancing

**Use SQL migrations** for:
- Initial schema setup (new tables, columns)
- Bulk data imports across many rows
- Scripted data setup for repeatable deployments
- Automated environment setup (CI/CD, staging)

Documentation pages that describe game configuration should explain the admin panel section first and mention SQL as an alternative for bulk/automated scenarios.
