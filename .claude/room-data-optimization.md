# Room Data Optimization - Scene Data Filter

**Purpose**: Optimize Colyseus schema buffer usage by detecting and extracting shared properties from room objects, reducing data transmission size without losing functionality.

---

## Overview

The SceneDataFilter system prevents Colyseus buffer overflow by analyzing room data and extracting identical properties across multiple objects into a shared defaults structure. In the illustrative estimate of a room with 400+ objects (see Performance Impact) it reduces the buffer usage from ~176 KB to under 64 KB.

**Key Components**:
- **Server**: `SceneDataFilter` (`lib/rooms/server/scene-data-filter.js`) - Detects shared properties, creates optimized data structure
- **Client**: `AnimationsDefaultsMerger` (`lib/game/client/animations-defaults-merger.js`) - Merges the `preloadAssetsDefaults` back into the preload assets and the `animationsDefaults` back into the objects

**Critical Design Principle**: The filter NEVER adds properties to objects. It ONLY extracts existing identical properties to a separate defaults structure.

---

## Server-Side: SceneDataFilter

### Architecture

**SceneDataFilter Methods:**
- filterRoomData() - Main entry (called by State.mapRoomData), with sendAll: true it returns `Object.assign({}, roomData)` (unfiltered copy)
- buildCompleteData() - Returns an unfiltered copy, not called by anything (the sendAll path of filterRoomData builds its own copy)
- buildFilteredData() - Returns optimized data (sendAll: false, no custom processor)
- optimizeData() - Generic optimization method
- detectIdenticalProperties() - Finds shared properties across objects
- valuesAreDifferent() - Compares values for optimization

### How It Works

1. **No Hardcoded Fields**: Filter dynamically detects which fields are identical across objects
2. **Grouping**: Objects are grouped by a shared field for comparison (the value is resolved by `GroupValueResolver`, `lib/game/group-value-resolver.js`, shared by the server filter and the client merger)
   - `preloadAssets`: Groups by `asset_type` (filters `asset_type === 'spritesheet'`)
   - `objectsAnimationsData`: Groups by `asset_key` field, falls back to `key` field if `asset_key` not present
3. **Detection**: For each group with 2+ objects, detects properties with identical values across ALL objects
4. **Extraction**: Identical properties extracted to defaults object, keyed by grouping field value
5. **Grouping Field Preservation**: The grouping field (e.g., `asset_key`) and the `key` field are removed from the detected identical properties and kept in each object so client can look up defaults

### Optimization Logic

```javascript
// Example: 200 objects with asset_key: 'enemy_forest_1'
{
  'enemy_1': {asset_key: 'enemy_forest_1', type: 'npc', enabled: true, x: 100, y: 200},
  'enemy_2': {asset_key: 'enemy_forest_1', type: 'npc', enabled: true, x: 150, y: 250},
  ...
}

// Filter detects: type, enabled are identical across all 200 objects
// Result:
{
  objectsAnimationsData: {
    'enemy_1': {asset_key: 'enemy_forest_1', x: 100, y: 200},
    'enemy_2': {asset_key: 'enemy_forest_1', x: 150, y: 250},
    ...
  },
  animationsDefaults: {
    'enemy_forest_1': {type: 'npc', enabled: true, ...}
  }
}
```

**Key Points**:
- `asset_key` stays in each object (needed for client to lookup defaults)
- Only properties with IDENTICAL values across ALL objects in group are extracted
- Properties with different values (x, y, content, options, id) stay in each object
- Single-object groups are NOT optimized (no shared properties to extract)

### When Optimization Happens vs Doesn't

**Town Room (`reldens-new-age-town`, 7 doors and 4 NPCs)**:
- The 7 doors share the `door_house_3` asset key (their `client_params.asset_key`), so they are one group: the
  properties with the same value in every door go to `animationsDefaults['door_house_3']`, the different ones stay in
  each door (`key`, position and `positionFix`, because one door uses another offset)
- Each NPC has its own key and no asset key, so every NPC is a single-object group: no optimization, its data stays
  as it is with the `key` field as asset reference

**Forest Room (illustrative example with 400 NPCs)**:
- The numbers are illustrative: the sample data `reldens-forest-level-1` room has 12 Tree and 18 Tree Punch enemies and 10 mining rocks, and the `reldens-bots-forest` room has 100 Tree and 200 Tree Punch enemies
- 200 enemies of type A, 200 enemies of type B
- Each group has identical shared properties
- Result: `animationsDefaults: {'enemy_forest_1': {...}, 'enemy_forest_2': {...}}`
- The `asset_key` field comes from the object data built by the server, the filter only groups by it and never adds properties
- Optimized objects contain only unique properties (x, y) + `asset_key` reference

### preloadAssets Filtering

**Process**:
1. Filters only `asset_type === 'spritesheet'` (matches client loader)
2. Groups remaining assets by `asset_type`
3. Detects identical properties across assets with same type
4. Extracts to `preloadAssetsDefaults[asset_type]`

**Typically Kept Fields** (detected dynamically, NOT hardcoded):
- `asset_type` - Grouping field (stays in each asset)
- `asset_key` - Usually unique per asset
- `asset_file` - Usually unique per asset
- `extra_params` - Often identical for same asset_type

**Typically Removed to Defaults** (if identical across assets):
- Database metadata fields if they happen to be identical

**Result**: Minimal optimization for preloadAssets since most fields are unique per asset.

### objectsAnimationsData Optimization

**Process**:
1. Groups objects by `asset_key` field (or `key` field if no `asset_key`)
2. For groups with 2+ objects: Detects identical properties
3. Removes grouping field from identical properties (keeps in each object)
4. Extracts identical properties to `animationsDefaults[grouping_value]`
5. Objects retain only unique properties + grouping field reference

**Grouping Field Priority**:
1. Use `asset_key` if present (already set by server for optimized objects)
2. Fall back to `key` field if no `asset_key` (non-optimized objects)

**Critical**: Grouping field (`asset_key` or `key`) is NEVER extracted to defaults. It must stay in each object so client can look up the correct defaults entry.

---

## Client-Side: AnimationsDefaultsMerger

### Purpose

Merges extracted defaults back into the preload assets and the objects after receiving optimized data from server.

### When It Runs

`RoomEvents.checkAndCreateScene()` (`lib/game/client/room-events.js`) runs it over the parsed scene data:

```javascript
this.roomData = AnimationsDefaultsMerger.mergeDefaults(sc.toJson(this.room.state.sceneData));
```

**Important**: `mergeDefaults` runs `mergeGroupDefaults` twice, first for `preloadAssets` with `preloadAssetsDefaults` grouped by `asset_type`, then for `objectsAnimationsData` with `animationsDefaults` grouped by `asset_key`. Each pass leaves the room data unchanged when its data or its defaults are not present. Server adds `animationsDefaults: {}` and `preloadAssetsDefaults: {}` (even if empty) when filter is active.

**Preload assets**: when every spritesheet of the room shares the same `extra_params` (for example two enemies with the same frame size and no other objects), the filter moves `extra_params` to `preloadAssetsDefaults.spritesheet`. The merger restores it before `ScenePreloader.preloadValidAssets()` reads `asset.extra_params`, otherwise the spritesheets are never loaded and the objects have no sprite.

### Merge Logic

```javascript
static mergeGroupDefaults(roomData, dataKey, defaultsKey, groupingField)
{
    if(!sc.hasOwn(roomData, defaultsKey)){
        return;
    }
    if(!sc.hasOwn(roomData, dataKey)){
        return;
    }
    let groupDefaults = roomData[defaultsKey];
    let groupData = roomData[dataKey];
    let itemKeys = Object.keys(groupData);
    for(let key of itemKeys){
        let itemData = groupData[key];
        let groupValue = GroupValueResolver.resolve(itemData, groupingField);
        if('' === groupValue || !sc.hasOwn(groupDefaults, groupValue)){
            continue;
        }
        groupData[key] = Object.assign({}, groupDefaults[groupValue], itemData);
    }
    delete roomData[defaultsKey];
}
```

### Key Behavior

**Optimized Objects** (their group value has a defaults entry):
1. Group value resolved with `GroupValueResolver.resolve(objectData, 'asset_key')`: the `asset_key` value, or the `key` value when there is no `asset_key`
2. Merged: `Object.assign({}, defaults, objectData)` - object properties override defaults
3. Result has all properties needed for rendering

**Non-Optimized Objects** (no defaults entry for their group value):
1. Skipped entirely - no modifications
2. All original properties preserved as-is
3. Ready for rendering without merge

After each loop the merger deletes the merged defaults (`preloadAssetsDefaults`, `animationsDefaults`) from the room data.

### Why This Matters

The merger resolves the group value the same way the server filter does, so both sides group and restore by the exact same value:
- **Objects without a defaults entry**: Were NOT optimized by server, have complete data, use `asset_key` or `key` field as asset reference
- **Objects with a defaults entry**: Were optimized by server, have partial data, need defaults merged

The merger never rewrites the `key` field: the filter never extracts `key` to the defaults, so every object keeps its own value.

---

## Data Flow Examples

### Town NPCs (No Optimization)

**Server Processing**:
```javascript
// Original data, two of the town NPCs (objects 5 and 8, layer 'ground', tiles 3482 and 3567)
objectsAnimationsData: {
  'ground3482': {
    key: 'people_town_1',
    content: 'Hello! My name is Alfred...',
    ...all properties...
  },
  'ground3567': {
    key: 'healer_1',
    ...all properties...
  }
}

// SceneDataFilter analysis:
// - Group by 'asset_key', falling back to the 'key' field (GroupValueResolver), no asset_key present
// - Each object has unique 'key' value = single-object groups
// - No optimization performed for them

// Server output
{
  objectsAnimationsData: { ...unchanged... },
  // only the door_house_3 entry of the town doors, nothing for the NPCs
  animationsDefaults: {...}
}
```

**Client Processing**:
```javascript
// AnimationsDefaultsMerger.mergeDefaults() runs
for(let key of ['ground3482', 'ground3567']){
    let objectData = objectsAnimationsData[key];
    // resolved group value: 'people_town_1' / 'healer_1' (from the key field)
    let groupValue = GroupValueResolver.resolve(objectData, 'asset_key');
    // animationsDefaults has no entry for these group values:
    if('' === groupValue || !sc.hasOwn(animationsDefaults, groupValue)){
        // SKIP - no modifications, keep original data
        continue;
    }
}

// Result: the NPC objects are unchanged
objectsAnimationsData: {
  'ground3482': {key: 'people_town_1', ...},
  'ground3567': {key: 'healer_1', ...}
}

// AnimationEngine uses props.key fallback
// object['ground3482'].key = 'people_town_1' loads asset 'people_town_1' and the NPC dialog works
```

### Forest Room (With Optimization)

Illustrative example, the object keys, the property values and the 400 objects are not the sample data ones.

**Server Processing**:
```javascript
// Original data: 400 objects, 200 identical enemies per type
objectsAnimationsData: {
  'enemy_1': {
    // Already set by server
    asset_key: 'enemy_forest_1',
    type: 'npc',
    enabled: true,
    targetName: 'enemy-pve',
    layerName: 'enemies-layer',
    x: 100,
    y: 200
  },
  'enemy_2': {
    asset_key: 'enemy_forest_1',
    type: 'npc',
    enabled: true,
    targetName: 'enemy-pve',
    layerName: 'enemies-layer',
    x: 150,
    y: 250
  },
  // ... 198 more with same asset_key
}

// SceneDataFilter analysis:
// - Group by 'asset_key' field
// - 'enemy_forest_1' group has 200 objects
// - Detects identical: type, enabled, targetName, layerName
// - Keeps unique: x, y (different per object)
// - Keeps grouping field: asset_key (needed for lookup)

// Server output
{
  objectsAnimationsData: {
    'enemy_1': {asset_key: 'enemy_forest_1', x: 100, y: 200},
    'enemy_2': {asset_key: 'enemy_forest_1', x: 150, y: 250},
    // ... 198 more (only unique props + asset_key)
  },
  animationsDefaults: {
    'enemy_forest_1': {
      type: 'npc',
      enabled: true,
      targetName: 'enemy-pve',
      layerName: 'enemies-layer',
      // ... all shared properties
    }
  }
}
```

**Client Processing**:
```javascript
// AnimationsDefaultsMerger.mergeDefaults() runs
for(let key of ['enemy_1', 'enemy_2', ...]){
    let objectData = objectsAnimationsData[key];
    // {asset_key: 'enemy_forest_1', x: 100, y: 200}

    // Resolve the group value: 'enemy_forest_1'
    let groupValue = GroupValueResolver.resolve(objectData, 'asset_key');
    if('' === groupValue || !sc.hasOwn(animationsDefaults, groupValue)){
        // NOT executed - the defaults entry exists
        continue;
    }

    // Merge
    objectsAnimationsData[key] = Object.assign({}, animationsDefaults[groupValue], objectData);
    // Result: {
    //   type: 'npc',
    //   enabled: true,
    //   targetName: 'enemy-pve',
    //   layerName: 'enemies-layer',
    //   asset_key: 'enemy_forest_1',
    //   x: 100,
    //   y: 200
    // }
}

// AnimationEngine uses props.asset_key (exists) loads asset 'enemy_forest_1'
// All properties restored from defaults + unique props
```

---

## Performance Impact

### 400 Objects Example (Forest Room)

Illustrative estimate for a room with 400 objects, the sizes below were not measured on the sample data rooms.

**Unfiltered**:
- preloadAssets: 400 × 2 assets × 275 bytes = 220 KB
- objectsAnimationsData: 400 × 150 bytes = 60 KB
- roomData: 10 KB
- **Total sceneData**: ~290 KB
- **Total State (with 50 players)**: ~176 KB encoded
- **Buffer overflow**: Required 176 KB vs 8 KB default

**Optimized**:
- preloadAssets: 2 spritesheets × 95 bytes = 0.2 KB
- objectsAnimationsData: 400 × 35 bytes = 14 KB
- animationsDefaults: 2 entries × 140 bytes = 0.3 KB
- roomData: 10 KB
- **Total sceneData**: ~25 KB
- **Total State (with 50 players)**: ~80 KB encoded

**Reduction**:
- sceneData: 265 KB saved (91% reduction)
- Total State: 96 KB saved (54.5% reduction)

---

## Configuration

### sendAll Flag

**Path**: `server/rooms/data/sendAll` (config table: scope `server`, path `rooms/data/sendAll`)
**Default**: `false` (filtering enabled), the path is not seeded, the filter falls back to the default

```sql
REPLACE INTO `config` (`scope`, `path`, `value`, `type`) VALUES
('server', 'rooms/data/sendAll', '0', 3);
```

**Values** (boolean config type, stored as `0` / `1`):
- `false`: Enables optimization (recommended for production)
- `true`: Sends all data unfiltered (debugging only)

### Custom Processor

For custom filtering logic, define a processor in server plugin.

**Path**: `server/customClasses/sceneDataProcessor`
**Method**: `process({ roomData, filter })`

**Example**:
```javascript
class CustomSceneDataProcessor {
    process({ roomData, filter }) {
        let customData = Object.assign({}, roomData);
        // Use filter methods for standard optimization
        let optimized = filter.buildFilteredData(roomData);
        // Add custom fields
        customData.customField = 'custom value';
        return Object.assign({}, optimized, customData);
    }
}

// on the ServerManager config object (theme/plugins/server-plugin.js):
customClasses: {
    sceneDataProcessor: new CustomSceneDataProcessor()
}
```

---

## Key Concepts

### asset_key Field

**Purpose**: Reference to shared defaults, used for grouping and lookup

**When Present**:
- Set on the object data built by the server (the filter never adds it)
- Used as the grouping value, so the object may have partial data and need defaults merged
- Client uses it to lookup defaults and as asset reference

**When NOT Present**:
- Client uses `key` field as asset reference, and the merger falls back to `key` as grouping value

### key Field

**Two Different Roles**:

1. **Objects without `asset_key`**: Asset reference (e.g., 'people_town_1')
   - Original value from server
   - AnimationEngine fallback: `sc.get(props, 'asset_key', props.key)`
   - Used to load sprite asset and as grouping value fallback

2. **Objects with `asset_key`**: Object identifier
   - Original value from server, never rewritten by the client merger
   - Not used for asset loading (asset_key used instead)

### Grouping Fields

**Purpose**: Field used to group objects for comparison and defaults lookup

**Requirements**:
- Must be identical across all objects in group
- Must stay in each object (NOT extracted to defaults)
- Client needs it to look up correct defaults entry

**Examples**:
- `asset_type` for preloadAssets
- `asset_key` for objectsAnimationsData (if present)
- `key` for objectsAnimationsData (fallback if no asset_key)

### Why Grouping Field Must Stay in Objects

```javascript
// If asset_key was extracted to defaults:
objectsAnimationsData: {
  // No asset_key!
  'enemy_1': {x: 100, y: 200}
}
animationsDefaults: {
  'enemy_forest_1': {asset_key: 'enemy_forest_1', type: 'npc', ...}
}

// Client can't merge - doesn't know which defaults to use!
// No way to know 'enemy_1' should use 'enemy_forest_1' defaults
```

Keeping grouping field in each object allows lookup:
```javascript
// 'enemy_forest_1'
let assetKey = objectData.asset_key;
// Found!
let defaults = animationsDefaults[assetKey];
```

---

## Integration Points

### Server Integration

**RoomScene** (`lib/rooms/server/scene.js`, `RoomScene.onCreate`):
```javascript
this.sceneDataFilter = new SceneDataFilter({config: this.config});
// room data is saved on the state:
let roomState = new State(this.roomData, this.sceneDataFilter);
```

**State** (`lib/rooms/server/state.js`), the constructor keeps the room data and the filter and calls `mapRoomData()`:
```javascript
this.roomData = roomData || {};
/** @type {SceneDataFilter|boolean} */
this.sceneDataFilter = sceneDataFilter || false;
this.mapRoomData();
```

`State.mapRoomData(roomData)` falls back to `this.roomData` when no data is passed and then filters it:
```javascript
if(this.sceneDataFilter && this.sceneDataFilter.filterRoomData){
    roomData = this.sceneDataFilter.filterRoomData(roomData);
}
/** @type {string} */
this.sceneData = sc.toJsonString(roomData);
```

### Client Integration

**RoomEvents** (`lib/game/client/room-events.js`, in `checkAndCreateScene()`):
```javascript
if(0 === Object.keys(this.roomData).length){
    this.roomData = AnimationsDefaultsMerger.mergeDefaults(sc.toJson(this.room.state.sceneData));
}
```

**AnimationEngine** (`lib/objects/client/animation-engine.js`), the constructor (`constructor(gameManager, props, currentPreloader)`) uses `asset_key` if present and falls back to `key`:
```javascript
this.asset_key = sc.get(props, 'asset_key', props.key);
```

---

## Testing

### Verify Optimization Behavior

**Town Room (Doors Optimized, NPCs Not)**:
1. Join the `reldens-new-age-town` room
2. Verify: `animationsDefaults` only has the `door_house_3` entry
3. Check browser console: the NPC objects keep all their data
4. Test the doors open and the NPC dialogs work correctly

**Forest Room (Optimization Expected)**:
1. Join the `reldens-forest-level-1` room (12 Tree and 18 Tree Punch enemies and 10 mining rocks in the sample data)
2. Check browser console: Objects have `asset_key` field
3. Verify: `animationsDefaults` has entries
4. Test enemies render and behave correctly

### Measure Data Size

Add logging in `State.mapRoomData()`:
```javascript
this.sceneData = sc.toJsonString(roomData);
Logger.info('sceneData size: ' + this.sceneData.length + ' bytes');
```

### Verify Buffer Overflow Resolved

```bash
node theme/plugins/bot.js --numClients 50 --room reldens-bots-forest --endpoint http://localhost:8080
```

Expected: No buffer overflow warnings in server console.

### Verify Client Functionality

1. Join rooms with various object counts
2. Verify spritesheets load correctly
3. Verify animations play correctly
4. Verify NPC dialogs work correctly
5. Check browser console for errors related to missing assets or properties

---

## Debugging

### Disable Filtering

Set in the database (the value is read once, when the room creates the filter):
```sql
REPLACE INTO `config` (`scope`, `path`, `value`, `type`) VALUES
('server', 'rooms/data/sendAll', '1', 3);
```

Sends all database fields to client for debugging. Compare filtered vs unfiltered data to identify issues.

### Log Optimization Results

```javascript
class DebugSceneDataProcessor {
    process({ roomData, filter }) {
        let filtered = filter.buildFilteredData(roomData);
        Logger.info('objectsAnimationsData count:', Object.keys(filtered.objectsAnimationsData || {}).length);
        Logger.info('animationsDefaults entries:', Object.keys(filtered.animationsDefaults || {}).length);

        // Log which objects were optimized
        for(let key of Object.keys(filtered.objectsAnimationsData || {})){
            let obj = filtered.objectsAnimationsData[key];
            if(sc.hasOwn(obj, 'asset_key')){
                Logger.info('Optimized object:', key, 'asset_key:', obj.asset_key);
            }
        }

        return filtered;
    }
}
```

### Common Issues

**NPCs Not Visible**:
- Check browser console for asset loading errors
- Verify `asset_key` or `key` field present in object
- Verify asset exists in preloadAssets
- Check AnimationEngine.asset_key is set correctly

**NPC Dialogs Not Working**:
- Verify non-optimized objects keep original `key` field value
- Check AnimationsDefaultsMerger is NOT modifying objects without a defaults entry for their group value
- Verify dialog system uses correct object reference

**Buffer Overflow Still Occurring**:
- Verify `sendAll: false` in config
- Check optimization is detecting shared properties
- Log data size before/after filtering
- Verify client is merging defaults correctly

---

## References

- **Server Filter**: `lib/rooms/server/scene-data-filter.js`
- **Client Merger**: `lib/game/client/animations-defaults-merger.js`
- **Group Value Resolver**: `lib/game/group-value-resolver.js`
- **State Integration**: `lib/rooms/server/state.js`
- **Scene Integration**: `lib/rooms/server/scene.js`
- **Room Events**: `lib/game/client/room-events.js`
- **Animation Engine**: `lib/objects/client/animation-engine.js`
- **Colyseus Schema**: https://docs.colyseus.io/state/schema/
