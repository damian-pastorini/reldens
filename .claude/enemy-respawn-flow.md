# How to Set Up a Respawning Object

This guide covers everything required to create a working respawning object (enemy, resource node, chest, etc.) from scratch.

---

## Required DB Records

### 1. `objects` table — the template/area object

This is the parent container. It defines the respawn area and resolves the child class.

- `room_id` — ID of the scene room where the object lives.
- `layer_name` — MUST match the map layer name exactly (e.g. `'respawn-area-monsters-lvl-1-2'`). Used by the respawn system to find this object. Map layer names MUST start with `'respawn-area'`.
- `tile_index` — set to `NULL` for area objects.
- `class_type` — set to `7` (`MultipleObject`). This is the container type for all respawning objects.
- `object_class_key` — set to any string (e.g. `'enemy_1'`). Not required to match a registered custom class; used only as a fallback lookup attempt. The `class_type=7` fallback to `MultipleObject` is what actually runs.
- `client_key` — set to the asset key of the child (e.g. `'enemy_forest_1'`). This is only used as the template key and is overridden at spawn time; it does not affect spawned instances.
- `private_params` — JSON. Controls child class resolution and spawn behavior:
  - `"shouldRespawn": true` — **required**. Without this the respawn system silently skips this object.
  - `"childObjectClassKey": "rock_forest_1"` — use this (string) to resolve the child class from `customClasses.objects`. Takes priority over `childObjectType`.
  - `"childObjectType": 4` — use this (number) instead of `childObjectClassKey` to resolve by type from `objectsClassTypes` DB table (e.g. 4=EnemyObject). Use one or the other, not both.
  - `"hasState": true` — required if the child needs a Colyseus body state (needed for position sync and visibility control).
  - `"runOnAction": true` — set if the child responds to player click interactions.
  - `"collisionType": 2` — set to enable collision bodies.
  - `"respawnStateTime": 100` — **required for correct client rendering**. Sets the delay (ms) between the position update patch (`inState=AVOID_INTERPOLATION`) and the activation patch (`inState=ACTIVE`). Without this (defaults to 0), both state changes collapse into the same Colyseus patch, the client never sees `AVOID_INTERPOLATION`, and the position change triggers client-side interpolation. Since static objects have `mov=false`, the interpolation runs exactly one step then stops, leaving the sprite permanently stuck at a partially interpolated position. Any value above one Colyseus patch interval (≥ 50ms) is sufficient; 100ms is safe.
  - Any other properties are merged onto both the template and child instances via `Object.assign`.
- `client_params` — JSON. Merged into `clientParams` on both template and child instances. Key fields:
  - `"classKey": "rock_forest_1"` — tells the client which custom class to use (`customClasses.objects[classKey]`). Without this the client falls back to base `AnimationEngine` (sprite still shows but custom client features won't run).
  - `"ui": false` — set to false for non-dialog objects (enemies, rocks, chests). Omitting this causes the NPC dialog UI to be created for the object.
  - `"autoStart": true` — used for enemies to auto-play the walk animation.
  - `"timingDuration": 5000` — used by `TimingObject` children for the action timer (ms).
  - `"frameStart": 0, "frameEnd": 0` — animation frame range.
- `enabled` — set to `1`. Setting to `0` causes the respawn system to skip this object with a warning.

### 2. `respawn` table — defines spawn rules

One row per object-layer combination.

- `object_id` — FK to `objects.id` of the template object above.
- `respawn_time` — milliseconds before a dead/depleted instance respawns at a new tile.
- `instances_limit` — how many child instances are spawned simultaneously.
- `layer` — MUST exactly match `objects.layer_name`.

### 3. `objects_assets` table — defines the spritesheet

One row per asset for the object.

- `object_id` — FK to `objects.id`.
- `asset_type` — `'spritesheet'` for animated sprites.
- `asset_key` — the Phaser texture key (e.g. `'enemy_forest_1'`). The respawn system sets `childInstance.clientParams.asset_key` to this value. Without this, the client cannot create a sprite.
- `asset_file` — filename under `assets/custom/sprites/` (e.g. `'monster-treant.png'`).
- `extra_params` — JSON: `{"frameWidth": N, "frameHeight": N}`.

### SQL Template

```sql
-- objects table (parent/area object)
INSERT INTO `objects` (`room_id`, `layer_name`, `tile_index`, `class_type`, `object_class_key`, `client_key`, `private_params`, `client_params`, `enabled`) VALUES
    (<room_id>, 'respawn-area-your-layer', NULL, 7, 'your_object_area_key', 'your_asset_key',
     '{"shouldRespawn":true,"childObjectClassKey":"your_child_key","hasState":true,"runOnAction":true,"collisionType":2,"respawnStateTime":100}',
     '{"classKey":"your_child_key","ui":false}',
     1);

-- respawn table (use the object id inserted above)
INSERT INTO `respawn` (`object_id`, `respawn_time`, `instances_limit`, `layer`) VALUES
    (<object_id>, 30000, 1, 'respawn-area-your-layer');

-- objects_assets table
INSERT INTO `objects_assets` (`object_id`, `asset_type`, `asset_key`, `asset_file`, `extra_params`) VALUES
    (<object_id>, 'spritesheet', 'your_asset_key', 'your-sprite.png', '{"frameWidth":32,"frameHeight":32}');
```

All three records can also be created through the admin panel at `/reldens-admin` — use **Objects** for the `objects` table, **Objects Assets** for `objects_assets`, and **Respawn** for the `respawn` table.

---

## Required Map Layer

In the room's Tiled JSON map:

- Add a layer named with the `'respawn-area-'` prefix (e.g. `'respawn-area-monsters-lvl-1-2'`).
- Paint non-zero tile values on any tiles where instances should be allowed to spawn. The respawn system picks random non-zero tiles from this layer for positioning.
- The layer name must exactly match `objects.layer_name` and `respawn.layer`.

---

## Required Server-Side Code

### Register the child class in `theme/plugins/server-plugin.js`

```javascript
customClasses.objects['your_object_key'] = YourObjectClass;
```

Where `'your_object_key'` matches `private_params.childObjectClassKey`.

### Child class requirements

- Extend `AnimationObject`, `NpcObject`, `EnemyObject`, `TimingObject`, or any class in that chain.
- Must NOT extend `MultipleObject` or `BaseObject` directly (those lack `isAnimation`/`hasAnimation` and won't register client animations).
- If the child needs to respond to messages (clicks), implement `executeMessageActions` AND register itself in `room.messageActions` via `runAdditionalRespawnSetup`:

```javascript
async runAdditionalRespawnSetup()
{
    this.events.onWithKey(
        'reldens.sceneRoomOnCreate',
        (room) => { room.messageActions[this.key] = this; },
        this.eventUniqueKey('registerMessageAction'),
        this.uid
    );
}
```

- If the child manages its own respawn (like `EnemyObject`), implement `respawn(room)`. Otherwise, `ObjectRespawnBehavior` handles respawn automatically when `respawnBehavior.execute(room)` is called.
- `hasState: true` in `private_params` is required for the body state (Colyseus sync, visibility control). Without it the body exists in the physics world but clients cannot track its position or state changes.

---

## Required Client-Side Code

### Register the client class in `theme/plugins/client-plugin.js`

```javascript
customClasses.objects['your_object_key'] = YourClientClass;
```

Where `'your_object_key'` matches `client_params.classKey`.

### Client class requirements

- Extend `AnimationEngine` or `TimingObjectClient` (which extends `AnimationEngine`).
- `TimingObjectClient` handles `timingStart`/`timingCancel`/`timingComplete` messages and renders a progress bar.
- Without a registered client class (or missing `classKey` in `client_params`), the base `AnimationEngine` is used — the sprite appears correctly but custom client features won't run.

---

## Required Asset File

Place the sprite PNG under:
```
theme/default/assets/custom/sprites/your-sprite.png
```

After the theme is built/deployed, it must also exist at:
```
app/dist/assets/custom/sprites/your-sprite.png
```

The client preloader loads it from `/assets/custom/sprites/<asset_file>`.

---

---

# Enemy Complete Spawn and Respawn Flow

## Example DB Records

These are the actual values from the default Reldens installation — not templates. For field descriptions and the SQL template, see `## Required DB Records` in the setup guide above.

`objects` table row id=6:
- `room_id = 5` (reldens-forest scene)
- `layer_name = 'respawn-area-monsters-lvl-1-2'`
- `tile_index = NULL`
- `class_type = 7` (MultipleObject)
- `object_class_key = 'enemy_1'` (not in customClasses, used only to attempt lookup)
- `client_key = 'enemy_forest_1'`
- `private_params = '{"shouldRespawn":true,"childObjectType":4,"isAggressive":true}'`
- `client_params = '{"autoStart":true}'`
- `enabled = 1`

`respawn` table row id=3:
- `object_id = 6`
- `respawn_time = 20000`
- `instances_limit = 2`
- `layer = 'respawn-area-monsters-lvl-1-2'`

`objects_assets` table row id=5:
- `object_id = 6`
- `asset_type = 'spritesheet'`
- `asset_key = 'enemy_forest_1'`
- `asset_file = 'monster-treant.png'`
- `extra_params = '{"frameWidth":47,"frameHeight":50}'`

---

## Step 1 - ObjectsManager.generateObjectFromObjectData (lib/objects/server/manager.js)

Reads the `objects` row for the area, instantiates `MultipleObject` as the container, resolves `EnemyObject` as the child class via `childObjectType=4`, and stores the template in `roomObjectsByLayer` keyed by the map layer name. No child instances are created yet — this just prepares the template.

Called from `RoomScene.onCreate` after loading all object rows for the room.

Line 102: `let objClass = this.config.getWithoutLogs('server/customClasses/objects/enemy_1', false)` - returns `false` (not in customClasses).
Line 104: `objClass = this.resolveClassFromTypes(objectClassTypes, 7)` - returns `MultipleObject`.
Lines 110-113: builds `objProps` merging config/events/dataServer with all DB row fields.
Line 115: `this.prepareInitialStats(objProps)` - no stats for enemy container, skipped.
Line 117: `let objectInstance = new MultipleObject(objProps)`.

Inside `MultipleObject` constructor (`lib/objects/server/object/type/multiple-object.js`):
- Line 20: `super(props)` calls `BaseObject` constructor.
- `BaseObject` line 27: `Object.assign(this, props)` - assigns ALL props including all DB fields.
- `BaseObject` line 44: `this.appendIndex = sc.get(props, 'tile_index', props.id)` = 6 (tile_index is NULL so uses id).
- `BaseObject` line 46: `this.objectIndex = 'respawn-area-monsters-lvl-1-2' + 6` = `'respawn-area-monsters-lvl-1-26'`.
- `BaseObject` line 48: `this.key = props.client_key` = `'enemy_forest_1'`.
- `BaseObject` line 54: calls `mapClientParams(props)` - parses `client_params='{"autoStart":true}'`, sets `this.clientParams.key = 'enemy_forest_1'`, `this.clientParams.id = 6`.
- `BaseObject` line 55: calls `mapPrivateParams(props)` - parses `private_params`, sets `this.shouldRespawn = true`, `this.childObjectType = 4`, `this.isAggressive = true`.
- `MultipleObject` line 21: `this.multiple = true`.
- `MultipleObject` line 23: `this.classInstance = false`.

Back in manager.js:
Line 118: `this.attachToAnimations(objectInstance)` - checks `sc.hasOwn(objectInstance, 'isAnimation')` and `sc.hasOwn(objectInstance, 'hasAnimation')`. `MultipleObject` has neither. NOT added to `objectsAnimationsData`.
Line 119: `if(objectInstance.multiple)` - true.
Line 120: `objectInstance.objProps = objProps`.
Line 121: `let childClassKey = sc.get(objectInstance, 'childObjectClassKey', false)` = false (not set on enemy).
Line 123-125: `subObjClass = false` since childClassKey is false.
Line 126: `subObjClass = this.resolveClassFromTypes(objectClassTypes, objectInstance.childObjectType)` = `this.resolveClassFromTypes(objectClassTypes, 4)` = `EnemyObject`.
Line 134: `objectInstance.classInstance = EnemyObject`.
Line 136: `this.enrichWithMultipleAnimationsData(objectData, objectInstance)` - no related_objects_animations, skipped.
Line 137: `this.attachToMessagesListeners(objectInstance, objectData)` - `sc.hasOwn(objectInstance, 'listenMessages')` = false (MultipleObject has no listenMessages). Returns false. NOT added to `listenMessagesObjects`.
Line 138: `this.prepareAssetsPreload(objectData)` - adds `objects_assets` row (id=5) to `preloadAssets`. This causes client to preload `'enemy_forest_1'` spritesheet.
Line 145: `this.roomObjects['respawn-area-monsters-lvl-1-26'] = objectInstance`.
Line 149: `this.roomObjectsByLayer['respawn-area-monsters-lvl-1-2'][6] = objectInstance`.

---

## Step 2 - Map Parsing - Respawn Layer Detection (lib/world/server/p2world.js)

Scans Tiled map layers during world creation. When a layer named `respawn-area-*` is found, fires an event that triggers `RespawnPlugin` to create a `RoomRespawn` instance for that layer, which will own all spawn tile tracking and instance creation.

During `RoomScene.createWorld`, P2world parses the map layers. For each layer named `respawn-area-*`:

Event `reldens.parsingMapLayersAfterBodiesQueue` fires with `{layer, world}`.

In `RespawnPlugin.listenEvents` (`lib/respawn/server/plugin.js` line 59):
```
this.events.on('reldens.parsingMapLayersAfterBodiesQueue', async (eventData) => {
    await this.createRoomRespawnArea(layer, world);
});
```

`createRoomRespawnArea` (line 131):
- Line 133: checks layer name contains `'respawn-area'`. True for `'respawn-area-monsters-lvl-1-2'`.
- Line 140-146: creates `new RoomRespawn({layer, world, events, dataServer, config})`.
- Line 147: `await respawnArea.activateObjectsRespawn()`.
- Line 148: `world.respawnAreas['respawn-area-monsters-lvl-1-2'] = respawnArea`.

---

## Step 3 - RoomRespawn.activateObjectsRespawn (lib/respawn/server/room-respawn.js)

Parses the map layer to build the pool of valid spawn tiles, queries the `respawn` table for the matching definition, and calls `createNewObjectInstance` once per slot up to `instances_limit`.

Line 70: `this.parseMapForRespawnTiles()` - reads the layer data array. For `'respawn-area-monsters-lvl-1-2'`, iterates all map tiles. Tiles with value != 0 are pushed to `this.respawnTiles` and `this.respawnTilesData[tileIndex] = {x, y, tile, tile_index, row, column}`.

Line 72: `this.layerObjects = this.world.objectsManager.roomObjectsByLayer['respawn-area-monsters-lvl-1-2']` = `{6: multipleObjectInstance}`.
Line 82-85: queries `respawn` entity with `{layer: 'respawn-area-monsters-lvl-1-2', object_id: IN ['6']}` - returns row id=3.
Line 86: iterates respawnDefinitions.
Line 88: `sc.hasOwn(this.layerObjects, 3.object_id)` = `sc.hasOwn(this.layerObjects, 6)` = true.
Line 92: `sc.hasOwn(this.layerObjects[6], 'shouldRespawn')` = true (set by mapPrivateParams).
Line 96: `let multipleObj = this.layerObjects[6]`.
Line 97: `if(!multipleObj.objProps.enabled)` - `objProps.enabled = 1` (from DB row) - truthy, continues.
Line 101: `let objClass = multipleObj.classInstance` = `EnemyObject`.
Line 106: loops `qty = 0; qty < 2` (instances_limit=2).
Line 107: calls `createNewObjectInstance(respawnArea, multipleObj, EnemyObject, tilewidth, tileheight, 0)`.
Line 107: calls `createNewObjectInstance(respawnArea, multipleObj, EnemyObject, tilewidth, tileheight, 1)`.

---

## Step 4 - RoomRespawn.createNewObjectInstance

Picks a random valid tile, clones the parent's props, instantiates `EnemyObject` at that position with a full physics body and Colyseus body state, and registers the live instance with the room's object manager. Runs once per `instances_limit`.

For qty=0:
Line 123-125: `this.instancesCreated[3] = []`.
Line 126: `generateObjectIndex(respawnArea)` - `newIndex = 0`, returns `'respawn-area-monsters-lvl-1-2_3_0'`.
Line 127: `let clonedObjProps = Object.assign({}, multipleObj.objProps)` - copies all DB fields + config/events/dataServer.
Line 128: `clonedObjProps.client_key = 'respawn-area-monsters-lvl-1-2_3_0'`.
Line 129: `clonedObjProps.events = this.events`.
Line 130: `let {randomTileIndex, tileData} = this.getRandomTile('respawn-area-monsters-lvl-1-2_3_0')` - picks random non-zero tile, returns `{x, y, tile, tile_index, row, column}`.
Line 132: `Object.assign(clonedObjProps, tileData)` - sets x, y on clonedObjProps.
Line 133: `let objInstance = new EnemyObject(clonedObjProps)`.

Inside `EnemyObject` constructor (`lib/objects/server/object/type/enemy-object.js`):
- `super(props)` calls `NpcObject` -> `AnimationObject` -> `BaseObject`.
- `BaseObject` line 27: `Object.assign(this, props)` - sets all props from clonedObjProps.
- `BaseObject` line 48: `this.key = props.client_key` = `'respawn-area-monsters-lvl-1-2_3_0'`.
- `mapClientParams`: `this.clientParams.key = 'respawn-area-monsters-lvl-1-2_3_0'`, `this.clientParams.id = 6`.
- `mapPrivateParams`: sets `shouldRespawn=true`, `childObjectType=4`, `isAggressive=true`.
- `EnemyObject` line 29: `this.hasState = true`.
- `EnemyObject` line 39: `this.runOnHit = true` (default, sc.get from props).
- `EnemyObject` line 43: `this.isAggressive = true` (from mapPrivateParams).
- `EnemyObject` line 74-79: `this.respawnTime = false`, `this.respawnTimer = false`, etc.
- `NpcObject` constructor line 42 calls `this.mapPrivateParams(props)` again, applying private params a second time via `Object.assign` — the result is identical since the source data is the same.

Back in createNewObjectInstance:
Line 134: `if(sc.isObjectFunction(objInstance, 'runAdditionalRespawnSetup'))` = true.
Line 135: `await objInstance.runAdditionalRespawnSetup()` - sets up actions (skills), aggressive behavior event listener, battle end event listener.
Line 146: `let assetsArr = this.getObjectAssets(multipleObj)` - iterates `multipleObj.objProps.related_objects_assets`, returns `['enemy_forest_1']`.
Line 148: `objInstance.clientParams.asset_key = 'enemy_forest_1'`.
Line 149: `objInstance.clientParams.enabled = true`.
Line 153: `this.world.objectsManager.objectsAnimationsData['respawn-area-monsters-lvl-1-2_3_0'] = objInstance.clientParams`.
Line 154: `this.world.objectsManager.roomObjects['respawn-area-monsters-lvl-1-2_3_0'] = objInstance`.
Line 155-163: `await this.world.createWorldObject(objInstance, 'respawn-area-monsters-lvl-1-2_3_0', tilewidth, tileheight, x, y, pathFinder)`.

Inside createWorldObject (lib/world/server/p2world.js): creates a physical body, calls `body.setBodyState(...)`. Since `objInstance.hasState = true`, a `bodyState` (Colyseus schema) is created and `objInstance.state = body.bodyState`, `objInstance.objectBody = body`.

Line 164: `objInstance.respawnTime = 20000` (respawnArea.respawn_time).
Line 165: `objInstance.respawnLayer = 'respawn-area-monsters-lvl-1-2'`.
Line 166: `objInstance.objectIndex = 'respawn-area-monsters-lvl-1-2_3_0'`.
Line 167: `objInstance.randomTileIndex = randomTileIndex`.
Line 168: `this.instancesCreated[3].push(objInstance)`.

Same process repeated for qty=1, creating `'respawn-area-monsters-lvl-1-2_3_1'`.

---

## Step 5 - sceneRoomOnCreate (lib/respawn/server/plugin.js)

After the room and world are fully initialized, adds each child instance's body state to the Colyseus `bodies` MapSchema. From this point on, any change to `bodyState` is synced to all connected clients.

`reldens.sceneRoomOnCreate` fires (lib/rooms/server/scene.js line 116). This is AFTER the world is created and after `this.roomData.objectsAnimationsData = this.objectsManager.objectsAnimationsData` (line 106).

`RespawnPlugin.createRespawnAreasObjectsInstances(room)` runs:
- Line 85: `respawnAreasKeys = Object.keys(room.roomWorld.respawnAreas)` = `['respawn-area-monsters-lvl-1-2']`.
- Line 89-94: for each area, calls `createRespawnObjectsInstances(area, room)`.
- Line 103: iterates `area.instancesCreated` = `{3: [enemyInstance0, enemyInstance1]}`.
- Line 106: calls `createRespawnObjectsInstancesInState([enemyInstance0, enemyInstance1], room)`.

`createRespawnObjectsInstancesInState` (line 114):
- For `enemyInstance0`: `objInstance.hasState = true` → `room.state.addBodyToState(objInstance.state, 'respawn-area-monsters-lvl-1-2_3_0')`. Body state now synced to all clients.
- For `enemyInstance1`: same with `'respawn-area-monsters-lvl-1-2_3_1'`.

---

## Step 6 - Client Receives Room Data

The client receives the serialized `objectsAnimationsData`, creates a Phaser sprite for the enemy at its starting position, and registers Colyseus body state listeners so server-side `inState`, `x`, and `y` changes drive the sprite's visibility and position in real time.

`room.state.roomData.objectsAnimationsData` contains:
```
{
  'respawn-area-monsters-lvl-1-2_3_0': {
    key: 'respawn-area-monsters-lvl-1-2_3_0',
    id: 6,
    asset_key: 'enemy_forest_1',
    enabled: true,
    autoStart: true,
    ...
  },
  'respawn-area-monsters-lvl-1-2_3_1': { ... }
}
```

Client plugin `createDynamicAnimations` (lib/objects/client/plugin.js line 511):
- Iterates `sceneDynamic.objectsAnimationsData`.
- For key `'respawn-area-monsters-lvl-1-2_3_0'`: calls `createAnimationFromAnimData(animProps, sceneDynamic)`.
- Line 531: `if(!animProps.key)` - `animProps.key = 'respawn-area-monsters-lvl-1-2_3_0'` - OK.
- Line 540: `config.getWithoutLogs('client/customClasses/objects/respawn-area-monsters-lvl-1-2_3_0', AnimationEngine)` - no match, returns `AnimationEngine`.
- Line 544: `let animationEngine = new AnimationEngine(gameManager, animProps, sceneDynamic)`.

Inside `AnimationEngine` constructor: `this.key = 'respawn-area-monsters-lvl-1-2_3_0'`, `this.asset_key = 'enemy_forest_1'`, `this.enabled = true`.

Line 546: `animationEngine.createAnimation()` - `this.enabled = true` passes the gate (line 172). Creates sprite at (x, y) with `asset_key = 'enemy_forest_1'`. Enemy IS VISIBLE.

Line 547: `this.updateAnimationVisibility(existentBody, sprite)` - if body's `inState` is ACTIVE (1), visibility unchanged. Enemy stays visible.

`setOnChangeBodyCallback` registers a Colyseus listener on the body state. When `inState` changes: `setVisibility(currentBody, ACTIVE === body.inState)` - shows/hides the sprite.

---

## Step 7 - Interaction (Collision-Based)

Player walks into enemy area. P2world detects collision. `CollisionsManager` resolves collision, calls `objectInstance.onHit(props)`.

`EnemyObject.onHit(props)`:
- `this.startBattleOnHit = true` - proceeds.
- Calls `startBattleWithPlayer(props)`.
- Gets `playerBody`, `playerSchema`.
- Calls `this.battle.startBattleWith(playerSchema, room)`.

Enemy uses the `Pve` battle system - NO click message, NO `executeMessageActions`, NO `messageActions` routing needed.

---

## Step 8 - Enemy Dies (Death/Respawn Cycle)

When the enemy's HP hits zero, `Pve.battleEnded` sets `inState=DEATH` to hide the sprite, disables collision, freezes the body as STATIC, and schedules `restoreObject` after `respawnTime` ms. On restore, HP resets, the body becomes DYNAMIC again, moves to a new random tile with `AVOID_INTERPOLATION` to suppress client interpolation, then becomes `ACTIVE` after `respawnStateTime` ms — the client shows the sprite at the correct new position.

When HP reaches 0, the battle system itself triggers respawn - NOT a collision.

`Pve.battleEnded(playerSchema, room)` (`lib/actions/server/pve.js` line 305):
- Line 313: `this.targetObject.objectBody.bodyState.inState = GameConst.STATUS.DEATH`. Colyseus syncs to client. Client `setVisibility(ACTIVE === DEATH)` = false. Enemy HIDDEN.
- Line 326: `if(sc.isObjectFunction(this.targetObject, 'respawn'))` - checks if method exists on the enemy instance.
- Line 327: `await this.targetObject.respawn(room)` - calls `EnemyObject.respawn(room)` directly.

`EnemyObject.onBattleEnd` (line 515) is NOT what triggers respawn - it is empty (`Logger.notice('BattleEnd method not implemented')`). Respawn is called directly by `Pve.battleEnded` before the battle end event fires.

`EnemyObject.runAdditionalRespawnSetup` (line 88) registers:
- `setupActions()` - loads skills from DB.
- `setupAggressiveBehavior()` - listens to `reldens.sceneRoomOnCreate` event to attach the aggression post-broadphase listener to the room world.
- `events.onWithKey(getBattleEndEvent(), onBattleEnd.bind(this), ...)` - registers battle end listener (currently empty).

The `sceneRoomOnCreate` event fires AFTER `runAdditionalRespawnSetup` runs (respawn system creates instances during world creation, `sceneRoomOnCreate` fires after). This pattern allows child instances to register room-level behavior after the room is fully created.

When HP reaches 0 in battle, `EnemyObject.respawn(room)` is called.

`respawn(room)` (line 323):
- Line 328: `this.objectBody.resetAuto()` - stops movement.
- Line 329: `this.objectBody.stopMove()`.
- Line 330: `this.objectBody.collisionResponse = false` - disables collisions.
- Line 331: `this.originalType = this.objectBody.type`.
- Line 332: `this.objectBody.type = STATIC` - stops physics.
- Line 333: `if(this.respawnTime)` - `20000` is truthy.
- Line 334: `return this.restoreOnTimeOut(room)`.

`restoreOnTimeOut(room)` (line 343):
- Sets a setInterval (for logging, effectively empty).
- Sets `this.respawnTimer = setTimeout(async () => { await this.restoreObject(room); }, 20000)`.

After 20 seconds, `restoreObject(room)` runs (line 364):
- Line 366: `this.objectBody.collisionResponse = true`.
- Line 367: `this.objectBody.type = DYNAMIC`.
- Line 368: `this.stats = Object.assign({}, this.initialStats)` - restores full HP.
- Line 373: `this.objectBody.bodyState.inState = GameConst.STATUS.AVOID_INTERPOLATION` - Colyseus syncs to client. Client receives body update, `setVisibility(ACTIVE === AVOID_INTERPOLATION)` = `setVisibility(false)`. Enemy HIDDEN briefly.
- Lines 383-395: picks a new random tile from `respawnAreas['respawn-area-monsters-lvl-1-2']`, repositions body.
- Line 396: `await this.events.emit('reldens.restoreObjectAfter', ...)`.
- Line 402: `this.respawnStateTimer = setTimeout(() => { this.setActiveObjectState(room); }, this.respawnStateTime)` (respawnStateTime = battleTimeOff = 20000ms... wait that seems long. Actually `sc.get(props, 'battleTimeOff', 1000)` - default 1000ms).

`setActiveObjectState(room)` (line 433):
- Line 437: `this.objectBody.bodyState.inState = GameConst.STATUS.ACTIVE`.
- Colyseus syncs to client. `setVisibility(ACTIVE === ACTIVE)` = `setVisibility(true)`. Enemy VISIBLE again.

---

## Step 9 - Client Visibility Summary

Summarizes how the Colyseus `inState` value drives sprite visibility throughout the enemy lifecycle. The same callback handles all state transitions.

Client `setOnChangeBodyCallback` (lib/objects/client/plugin.js line 197):
- Registers listener on every property of the body state.
- On ANY property change: `setVisibility(currentBody, ACTIVE === body.inState)`.
- `currentBody = currentScene.objectsAnimations['respawn-area-monsters-lvl-1-2_3_0']` = AnimationEngine instance.
- `setVisibility` calls `currentBody.sceneSprite.setVisible(isActive)`.

Enemy ACTIVE (inState=1) → sprite visible.
Enemy AVOID_INTERPOLATION (inState=4) → sprite hidden.
Enemy DEATH (inState=3) → sprite hidden.

---

# Rock (TimingObject) Complete Spawn and Respawn Flow

## Key Differences vs Enemy Flow

Rocks use `childObjectClassKey` (string) instead of `childObjectType` (number) to resolve the sub-object class.
Rocks use `RockObject → TimingObject → NpcObject → AnimationObject → BaseObject`.
Rocks are interactive objects (click to start timed action) rather than collision-based enemies.
Rocks do NOT have their own `respawn` method; they rely entirely on `ObjectRespawnBehavior`.

---

## Example DB Records

These are the actual values from the default Reldens installation. For field descriptions and the SQL template, see `## Required DB Records` in the setup guide above.

`objects` table row id=16 (after `migrations/development/beta.39.9-sql-update.sql`):
- `room_id = 5` (reldens-forest scene)
- `layer_name = 'respawn-area-mining-rocks'`
- `tile_index = NULL`
- `class_type = 7` (MultipleObject)
- `object_class_key = 'rock_forest_1_area'` (not in customClasses — falls back to class_type)
- `client_key = 'rock_forest_1'` (template key, irrelevant for spawned instances)
- `private_params = '{"shouldRespawn":true,"childObjectClassKey":"rock_forest_1","itemKey":"ore","cancelOnMove":true,"cancelOnOutOfRange":false,"runOnAction":true,"collisionType":2,"hasState":true}'`
- `client_params = '{"timingDuration":5000,"isInteractive":true,"frameStart":0,"frameEnd":0,"classKey":"rock_forest_1","ui":false}'`
- `enabled = 1`

`respawn` table row id=7:
- `object_id = 16`
- `respawn_time = 30000`
- `instances_limit = 1`
- `layer = 'respawn-area-mining-rocks'`

`objects_assets` table row id=14:
- `object_id = 16`
- `asset_type = 'spritesheet'`
- `asset_key = 'rock_forest_1'`
- `asset_file = 'rock.png'`
- `extra_params = '{"frameWidth":32,"frameHeight":32}'`

Sprite file: `theme/default/assets/custom/sprites/rock.png` ✓

---

## Step 1 - ObjectsManager.generateObjectFromObjectData

Identical to the enemy flow but resolves the child class via `childObjectClassKey='rock_forest_1'` (string lookup in `customClasses`) rather than `childObjectType` (numeric lookup in `objectsClassTypes`).

Called from `RoomScene.onCreate` for object id=16.

`config.getWithoutLogs('server/customClasses/objects/rock_forest_1_area', false)` → false (not registered).
`resolveClassFromTypes(objectClassTypes, 7)` → `MultipleObject`.

`new MultipleObject(objProps)`:
- `Object.assign(this, props)` — all DB fields assigned.
- `this.key = props.client_key = 'rock_forest_1'` (template key).
- `this.objectIndex = 'respawn-area-mining-rocks' + 16 = 'respawn-area-mining-rocks16'`.
- `mapPrivateParams`: `Object.assign(this, privateParamsObject)` — sets `this.shouldRespawn = true`, `this.childObjectClassKey = 'rock_forest_1'`, `this.itemKey = 'ore'`, `this.cancelOnMove = true`, `this.hasState = true`, `this.collisionType = 2`, `this.runOnAction = true`.
- `this.multiple = true`, `this.classInstance = false`.

`attachToAnimations(objectInstance)` — MultipleObject has no `isAnimation` or `hasAnimation` → NOT added to `objectsAnimationsData`.

`if(objectInstance.multiple)` → true.
`objectInstance.objProps = objProps`.
`childClassKey = sc.get(objectInstance, 'childObjectClassKey', false)` = `'rock_forest_1'`.
`subObjClass = config.getWithoutLogs('server/customClasses/objects/rock_forest_1', false)` = `RockObject` (registered in `theme/plugins/server-plugin.js` line 40).
`objectInstance.classInstance = RockObject`.

`enrichWithMultipleAnimationsData(objectData, objectInstance)` — no `related_objects_animations` → `objectInstance.multipleAnimations = {}`.

`attachToMessagesListeners` — MultipleObject has no `listenMessages` → skipped. Template NOT added to `messageActions`.

`prepareAssetsPreload(objectData)` — adds asset_id=14 to `preloadAssets`:
- key = `'1614'` (object_id=16 + object_asset_id=14)
- value = `{asset_type:'spritesheet', asset_key:'rock_forest_1', asset_file:'rock.png', extra_params:'{"frameWidth":32,"frameHeight":32}'}`

`roomObjects['respawn-area-mining-rocks16'] = multipleObjInstance`.
`roomObjectsByLayer['respawn-area-mining-rocks'][16] = multipleObjInstance`.

---

## Step 2 - Map Parsing

Same as enemy flow. The `respawn-area-mining-rocks` layer is detected and a `RoomRespawn` instance is created to manage rock spawn tile tracking and instance creation.

`reldens-forest.json` contains layer `'respawn-area-mining-rocks'` (id=74, width=48, height=28).
Its `data` array has non-zero tiles (value=111) at rows 6-11, columns 9-16 region.
`parseMapForRespawnTiles()` finds those tiles and adds them to `this.respawnTiles`.

`this.layerObjects = roomObjectsByLayer['respawn-area-mining-rocks']` = `{16: multipleObjInstance}`.
DB query for `respawn` with `{layer: 'respawn-area-mining-rocks', object_id: IN [16]}` returns row id=7.

Check: `sc.hasOwn(layerObjects[7.object_id], 'shouldRespawn')` = `sc.hasOwn(layerObjects[16], 'shouldRespawn')` = true ✓
Check: `multipleObj.objProps.enabled` = 1 → truthy ✓
Check: `multipleObj.classInstance` = `RockObject` ✓
Loops `qty = 0; qty < 1` (instances_limit=1) → calls `createNewObjectInstance` once.

---

## Step 3 - RoomRespawn.createNewObjectInstance

Instantiates a single `RockObject` child at a random tile. The key difference from enemies: `runAdditionalRespawnSetup` registers the rock instance in `room.messageActions`, enabling server-side routing of player click messages to the correct instance.

`objectIndex = generateObjectIndex(respawnArea)` = `'respawn-area-mining-rocks_7_0'` (layer + respawnArea.id + 0).

`clonedObjProps = Object.assign({}, multipleObj.objProps)` — clones all DB fields.
`clonedObjProps.client_key = 'respawn-area-mining-rocks_7_0'` — overrides template key.
`{randomTileIndex, tileData} = getRandomTile(objectIndex)` — picks a random tile with value=111 from the respawn layer.
`Object.assign(clonedObjProps, tileData)` — sets `x`, `y`, `tile`, `tile_index`, `row`, `column`.

`new RockObject(clonedObjProps)` calls chain: `RockObject → TimingObject → NpcObject → AnimationObject → BaseObject`:

`BaseObject`:
- `Object.assign(this, props)` — all cloned props assigned.
- `this.key = 'respawn-area-mining-rocks_7_0'`.
- `this.uid = 'respawn-area-mining-rocks_7_0-<timestamp>'`.
- `mapClientParams(props)`: `sc.toJson(props.client_params, {})` = `{timingDuration:5000, isInteractive:true, frameStart:0, frameEnd:0}` — merged into `this.clientParams`. Then `this.clientParams.key = this.key`, `this.clientParams.id = 16`.
- `mapPrivateParams(props)`: applies `private_params` again via `Object.assign(this, ...)` — sets `shouldRespawn`, `childObjectClassKey`, `itemKey`, `hasState`, etc.

`AnimationObject`:
- `this.isAnimation = true`.
- Reinitializes `this.clientParams` object then calls `mapClientParams`/`mapPrivateParams` again.

`NpcObject`:
- `this.hasAnimation = true`, `this.listenMessages = true`, `this.collisionResponse = true`.
- Sets `this.clientParams.isInteractive = true`.
- Calls `mapClientParams`/`mapPrivateParams` again (all idempotent).

`TimingObject`:
- `this.isActive = false`, `this.timingTimer = null`, `this.timingCheckInterval = null`.

`RockObject.runAdditionalRespawnSetup()`:
- Registers `this.events.onWithKey('reldens.sceneRoomOnCreate', (room) => { room.messageActions[this.key] = this; }, ...)`.
- When `reldens.sceneRoomOnCreate` fires: `room.messageActions['respawn-area-mining-rocks_7_0'] = rockInstance`.

`objInstance.clientParams.asset_key = 'rock_forest_1'` (from `getObjectAssets`).
`objInstance.clientParams.enabled = true`.

`world.objectsManager.objectsAnimationsData['respawn-area-mining-rocks_7_0'] = rockInstance.clientParams`.
`world.objectsManager.roomObjects['respawn-area-mining-rocks_7_0'] = rockInstance`.

`createWorldObject(rockInstance, 'respawn-area-mining-rocks_7_0', tileW, tileH, x, y, pathFinder)`:
- `hasState = this.allowBodiesWithState && sc.get(roomObject, 'hasState', false)` = `true && true` = `true`.
- Creates `PhysicalBody` with an `ObjectBodyState` schema object.
- `rockInstance.state = bodyObject.bodyState`.
- `rockInstance.objectBody = bodyObject`.

`rockInstance.respawnTime = 30000`.
`rockInstance.respawnBehavior = new ObjectRespawnBehavior(rockInstance)`.

---

## Step 4 - State Synchronization (reldens.sceneRoomOnCreate)

Adds the rock's body state to the Colyseus `bodies` MapSchema and serializes `objectsAnimationsData` into the room's `sceneData`, making position and asset info available to any client that joins.

In `RoomScene.onCreate` (scene.js line 106):
`this.roomData.objectsAnimationsData = this.objectsManager.objectsAnimationsData`

At this point, `objectsAnimationsData['respawn-area-mining-rocks_7_0']` already exists (added in Step 3 before `setState`).

`new State(this.roomData, this.sceneDataFilter)` → `mapRoomData()` → `SceneDataFilter.buildFilteredData(roomData)`:
- `optimizeData(objectsAnimationsData, 'asset_key', false)`: rock entry grouped by `asset_key='rock_forest_1'`, single item → preserved as-is in `filteredData.objectsAnimationsData`.
- `animationsDefaults = {}` (no multi-instance groups).
- `filteredData.preloadAssets`: rock asset entry `'1614'` preserved with all fields including `asset_type`.

`this.setState(roomState)` — sceneData JSON now includes rock animation data and preload assets.

`reldens.sceneRoomOnCreate` fires → `RespawnPlugin.createRespawnAreasObjectsInstances(room)`:
`room.state.addBodyToState(rockInstance.state, 'respawn-area-mining-rocks_7_0')`.
Rock body state is now in Colyseus `bodies` MapSchema → synced to all clients.

`rockInstance.runAdditionalRespawnSetup` listener fires → `room.messageActions['respawn-area-mining-rocks_7_0'] = rockInstance`.

---

## Step 5 - Client Receives Room Data

Loads the `rock_forest_1` spritesheet, creates the Phaser sprite with `pointerdown` interaction enabled, and registers Colyseus body state change listeners. The rock is visible and clickable from this point.

Client `room-events.js` line 150: `this.roomData = AnimationsDefaultsMerger.mergeDefaults(sc.toJson(this.room.state.sceneData))`.

`AnimationsDefaultsMerger.mergeDefaults`:
- `animationsDefaults = {}`.
- For key `'respawn-area-mining-rocks_7_0'`: `objectData.asset_key = 'rock_forest_1'` exists → `objectData.key = 'respawn-area-mining-rocks_7_0'` is set.

`ScenePreloader.preloadValidAssets`:
- Processes `preloadAssets['1614']`: `asset_type='spritesheet'` ✓ → `this.load.spritesheet('rock_forest_1', '/assets/custom/sprites/rock.png', {frameWidth:32, frameHeight:32})`.

`createDynamicAnimations(sceneDynamic)` iterates `objectsAnimationsData`:
- Key `'respawn-area-mining-rocks_7_0'`: `animProps.key` is set ✓.
- `classLookupKey = sc.get(animProps, 'classKey', animProps.key)` = `'rock_forest_1'` (`classKey` is set in `client_params`).
- `classDefinition = config.getWithoutLogs('client/customClasses/objects/rock_forest_1', AnimationEngine)` → the registered client class if present, otherwise `AnimationEngine` fallback.
- `new AnimationEngine(gameManager, animProps, sceneDynamic)`.

`AnimationEngine.createAnimation()`:
- `this.enabled = true` ✓.
- Checks `textureManager.list['rock_forest_1']` — texture loaded by preloader ✓.
- Creates sprite via `currentScene.physics.add.sprite(x, y, 'rock_forest_1')`.
- `this.isInteractive = true` → `enableInteraction(currentScene)` → registers `pointerdown` listener.
- `currentScene.objectsAnimations['respawn-area-mining-rocks_7_0'] = this` (AnimationEngine instance).

Rock sprite is NOW VISIBLE in the scene.

`ObjectsPlugin.setOnChangeBodyCallback` registers Colyseus body listeners:
- On any body property change: calls `updateObjectsAnimations('respawn-area-mining-rocks_7_0', body, currentScene)`.
- `setVisibility(currentBody, ACTIVE === body.inState)` — controls sprite visibility.

---

## Step 6 - Player Clicks Rock

A player click sends an `OBJECT_INTERACTION` message to the server, routed via `room.messageActions` to `RockObject.executeMessageActions`, which validates the player is within range then starts the `TimingObject` countdown.

Client `AnimationEngine.enableInteraction` click handler:
- `tempId = (this.key === this.asset_key) ? this.id : this.key` = `(key !== asset_key)` → `tempId = 'respawn-area-mining-rocks_7_0'`.
- Sends `{act: ObjectsConst.OBJECT_INTERACTION, id: 'respawn-area-mining-rocks_7_0', type: TYPE_NPC}`.

Server `RoomScene.executeMessages` iterates `messageActions`:
- `messageActions['respawn-area-mining-rocks_7_0'] = rockInstance`.
- Calls `rockInstance.executeMessageActions(client, data, room, playerSchema)`.

`TimingObject.executeMessageActions`:
- `isValidId(data)`: `this.key === data.id` → `'respawn-area-mining-rocks_7_0' === 'respawn-area-mining-rocks_7_0'` ✓.
- `isObjectInteractionMessage(data)`: `data.act === OBJECT_INTERACTION` ✓.
- `isValidInteraction(playerSchema.state.x, playerSchema.state.y)`: validates player is within interaction area ✓.
- `if(this.isActive)` → false (rock is idle) → proceeds.
- `startTiming(client, room, playerSchema)`.

`TimingObject.startTiming`:
- `this.isActive = true`.
- `client.send('*', {act: 'timingStart', id: 16})` — sends to client with `id = this.id = 16` (DB id).
- Starts `timingCheckInterval` every 100ms: checks if player moved (`cancelOnMove=true`). If moved → `cancelTiming(client)`.
- Starts `timingTimer = setTimeout(completeTiming, 5000)`.

Client receives `{act: 'timingStart', id: 16}` — `TimingObjectClient` (if registered) shows timing UI. Note: `AnimationEngine` base class does NOT handle `timingStart`; a custom client class with `classKey: 'rock_forest_1'` in clientParams would be needed to show a progress bar.

---

## Step 7 - Timing Completes

After `timingDuration` ms without the player moving, `completeTiming` credits the player with an ore item, disables the rock's collision group so the player can walk through it, sets `inState=DISABLED` to hide the sprite, then triggers `ObjectRespawnBehavior.execute` to start the respawn timer.

After 5000ms (if player did not move), `RockObject.completeTiming(client, room, playerSchema)`:
- `let newItem = playerSchema.inventory.manager.createItemInstance(this.itemKey)` — `this.itemKey = 'ore'`.
- `let addResult = await playerSchema.inventory.manager.addItem(newItem)`.
- If `addResult === false` (inventory full, etc.) → `this.cancelTiming(client)` and return.
- `this.isActive = false`.
- `this.objectBody.bodyState.inState = GameConst.STATUS.DISABLED`.
- `client.send('*', {act: 'timingComplete', id: 16, rewarded: true, itemKey: 'ore'})`.
- `if(!this.respawnBehavior) { return; }` — guard (respawnBehavior is set in Step 3).
- `this.respawnBehavior.execute(room)`.

Rock sprite becomes invisible: Colyseus syncs `inState = DISABLED` → `setVisibility(false)`.

---

## Step 8 - ObjectRespawnBehavior.execute (lib/respawn/server/object-respawn-behavior.js)

Schedules `restore()` after `respawnTime` ms. On restore, `onBeforeRestore` sets `AVOID_INTERPOLATION`, the body moves to a new random tile, body state x/y are updated, then `respawnStateTime` ms later `setActive` sets `ACTIVE`. The client receives the position change while the sprite is hidden (AVOID_INTERPOLATION suppresses interpolation), then shows it at the correct position when ACTIVE arrives.

`execute(room)`:
- `this.respawnTimer = setTimeout(async () => { await this.restore(room); }, 30000)`.

After 30 seconds, `restore(room)`:
- `obj.onBeforeRestore(room)` → `RockObject.onBeforeRestore` sets `this.objectBody.bodyState.inState = GameConst.STATUS.AVOID_INTERPOLATION`.
- Gets `respawnArea = world.respawnAreas['respawn-area-mining-rocks']`.
- Picks new random tile via `respawnArea.getRandomTile(obj.objectIndex)`.
- Updates body position: `obj.objectBody.position = [newX, newY]`, `obj.objectBody.bodyState.x = newX`, `obj.objectBody.bodyState.y = newY`.
- Calls `updateBodyPositionInitialData(room, newX, newY)` — updates `room.state.roomData.objectsAnimationsData['respawn-area-mining-rocks_7_0'].x/y` and calls `room.state.mapRoomData()` to refresh the serialized sceneData.
- `this.respawnStateTimer = setTimeout(() => { this.setActive(room); }, sc.get(obj, 'respawnStateTime', 0))`.

`setActive(room)`:
- `obj.isActive = false`.
- `obj.objectBody.bodyState.inState = GameConst.STATUS.ACTIVE`.
- Colyseus syncs `inState = ACTIVE` to client.
- Client `setVisibility(ACTIVE === ACTIVE)` = `setVisibility(true)`.
- Rock sprite reappears at new position.

---

## Step 9 - Timing Cancelled (player moved)

If the player moves during the mining countdown, all timers are cleared and the client is notified. The rock remains active and immediately clickable again — no respawn is triggered.

`timingCheckInterval` fires every 100ms. If `playerSchema.state.x !== startX || playerSchema.state.y !== startY` (and `cancelOnMove=true`):
`cancelTiming(client)`:
- `clearInterval(timingCheckInterval)`.
- `clearTimeout(timingTimer)`.
- `this.isActive = false`.
- `client.send('*', {act: 'timingCancel', id: 16})`.

Rock remains active and clickable. No respawn triggered.

---

## Critical Design Notes

- `childObjectClassKey` in `private_params` takes priority over `childObjectType` for sub-object class resolution. If `childObjectClassKey` is set, it looks up `customClasses.objects[childObjectClassKey]` first.
- Spawned rock instances get `client_key = objectIndex` (pattern: `layerName_respawnAreaId_instanceNumber`), overriding the template's DB `client_key`.
- `clientParams.id = 16` (DB id of template) but `clientParams.key = objectIndex`. Client sends `id = key` for interaction (since `key !== asset_key`). Server `isValidId` checks `this.key === data.id` ✓.
- `hasState = true` in `private_params` is required for `createWorldObject` to create `PhysicalBody` with `ObjectBodyState`, enabling Colyseus sync.
- `runAdditionalRespawnSetup` MUST register `room.messageActions[this.key]` for the click interaction to be routed to the rock instance. This fires via `reldens.sceneRoomOnCreate` listener.
- `ObjectRespawnBehavior` handles the entire respawn lifecycle for rocks, unlike enemies which have their own `respawn()` method.
- `RockObject.completeTiming` overrides `TimingObject.completeTiming` to use `this.itemKey` directly instead of `rollReward()`. The `respawnBehavior` guard (`if(!this.respawnBehavior){ return; }`) prevents crashing when `completeTiming` is accidentally called on the template MultipleObject.
- The `reldens-forest.json` map layer `respawn-area-mining-rocks` (id=74) has its `data` array with non-zero tile values (111) in the upper-left region of the map, defining where rocks can spawn.
