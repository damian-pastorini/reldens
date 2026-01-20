# Room Data Optimization - Scene Data Filter

**Purpose**: Optimize Colyseus schema buffer usage by detecting and extracting shared properties from room objects, reducing data transmission size without losing functionality.

---

## Overview

The SceneDataFilter system prevents Colyseus buffer overflow by analyzing room data and extracting identical properties across multiple objects into a shared defaults structure. This reduces buffer usage from ~176 KB to under 64 KB for rooms with 400+ objects.

**Key Components**:
- **Server**: `SceneDataFilter` (`lib/rooms/server/scene-data-filter.js`) - Detects shared properties, creates optimized data structure
- **Client**: `AnimationsDefaultsMerger` (`lib/game/client/animations-defaults-merger.js`) - Merges defaults back into objects

**Critical Design Principle**: The filter NEVER adds properties to objects. It ONLY extracts existing identical properties to a separate defaults structure.

---

## Server-Side: SceneDataFilter

### Architecture

**SceneDataFilter Methods:**
- filterRoomData() - Main entry (called by State.mapRoomData)
- buildCompleteData() - Returns unfiltered data (sendAll: true)
- buildFilteredData() - Returns optimized data (sendAll: false)
- optimizeData() - Generic optimization method
- detectIdenticalProperties() - Finds shared properties across objects
- valuesAreDifferent() - Compares values for optimization

### How It Works

1. **No Hardcoded Fields**: Filter dynamically detects which fields are identical across objects
2. **Grouping**: Objects are grouped by a shared field for comparison
   - `preloadAssets`: Groups by `asset_type` (filters `asset_type === 'spritesheet'`)
   - `objectsAnimationsData`: Groups by `asset_key` field, falls back to `key` field if `asset_key` not present
3. **Detection**: For each group with 2+ objects, detects properties with identical values across ALL objects
4. **Extraction**: Identical properties extracted to defaults object, keyed by grouping field value
5. **Grouping Field Preservation**: The grouping field (e.g., `asset_key`) is removed from defaults and kept in each object so client can look up defaults

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

**Town Room (6 NPCs)**:
- Each NPC has unique properties (different types, content, options)
- No groups with 2+ identical objects
- Result: `animationsDefaults: {}` (empty), all data stays in objects
- All objects keep their original structure with `key` field as asset reference

**Forest Room (400 NPCs)**:
- 200 enemies of type A, 200 enemies of type B
- Each group has identical shared properties
- Result: `animationsDefaults: {'enemy_forest_1': {...}, 'enemy_forest_2': {...}}`
- Optimized objects have `asset_key` field added by filter for grouping
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

Merges extracted defaults back into objects after receiving optimized data from server.

### When It Runs

```javascript
// Only runs if roomData has animationsDefaults property
if(sc.hasOwn(roomData, 'animationsDefaults')){
    AnimationsDefaultsMerger.mergeDefaults(roomData);
}
```

**Important**: Server adds `animationsDefaults: {}` (even if empty) when filter is active. This triggers the merger to run.

### Merge Logic

```javascript
for(let key of objectKeys){
    let objectData = objectsAnimationsData[key];

    // Only process objects with asset_key from server (optimized objects)
    if(!sc.hasOwn(objectData, 'asset_key')){
        continue;  // Keep non-optimized objects untouched
    }

    // Set key to map index for optimized objects
    objectData.key = key;

    // Lookup and merge defaults
    let assetKey = objectData.asset_key;
    if(sc.hasOwn(animationsDefaults, assetKey)){
        let defaults = animationsDefaults[assetKey];
        objectsAnimationsData[key] = Object.assign({}, defaults, objectData);
    }
}
```

### Key Behavior

**Optimized Objects** (have `asset_key` from server):
1. `objectData.key` set to map index (e.g., 'enemy_1')
2. Defaults looked up using `asset_key` value
3. Merged: `Object.assign({}, defaults, objectData)` - object properties override defaults
4. Result has all properties needed for rendering

**Non-Optimized Objects** (no `asset_key` from server):
1. Skipped entirely - no modifications
2. `objectData.key` keeps original value (asset reference like 'people_town_1')
3. All original properties preserved as-is
4. Ready for rendering without merge

### Why This Matters

The merger MUST check for `asset_key` presence before modifying objects because:
- **Objects without `asset_key`**: Were NOT optimized by server, have complete data, use `key` field as asset reference
- **Objects with `asset_key`**: Were optimized by server, have partial data, need defaults merged, use `asset_key` as asset reference

If merger modifies non-optimized objects (changes their `key` field), it breaks asset loading and dialog functionality.

---

## Data Flow Examples

### Town Room (No Optimization)

**Server Processing**:
```javascript
// Original data
objectsAnimationsData: {
  'ground-collisions444': {
    key: 'door_house_1',
    type: 'anim',
    enabled: true,
    x: 400,
    y: 310,
    ...all properties...
  },
  'house-collisions-over-player535': {
    key: 'people_town_1',
    type: 'npc',
    enabled: true,
    content: 'Hello! My name is Alfred...',
    x: 240,
    y: 368,
    ...all properties...
  }
}

// SceneDataFilter analysis:
// - Group by 'key' field (no asset_key present)
// - Each object has unique 'key' value = single-object groups
// - No optimization performed

// Server output
{
  objectsAnimationsData: { ...unchanged... },
  animationsDefaults: {}  // Empty - triggers merger but no data to merge
}
```

**Client Processing**:
```javascript
// AnimationsDefaultsMerger.mergeDefaults() runs
for(let key of ['ground-collisions444', 'house-collisions-over-player535']){
    let objectData = objectsAnimationsData[key];

    // Check for asset_key
    if(!sc.hasOwn(objectData, 'asset_key')){
        continue;  // SKIP - no modifications, keep original data
    }
}

// Result: All objects unchanged
objectsAnimationsData: {
  'ground-collisions444': {key: 'door_house_1', ...},
  'house-collisions-over-player535': {key: 'people_town_1', ...}
}

// AnimationEngine uses props.key fallback
// object['ground-collisions444'].key = 'door_house_1' loads asset 'door_house_1'
// object['house-collisions-over-player535'].key = 'people_town_1' NPC dialog works
```

### Forest Room (With Optimization)

**Server Processing**:
```javascript
// Original data: 400 objects, 200 identical enemies per type
objectsAnimationsData: {
  'enemy_1': {
    asset_key: 'enemy_forest_1',  // Already set by server
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

    // Check for asset_key
    if(!sc.hasOwn(objectData, 'asset_key')){
        continue;  // NOT executed - asset_key exists
    }

    // Set key to map index
    objectData.key = key;  // 'enemy_1'

    // Lookup defaults
    let assetKey = objectData.asset_key;  // 'enemy_forest_1'
    let defaults = animationsDefaults['enemy_forest_1'];

    // Merge
    objectsAnimationsData[key] = Object.assign({}, defaults, objectData);
    // Result: {
    //   type: 'npc',
    //   enabled: true,
    //   targetName: 'enemy-pve',
    //   layerName: 'enemies-layer',
    //   asset_key: 'enemy_forest_1',
    //   key: 'enemy_1',
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

**Path**: `server/rooms/data/sendAll`
**Default**: `false` (filtering enabled)

```sql
INSERT INTO config (path, value, scope) VALUES
('server/rooms/data/sendAll', 'false', 'server');
```

**Values**:
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

config.set('server/customClasses/sceneDataProcessor', new CustomSceneDataProcessor());
```

---

## Key Concepts

### asset_key Field

**Purpose**: Reference to shared defaults, used for grouping and lookup

**When Present**:
- Server added it during optimization (object was grouped with others)
- Indicates object has partial data, needs defaults merged
- Client uses it to lookup defaults and as asset reference

**When NOT Present**:
- Object was not optimized (unique properties, single-object group)
- Object has complete data, no merge needed
- Client uses `key` field as asset reference

### key Field

**Two Different Roles**:

1. **Non-Optimized Objects**: Asset reference (e.g., 'people_town_1')
   - Original value from server
   - AnimationEngine fallback: `sc.get(props, 'asset_key', props.key)`
   - Used to load sprite asset

2. **Optimized Objects**: Map index (e.g., 'enemy_1')
   - Set by client merger to map key
   - Not used for asset loading (asset_key used instead)
   - Identifies object instance

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
  'enemy_1': {x: 100, y: 200}  // No asset_key!
}
animationsDefaults: {
  'enemy_forest_1': {asset_key: 'enemy_forest_1', type: 'npc', ...}
}

// Client can't merge - doesn't know which defaults to use!
// No way to know 'enemy_1' should use 'enemy_forest_1' defaults
```

Keeping grouping field in each object allows lookup:
```javascript
let assetKey = objectData.asset_key;  // 'enemy_forest_1'
let defaults = animationsDefaults[assetKey];  // Found!
```

---

## Integration Points

### Server Integration

**RoomScene** (`lib/rooms/server/scene.js`):
```javascript
this.sceneDataFilter = new SceneDataFilter({configManager: this.configManager});
```

**State** (`lib/rooms/server/state.js`):
```javascript
constructor(data){
    this.sceneDataFilter = sc.get(data, 'sceneDataFilter', false);
}

mapRoomData(roomData){
    if(false === this.sceneDataFilter){
        return roomData;
    }
    return this.sceneDataFilter.filterRoomData(roomData);
}
```

### Client Integration

**RoomEvents** (`lib/game/client/room-events.js`):
```javascript
this.room.onMessage('*', (message) => {
    if('sceneData' === message.act){
        let roomData = message.scene;
        // Merge defaults if present
        if(sc.hasOwn(roomData, 'animationsDefaults')){
            AnimationsDefaultsMerger.mergeDefaults(roomData);
        }
        // Process room data...
    }
});
```

**AnimationEngine** (`lib/game/client/animation-engine.js`):
```javascript
constructor(props){
    // Uses asset_key if present, falls back to key
    this.asset_key = sc.get(props, 'asset_key', props.key);
}
```

---

## Testing

### Verify Optimization Behavior

**Town Room (No Optimization Expected)**:
1. Join Town room
2. Check browser console: No `asset_key` in objects
3. Verify: `animationsDefaults: {}`
4. Test NPC dialogs work correctly

**Forest Room (Optimization Expected)**:
1. Join Forest room with 400 objects
2. Check browser console: Objects have `asset_key` field
3. Verify: `animationsDefaults` has entries
4. Test enemies render and behave correctly

### Measure Data Size

Add logging in `State.mapRoomData()`:
```javascript
this.sceneData = JSON.stringify(roomData);
Logger.info('sceneData size: ' + this.sceneData.length + ' bytes');
```

### Verify Buffer Overflow Resolved

```bash
npm run bots -- --room=reldens-bots-forest --bots=50
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

Set in database or config:
```javascript
config.set('server/rooms/data/sendAll', true);
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
        for(let key in filtered.objectsAnimationsData){
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
- Check AnimationsDefaultsMerger is NOT modifying objects without `asset_key`
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
- **State Integration**: `lib/rooms/server/state.js`
- **Scene Integration**: `lib/rooms/server/scene.js`
- **Room Events**: `lib/game/client/room-events.js`
- **Animation Engine**: `lib/game/client/animation-engine.js`
- **Colyseus Schema**: https://docs.colyseus.io/state/schema/
