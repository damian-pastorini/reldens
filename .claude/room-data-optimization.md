# Room Data Optimization - SceneDataFilter

**Purpose**: Optimize Colyseus schema buffer usage by filtering unnecessary data from `sceneData` sent to clients.

---

## Problem

Colyseus schema buffer overflow warnings occur when rooms contain many objects with complete database records being synchronized to clients.

Example with 400 respawn area objects:
- **Unfiltered data**: ~290 KB (includes all database metadata)
- **Client needs**: ~107 KB (only rendering data)
- **Buffer overflow**: Required 176 KB vs 8 KB default (22x increase)

---

## How It Works

The `SceneDataFilter` class (`lib/rooms/server/scene-data-filter.js`) filters `roomData` during synchronization via `State.mapRoomData()`, removing unnecessary database metadata and server-only fields before transmission to clients.

### Filtering Process

1. **RoomScene** creates SceneDataFilter instance with config
2. **State** receives filter in constructor, stores reference
3. **mapRoomData()** applies filter every time data is synchronized:
   - Initial room creation
   - Objects added dynamically
   - Objects deleted
   - Object positions updated

### Architecture

```javascript
SceneDataFilter
├── filterRoomData()                 // Main entry (called by State.mapRoomData)
├── buildCompleteData()              // Returns unfiltered data (debugging)
├── buildFilteredData()              // Returns filtered data (default)
├── filterPreloadAssets()            // Filters asset data
├── optimizeAnimationsData()         // Optimizes animation data with defaults
├── detectIdenticalProperties()      // Detects identical properties across objects
└── valuesAreDifferent()             // Compares values for optimization
```

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
- `false`: Filters data (recommended for production)
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
        customData.preloadAssets = filter.filterPreloadAssets(roomData.preloadAssets);
        customData.customField = 'custom value';
        return customData;
    }
}

config.set('server/customClasses/sceneDataProcessor', new CustomSceneDataProcessor());
```

---

## Data Filtering

### preloadAssets

**Filter Criteria**:
- Only includes `asset_type === 'spritesheet'` (matches client loader behavior)
- Removes database metadata

**Kept Fields**:
- `asset_type` - Asset type identifier
- `asset_key` - Load key
- `asset_file` - Filename
- `extra_params` - Frame dimensions (JSON)

**Removed Fields**:
- `object_id`, `object_asset_id`, `asset_id` - Database IDs
- `path` - Hardcoded in client
- `created_at`, `updated_at` - Timestamps

**Reduction**: ~275 bytes → ~95 bytes per asset (65%)

### objectsAnimationsData Optimization

**Process**:
1. Objects without `asset_key` get it added by copying from their `key` property (required for client merger)
2. Groups objects by `asset_key`
3. Single-object groups are kept as-is (no optimization needed)
4. Multi-object groups (2+ objects):
   - Detects identical properties across all objects in the group
   - Extracts identical properties to `animationsDefaults[asset_key]`
   - Keeps `asset_key` in each object (required for client merger to work)
   - Keeps only unique properties (x, y, content, options, id, etc.) in each object

**Optimized Object Structure**:
```javascript
'ground-respawn-area_5_0': { asset_key: 'enemy_forest_1', x: 240, y: 1808 }
```

**Example**:
200 objects sharing same asset have identical properties (targetName, layerName, enabled, frameStart, etc.)
- **Before**: 200 objects × 150 bytes = 30 KB
- **After**: 1 defaults entry (140 bytes) + 200 objects × 35 bytes = 7.14 KB
- **Reduction**: 76% for grouped objects

**animationsDefaults Structure**:
```javascript
{
  "enemy_forest_1": {
    "targetName": "enemy-pve",
    "layerName": "enemies-layer",
    "enabled": true,
    "frameStart": 0,
    "frameEnd": 3
  }
}
```

**Client-Side Merge**:
`AnimationsDefaultsMerger.mergeDefaults()` (lib/game/client/animations-defaults-merger.js):
1. Sets `objectData.key = objectIndex` (overwrites server-sent key with map key)
2. Checks if object has `asset_key` property (required)
3. Looks up defaults using `animationsDefaults[asset_key]`
4. Merges: `Object.assign({}, defaults, objectData)` - object properties override defaults
5. Result contains all properties needed for rendering

---

## Performance Impact

### 400 Objects Example

**Unfiltered**:
- preloadAssets: 400 × 2 assets × 275 bytes = 220 KB
- objectsAnimationsData: 400 × 150 bytes = 60 KB
- roomData: 10 KB
- **Total sceneData**: ~290 KB
- **Total State (with 50 players)**: ~176 KB encoded

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

## Testing

### Measure Data Size

Add temporary logging in `State.mapRoomData()`:
```javascript
this.sceneData = JSON.stringify(roomData);
Logger.info('sceneData size: ' + this.sceneData.length + ' bytes');
```

### Verify Buffer Overflow Resolved

```bash
npm run bots -- --room=reldens-bots-forest --bots=50
```

Expected: No buffer overflow warnings.

### Verify Client Functionality

1. Join room with multiple objects
2. Verify spritesheets load correctly
3. Verify animations play correctly
4. Check browser console for errors

---

## Debugging

### Disable Filtering

```javascript
config.set('server/rooms/data/sendAll', true);
```

Sends all database fields to client for debugging.

### Log Filtered Counts

```javascript
class DebugSceneDataProcessor {
    process({ roomData, filter }) {
        let filtered = filter.buildFilteredData(roomData);
        Logger.info('Filtered preloadAssets count:', Object.keys(filtered.preloadAssets || {}).length);
        Logger.info('Filtered objectsAnimationsData count:', Object.keys(filtered.objectsAnimationsData || {}).length);
        Logger.info('animationsDefaults count:', Object.keys(filtered.animationsDefaults || {}).length);
        return filtered;
    }
}
```

---

## Future Enhancements

1. **Lazy Loading**: Send only nearby objects, load distant on-demand
2. **Differential Updates**: Send only changed data after initial load
3. **Compression**: Gzip sceneData before transmission
4. **Client Caching**: Cache static assets across room joins
5. **Progressive Loading**: Prioritize critical assets, defer decorative ones

---

## References

- **Server Filter**: `lib/rooms/server/scene-data-filter.js`
- **Client Merger**: `lib/game/client/animations-defaults-merger.js`
- **State Integration**: `lib/rooms/server/state.js`
- **Scene Integration**: `lib/rooms/server/scene.js`
- **Client Integration**: `lib/game/client/room-events.js`
- **Analysis**: `_source/186_room_scene_data/buffer-overflow-analysis.md`
- **Colyseus Schema**: https://docs.colyseus.io/state/schema/
