# Admin Panel Guide

## Overview

The **admin panel is the primary way to configure Reldens**. Most game data (stats, objects, rooms, skills, items, etc.) should be set up and modified through the admin panel interface. SQL queries are a secondary option - useful for bulk operations, migrations, or scripted setup, but NOT the preferred approach for day-to-day configuration.

The admin panel is accessible at `/reldens-admin` and is powered by the `@reldens/cms` package.

---

## Dashboard

The dashboard page shows the users currently logged in and the distinct logged users per day over the last 30 days.

The page itself stays static because `@reldens/cms` renders and caches the dashboard content once at startup, so the
numbers are fetched at runtime: `theme/admin/js/admin-dashboard-stats-renderer.js` reads the route from the
`data-stats-path` attribute in `theme/admin/templates/dashboard.html` and requests it relative to the current admin
path, which keeps a custom `RELDENS_ADMIN_ROUTE_PATH` working. `DashboardStatsSubscriber`
(`lib/admin/server/subscribers/dashboard-stats-subscriber.js`) serves that route authenticated.

The data comes from `UsersActivityDataProvider` (`lib/admin/server/users-activity-data-provider.js`):

- The active users count is derived from the `ActivePlayers` singleton, counting user ids with at least one open
  session. Sessions are per room, so the raw session count would report the same user more than once.
- The per-day series loads the login rows through the repository (`loadBy('login_date', <Date>, 'GTE')`) and groups
  them in `groupDistinctUsersPerDay`, counting each user once per day. There is no raw SQL: the storage drivers expose
  filters, sorting and paging but no group-by, and raw queries would bypass the entity layer and break driver
  portability. The dates are handled in UTC because `sc.getCurrentDate()` writes `users_login.login_date` in UTC; using
  local dates shifts every bucket on a server that is not on UTC.
- Only the days that actually had logins are returned, together with `fromDate` and `daysRange`. The chart places each
  row on its own slot by date difference, so the missing days stay empty instead of collapsing the axis.

The page re-fetches on the interval given by the `data-refresh-ms` attribute on the dashboard wrapper, so the count and
the chart stay current without a reload. The hover listeners are bound once, not on every refresh.

---

## Admin Panel Sections and Controlled Tables

The admin panel groups entities into 14 navigation sections. The section structure is defined in:
`lib/admin/server/entities-config-override.js`

### Settings
Configuration keys and operation types used throughout the platform.
- `config` - Key/value configuration entries (`config` table)
- `configTypes` - Types for configuration entries
- `operationTypes` - Operation type definitions

### Rooms
Room definitions and player transition points.
- `rooms` - Room definitions (name, type, map file, etc.)
- `roomsChangePoints` - Points that move a player to another room
- `roomsReturnPoints` - Points where a player returns after death/warp

#### Deleting a room

The admin deletes the room row only. Everything else is decided by the foreign keys, so the delete confirmation
dialog lists the affected entities in separate groups according to what the database will actually do:

- Deleted with the room (`ON DELETE CASCADE`): `roomsChangePoints` on both `room_id` and `next_room_id`, and
  `roomsReturnPoints` on both `room_id` and `from_room_id`. These are pure topology and are meaningless without
  the room, and cascading the inbound side is what stops other rooms pointing at a room that no longer exists.
- Kept but unlinked (`ON DELETE SET NULL`): `chat`, `audio`, `objects` and `playersState`. Their `room_id` becomes
  null and the records survive, so chat history is preserved and reusable configuration is not destroyed. A player
  whose saved room was deleted ends with a null `room_id` and falls back to the default room, which is what the
  "Set default" option in the room view is for.

Those groups come from the `onDelete` value that `@reldens/storage` writes onto every generated reference
property, read live from `information_schema`. After changing any referential action, regenerate the entities
(`npm exec -- reldens generateEntities --override`) or the admin will report the old grouping. A reference
property with no `onDelete` at all is reported as possibly blocking the delete rather than assuming an outcome.

Not handled by the delete: the room map files on disk (`dist/assets/maps`, the theme assets copy and
`generate-data/generated`) are left behind and have to be removed manually.

#### Deleting a room while the server is running

The default room can never be deleted. `DeletedRoomPlayersRelocator` (`lib/rooms/server/deleted-room-players-relocator.js`)
subscribes to `reldens.adminBeforeEntityDelete` and prevents the delete with the `errorRoomDeleteIsDefault` result when
any selected id matches the `players/initialState/room_id` config value. The administrator has to assign another room as
default first (room view, "Set default").

For any other room the player states pointing at it are moved to the default room before the delete, and the pending
saves of the disconnected players use the default room id too. That is `server/rooms/deletion/setDefault`
(boolean, default `1`).

Turning it off leaves the player states alone: the `players_state.room_id` foreign key is `ON DELETE SET NULL`, so the
database unlinks them, the pending saves write null, and a player whose saved room is null is placed in the fallback
room on the next login (`LoginManager.getRoomNameById` returns `GameConst.ROOM_NAME_MAP` when the id resolves to
nothing).

That prevention is the authority and covers any direct call to the delete route. So the administrator is not sent
through a failing delete, `RoomsActivePlayersWarning` (`lib/admin/server/rooms-active-players-warning.js`) exposes the
configured default room id on the rooms pages: on the view page it is a `data-default-room-id` attribute on the active
players banner (`reldens.adminViewPropertiesPopulation`) and on the list page an empty element with the same attribute
appended to `extraContentForList` (`reldens.adminListPropertiesPopulation`).

With that id, `theme/admin/js/rooms-default-room-delete-blocker.js` captures the delete attempts before the admin
client handles them: any `form-delete` submit (room view buttons and the list row button) and the list mass delete
click. When the submitted ids or the checked ids include the default room the event is stopped, nothing is sent to the
server and the existing confirm dialog is reused (`adminFunctions.showConfirmDialog`) to warn that another room has to
be set as default first. Nothing is displayed until a delete is actually attempted.

Once the row is deleted, `reldens.adminAfterEntityDelete` triggers `DeletedRoomCloser`
(`lib/rooms/server/deleted-room-closer.js`), which runs the runtime teardown. It is wired to the after event on purpose:
a failed delete must not tear down a room that still exists. The teardown purges the room from the `RoomsManager`
caches and selector lists, broadcasts `RoomsConst.ROOM_REMOVED` to the lobby room so connected clients drop it from
their scene selector, sends the players in the room the `chat.roomClosing` message plus a `RoomsConst.ROOM_CLOSING`
message, and disconnects the live room instance after the configured time.

That purge is also what marks the room as gone for the rest of the server: there is no deleted-rooms registry, an id
that no longer resolves is simply an invalid reference. `RoomsManager.isRoomLoaded()` answers it from
`loadedRoomsById`, which the teardown emptied.

The room type is never unregistered from the Colyseus matchmaker. Its `handlers[roomName]` entry is dereferenced without
a guard by the matchmaker on every client leave and on dispose, so removing it while an instance is alive crashes the
process. Nothing rejects the room in `RoomLogin.onCreate` either: the room is already out of the manager lists and out
of the room selectors sent to the clients, so it cannot be picked, and erroring inside `onCreate` would break the room
creation for a room that is merely missing from the cache.

The behavior is controlled by these config rows, all created with those defaults:

- `server/rooms/deletion/closeActiveRoomsEnabled` (boolean, default `1`) - when disabled the players are not notified
  and the live instance is left running until it disposes on its own.
- `server/rooms/deletion/closeActiveRoomsSeconds` (float, default `10`) - seconds between the notification and the
  forced close, also shown in the admin warning banner.
- `server/rooms/deletion/closeActiveRoomsWarningSeconds` (float, default `5`) - seconds between the repeated warnings
  during the countdown.
- `server/rooms/deletion/setDefault` (boolean, default `1`) - the player states of a deleted room are moved to the
  default room; turn it off to leave them unlinked by the foreign key instead.

Everything in this flow is expressed in seconds, the unit the countdown and the messages actually use, so there is no
milliseconds conversion anywhere: the `RoomsConst.ROOM_CLOSING` broadcast carries `seconds` and only the client
multiplies it for its `setTimeout`. The countdown runs on a one second interval and repeats the `chat.roomClosing`
message on every multiple of the warning interval, then on every remaining second once the remaining time is under that
interval, so a 10 second close with a 5 second interval warns at 10, 5, 4, 3, 2 and 1. This mirrors the server shutdown countdown in `ShutdownSubscriber`.
Broadcasts are skipped when the room has no clients left, and the room is disconnected when the counter reaches zero.

The room view banner refreshes itself: `RoomsActivePlayersSubscriber`
(`lib/admin/server/subscribers/rooms-active-players-subscriber.js`) renders the banner and serves
`/rooms/active-players?id=N`, which `theme/admin/js/rooms-active-players-refresher.js` polls on the interval given
by the banner `data-refresh-ms` attribute. The warning paragraph is always rendered and only hidden with a class, so it
appears and disappears as players join or leave, and the delete confirmation dialog reads its text from that visible
paragraph instead of a duplicated attribute.

Anything that persists a room id while a room is being deleted has to survive the row being gone, or the pending saves
of the disconnected players fail with foreign key constraint errors:

- The rooms plugin sanitizes the player state patch on `reldens.onSavePlayerStateBefore`. The handler is called from
  `emitSync`, so it cannot query the database: it asks `RoomsManager.isRoomLoaded()` and writes null when the id no
  longer resolves, or the default room id when `setDefault` is enabled.
- `ChatManager.saveMessage` keeps the room id and lets the foreign key decide. When the insert fails and a room id was
  set, it drops the room reference and inserts again, so the message is kept without a room instead of being lost. The
  happy path stays at one query, which matters because combat messages go through it.

#### Linking rooms and picking tiles in the map

The room view "Link rooms" form creates one `roomsChangePoints` row on the current room plus one `roomsReturnPoints`
row on the destination room (`lib/admin/server/subscribers/rooms-entity-subscriber.js:186-238`). Both values are
picked on the map canvas, never typed as coordinates:

- The change point field is a tile index and the "Pick in map" button next to it toggles the current room map
  (`.current-room-change-point-container`), the same way the objects edit form works.
- The destination position is also a tile index. The "Pick in map" button next to it toggles the selected next room
  map and the picked tile is translated to the `nextRoomPositionX` and `nextRoomPositionY` hidden inputs using the
  tile center, which is what the server saves as `rooms_return_points.x` and `y`. Changing the next room clears the
  picked tile and the hidden position, because a tile index only means something on one map.
- `AdminRoomsLinkPicker` (`theme/admin/js/admin-rooms-link-picker.js`) owns that form,
  `AdminObjectTilePicker` (`theme/admin/js/admin-object-tile-picker.js`) owns the objects and change points edit
  forms, and both use the shared `AdminMapRenderer.toggleMapPicker` plus `calculateTileData`
  (`theme/admin/js/admin-map-renderer.js`) so the tile math exists once.

The change point record is what makes the room change work: at runtime `StorageChangePointsCreator`
(`lib/world/server/storage-change-points-creator.js`) creates the missing bodies from the records after every map
layer was parsed, so change points also work on maps with no `change-points` layer (the generated maps have none,
which is why they did nothing before). The body is placed by `P2world.createChangePoint`, which receives the tile
column and row and resolves the tile center itself, next to the half tile size that makes the player walk into the
tile to hit it. Conditions that still apply: the tile must be walkable, meaning no collision layer tile marks it,
and both the rooms and the maps are cached at startup, so a change point created while the server runs needs a
restart to be live (the map file write refreshes the cached map, the room change points list is not refreshed).

The map layer is still worth having, so the link form offers to write it. When the current room map has no layer
whose name contains `change-points`, saving the link asks "This room does not have the required change points layer
in the map file, should I create it?" with Yes and No, and the field help marker explains what the layer is used
for: the client draws it with the `client/map/layersDepth/changePoints` depth, the map carries its change points
into another installation through the layer properties that `lib/import/server/rooms-associations-creator.js` reads
back, and the maps generator uses those layers for the linked interiors and to keep the generated paths off the door
tiles. Answering No keeps the record only.

`RoomMapChangePointsLayerWriter` (`lib/admin/server/room-map-change-points-layer-writer.js`) does that write:

- The tile marked in the layer is the one already visible in that position, taken from the topmost layer that has a
  tile there (change points layers excluded), so the map keeps looking exactly the same and the gid is always valid
  for the map tilesets. A position that is empty in every layer is refused.
- The layer is reused when the map already has one whose name contains `change-points`, otherwise a layer named
  `change-points` is appended. That exact name is in the elements editor skip list, so an editor save keeps it.
- The change point is also saved as a `change-point-for-<nextRoomName>` layer property, which is the format the
  importer reads.
- The write follows the same path as the rest of the map tooling: the live copy under `generate-data/generated` is
  seeded from the theme assets, a backup pair is written before touching it, then the live file is saved, published
  to the theme assets and the dist copies (merging the elements record when there is one) and the cached runtime map
  is refreshed. A failed write redirects with `result=errorWriteMapLayer`, the link records are already saved.
- Not covered: deleting a change point record does not remove the tile from the layer, and resizing or regenerating
  the map invalidates the stored tile indexes the same way it always did.

### Game Objects
NPC and interactive object definitions, their visuals, stats, and skills.
- `objects` - Object definitions (key, class path, type, room assignment)
- `objectsTypes` - Object type definitions
- `objectsAnimations` - Sprite animations per object
- `objectsAssets` - Asset references per object
- `objectsStats` - Stat values assigned to objects
- `objectsSkills` - Skills assigned to objects
- `objectsItemsInventory` - Items in object inventories
- `objectsItemsRequirements` - Item requirements for objects
- `objectsItemsRewards` - Items objects drop as rewards
- `targetOptions` - Options for targeting behavior

#### Objects edit form: room, layer name and tile index

The three fields are filled from the selected room map. `RoomsMapDataProvider.loadRoomsMapList()`
(`lib/admin/server/rooms-map-data-provider.js`) ships `{id, name, mapFile, mapImages, layers}` per room into
`entitySerializedData.extraData.roomsList`, where `layers` are the map layers names taken from the maps the server
already keeps in the configuration manager (`server/maps`, loaded by `MapsLoader`), so no map file is read per request.

- Selecting a room turns the "Layer Name" field into a select of that map layers names
  (`theme/admin/js/admin-object-layer-selector.js`). The text input is kept as a hidden input carrying the value, so
  `layer_name` is still what gets saved. A room whose map is not loaded in the configuration falls back to the plain
  text input, and a saved layer name that does not exist in the map is kept as an option instead of being replaced.
- "Pick in map" for the tile index renders that same room map and writes the clicked tile index.

### Skills
Skill definitions, attack data, animations, and effect conditions.
- `skillsSkill` - Core skill definitions
- `skillsSkillType` - Skill type classifications
- `skillsSkillAttack` - Attack data (damage, range, etc.)
- `skillsSkillAnimations` - Animations associated with skills
- `skillsSkillPhysicalData` - Physical properties (hitbox, etc.)
- `skillsGroups` - Skill groups/categories
- `skillsSkillGroupRelation` - Skill-to-group assignments
- `skillsSkillOwnerConditions` - Conditions checked on the skill owner
- `skillsSkillOwnerEffects` - Effects applied to skill owner
- `skillsSkillOwnerEffectsConditions` - Conditions on owner effects
- `skillsSkillTargetEffects` - Effects applied to skill target
- `skillsSkillTargetEffectsConditions` - Conditions on target effects
- `skillsLevelsModifiersConditions` - Conditions on level modifier application

### Classes & Levels
Class paths, level sets, and level-based stat modifiers.
- `skillsClassPath` - Class path definitions
- `skillsClassPathLevelLabels` - Display labels for levels per class path
- `skillsClassPathLevelSkills` - Skills unlocked at specific levels
- `skillsClassLevelUpAnimations` - Level-up animation assignments
- `skillsLevelsSet` - Groups of level definitions
- `skillsLevels` - Individual level entries
- `skillsLevelsModifiers` - Stat modifiers applied at each level

### Users
Player accounts, stats, scores, and class assignments.
- `users` - User accounts
- `usersLogin` - Login records/sessions
- `usersLocale` - Per-user locale settings
- `players` - Player entities linked to users
- `playersState` - Player runtime state data
- `playersStats` - Player stat values (hp, mp, atk, etc.)
- `stats` - Stat type definitions (the list of available stats)
- `scores` - Player score records
- `scoresDetail` - Detailed score breakdowns
- `skillsOwnersClassPath` - Class path assignments per player

### Items & Inventory
Item types, groups, and inventory data.
- `itemsItem` - Item definitions
- `itemsTypes` - Item type classifications
- `itemsGroup` - Item group definitions
- `itemsItemModifiers` - Stat modifiers applied by items
- `itemsInventory` - Inventory records (who holds what items)

### Rewards
Drop tables, reward events, and modifiers.
- `rewards` - Reward definitions
- `rewardsModifiers` - Stat modifiers granted by rewards
- `rewardsEvents` - Events that trigger reward distribution
- `rewardsEventsState` - State tracking for reward events
- `dropsAnimations` - Visual animations for item drops

### Respawn
Respawn point and behavior configuration.
- `respawn` - Respawn configuration entries

### Audio
Sound effects, music, and per-player audio config.
- `audio` - Audio file references
- `audioCategories` - Audio category groupings
- `audioMarkers` - Markers within audio tracks
- `audioPlayerConfig` - Per-player audio preferences

### Chat
Chat messages and message type configuration.
- `chat` - Chat message log
- `chatMessageTypes` - Chat message type definitions

### Translations
Localization strings and text snippets.
- `snippets` - Text snippets used in UI and messages
- `locale` - Locale string entries

### Ads
Ad banners, providers, and playback tracking.
- `ads` - Ad definitions
- `adsBanner` - Banner ad data
- `adsProviders` - Ad provider configurations
- `adsTypes` - Ad type classifications
- `adsEventVideo` - Video ad event data
- `adsPlayed` - Ad playback tracking records

### Clan
Clan definitions, levels, modifiers, and membership.
- `clan` - Clan definitions
- `clanLevels` - Clan level definitions
- `clanLevelsModifiers` - Stat modifiers applied at clan levels
- `clanMembers` - Clan membership records

### Features
Feature flags and plugin enablement.
- `features` - Feature definitions and enabled/disabled state

---

## Entity Override System

### What Are Entity Overrides?

Generated entities in `generated-entities/entities/` are auto-created from the database schema by running `reldens generateEntities`. They are **read-only** - regenerated whenever the schema changes.

Entity overrides are manually created files that **extend** generated entities to customize admin panel behavior. They live in:
```
lib/{plugin}/server/entities/{entity-name}-entity-override.js
```

**Important**: Entity overrides only affect the admin panel UI - they do NOT change the database schema, server logic, or data layer. The override system controls:
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

Model overrides add business logic methods, relationships, or hooks at the ORM layer - beyond what the admin panel configuration layer provides. See `storage-architecture.md` for details on the storage driver and entity access patterns.

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
