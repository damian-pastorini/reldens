# How to Set Up a Respawning Object

This guide covers everything required to create a working respawning object (enemy, resource node, chest, etc.) from scratch.

---

## Required DB Records

### 1. `objects` table - the template/area object

This is the parent container. It defines the respawn area and resolves the child class.

- `room_id` - ID of the scene room where the object lives.
- `layer_name` - MUST match the map layer name exactly (e.g. `'merge-respawn-area-monsters'`). Used by the respawn system to find this object. Map layer names MUST contain `'respawn-area'` (the import merges spot layers as `merge-<name>`, which still contains it).
- `tile_index` - set to `NULL` for area objects.
- `class_type` - set to `7` (`MultipleObject`). This is the container type for all respawning objects.
- `object_class_key` - set to any string (e.g. `'enemy_1'`). Not required to match a registered custom class; used only as a fallback lookup attempt. The `class_type=7` fallback to `MultipleObject` is what actually runs.
- `client_key` - set to the asset key of the child (e.g. `'enemy_forest_1'`). This is only used as the template key and is overridden at spawn time; it does not affect spawned instances.
- `private_params` - JSON. Controls child class resolution and spawn behavior:
  - `"shouldRespawn": true` - **required**. Without this the respawn system silently skips this object.
  - `"childObjectClassKey": "rock_forest_1"` - use this (string) to resolve the child class from `customClasses.objects`. Takes priority over `childObjectType`.
  - `"childObjectType": 4` - use this (number) instead of `childObjectClassKey` to resolve by type from the `objects_types` DB table through the `objectsClassTypes` config list (e.g. 4=EnemyObject). Use one or the other, not both.
  - `"hasState": true` - required if the child needs a Colyseus body state (needed for position sync and visibility control).
  - `"runOnAction": true` - set if the child responds to player click interactions.
  - `"collisionType": 2` - set to enable collision bodies.
  - `"respawnStateTime": 100` - **required for correct client rendering**. Sets the delay (ms) between the position update patch (`inState=AVOID_INTERPOLATION`) and the activation patch (`inState=ACTIVE`). Without this (defaults to 0), both state changes collapse into the same Colyseus patch, the client never sees `AVOID_INTERPOLATION`, and the position change triggers client-side interpolation. Since static objects have `mov=false`, the interpolation runs exactly one step then stops, leaving the sprite permanently stuck at a partially interpolated position. Any value above one Colyseus patch interval (>= 50ms) is sufficient; 100ms is safe.
  - Any other properties are merged onto both the template and child instances via `Object.assign`.
- `client_params` - JSON. Merged into `clientParams` on both template and child instances. Key fields:
  - `"classKey": "rock_forest_1"` - tells the client which custom class to use (`customClasses.objects[classKey]`). Without this the client falls back to base `AnimationEngine` (sprite still shows but custom client features won't run).
  - `"ui": false` - set to false for non-dialog objects (enemies, rocks, chests). Omitting this causes the NPC dialog UI to be created for the object.
  - `"autoStart": true` - used for enemies to auto-play the walk animation.
  - `"timingDuration": 5000` - used by `TimingObject` children for the action timer (ms).
  - `"frameStart": 0, "frameEnd": 0` - animation frame range.
- `enabled` - set to `1`. Setting to `0` causes the respawn system to skip this object with a warning.

### 2. `respawn` table - defines spawn rules

One row per object-layer combination.

- `object_id` - FK to `objects.id` of the template object above.
- `respawn_time` - milliseconds before a dead/depleted instance respawns at a new tile.
- `instances_limit` - how many child instances are spawned simultaneously.
- `layer` - MUST exactly match `objects.layer_name`.

### 3. `objects_assets` table - defines the spritesheet

One row per asset for the object. The primary key column is `object_asset_id`.

- `object_id` - FK to `objects.id`.
- `asset_type` - `'spritesheet'` for animated sprites.
- `asset_key` - the Phaser texture key (e.g. `'enemy_forest_1'`). The respawn system sets `childInstance.clientParams.asset_key` to this value. Without this, the client cannot create a sprite.
- `asset_file` - filename under `assets/custom/sprites/` (e.g. `'monster-treant.png'`).
- `extra_params` - JSON: `{"frameWidth": N, "frameHeight": N}`.

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

All three records can also be created through the admin panel at `/reldens-admin` - use **Objects** for the `objects` table, **Objects Assets** for `objects_assets`, and **Respawn** for the `respawn` table.

---

## Required Map Layer

In the room's Tiled JSON map:

- Add a layer whose name contains `'respawn-area'` (e.g. `'merge-respawn-area-monsters'`).
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

- Every child instance created by the respawn system gets an `ObjectRespawnBehavior` assigned to `objInstance.respawnBehavior`. `ObjectRespawnBehavior` handles the respawn cycle when `respawnBehavior.execute(room)` is called; objects can hook into it with the optional `onBeforeRestore(room)`, `onAfterRestore(room)` and `onSetActive(room)` methods.
- `hasState: true` in `private_params` is required for the body state (Colyseus sync, visibility control). Without it the body exists in the physics world but clients cannot track its position or state changes.

---

## Required Client-Side Code

### Register the client class in `theme/plugins/client-plugin.js`

```javascript
customClasses.objects['your_object_key'] = YourClientClass;
```

Where `'your_object_key'` matches `client_params.classKey`.

### Client class requirements

- Extend `AnimationEngine` or the client `TimingObject` (`lib/objects/client/object/type/timing-object.js`, which extends `AnimationEngine`).
- The client `TimingObject` handles `timingStart`/`timingCancel`/`timingComplete` messages and renders a progress bar.
- Without a registered client class (or missing `classKey` in `client_params`), the base `AnimationEngine` is used - the sprite appears correctly but custom client features won't run.

---

## Required Asset File

Place the sprite PNG under:
```
theme/default/assets/custom/sprites/your-sprite.png
```

After the theme is built/deployed, it must also exist in the project root at:
```
dist/assets/custom/sprites/your-sprite.png
```

The client preloader loads it from `/assets/custom/sprites/<asset_file>`.

---

---

# Enemy Complete Spawn and Respawn Flow

## Example DB Records

These are the actual values from the default Reldens installation, not templates. For field descriptions and the SQL template, see `## Required DB Records` in the setup guide above.

`objects` table row id=6:
- `room_id = 114` (reldens-forest-level-1 scene)
- `layer_name = 'merge-respawn-area-monsters'`
- `tile_index = NULL`
- `class_type = 7` (MultipleObject)
- `object_class_key = 'enemy_1'` (not in customClasses, used only to attempt lookup)
- `client_key = 'enemy_forest_1'`
- `private_params = '{"shouldRespawn":true,"childObjectType":4,"isAggressive":true,"interactionRadio":170,"randomMovement":{"maxTiles":3}}'`
- `client_params = '{"autoStart":true,"frameStart":12,"frameEnd":26,"repeat":-1}'`
- `enabled = 1`

`respawn` table row id=3:
- `object_id = 6`
- `respawn_time = 20000`
- `instances_limit = 12`
- `layer = 'merge-respawn-area-monsters'`

`objects_assets` table row object_asset_id=5:
- `object_id = 6`
- `asset_type = 'spritesheet'`
- `asset_key = 'enemy_forest_1'`
- `asset_file = 'monster-treant.png'`
- `extra_params = '{"frameWidth":47,"frameHeight":50,"spacing":2}'`

`objects_animations` rows id=5 to id=8 also exist for `object_id = 6` (the directional walk animations).

---

## Step 1 - ObjectsManager.generateObjectFromObjectData (lib/objects/server/manager.js)

Reads the `objects` row for the area, instantiates `MultipleObject` as the container, resolves `EnemyObject` as the child class via `childObjectType=4`, and stores the template in `roomObjectsByLayer` keyed by the map layer name. No child instances are created yet - this just prepares the template.

Called from `RoomScene.onCreate` (through `ObjectsManager.generateObjects`) after loading all object rows for the room.

- `let objClass = this.config.getWithoutLogs('server/customClasses/objects/'+objectData.object_class_key, false)` - returns `false` for `'enemy_1'` (not in customClasses).
- `objClass = this.resolveClassFromTypes(objectClassTypes, objectData.class_type)` - class type 7 returns `MultipleObject`.
- builds `objProps` merging config/events/dataServer with all DB row fields.
- `this.prepareInitialStats(objProps)` - object id=6 has ten `related_objects_stats` rows (`objects_stats` ids 21-30), so `objProps.initialStats` is filled with them keyed by stat key, and the spawned enemies use them.
- `let objectInstance = new objClass(objProps)`, a `MultipleObject`.

Inside `MultipleObject` constructor (`lib/objects/server/object/type/multiple-object.js`):
- `super(props)` calls `BaseObject` constructor.
- `BaseObject`: `Object.assign(this, props)` - assigns ALL props including all DB fields.
- `BaseObject`: `this.appendIndex = sc.get(props, 'tile_index', null)`, the NULL `tile_index` of the area row stays `null`.
- `BaseObject`: `this.objectIndex = props.layer_name + (this.appendIndex || '-idx-'+props.id)`, with a `null` append index it is `'merge-respawn-area-monsters-idx-6'`.
- `BaseObject`: `this.key = props.client_key` = `'enemy_forest_1'`.
- `BaseObject`: calls `mapClientParams(props)` - parses `client_params='{"autoStart":true,"frameStart":12,"frameEnd":26,"repeat":-1}'`, sets `this.clientParams.key = 'enemy_forest_1'`, `this.clientParams.id = 6`.
- `BaseObject`: calls `mapPrivateParams(props)` - parses `private_params`, sets `this.shouldRespawn = true`, `this.childObjectType = 4`, `this.isAggressive = true`.
- `MultipleObject`: `this.multiple = true`.
- `MultipleObject`: `this.classInstance = false`.

Back in `ObjectsManager.generateObjectFromObjectData`:
- `this.attachToAnimations(objectInstance)` - checks `sc.hasOwn(objectInstance, 'isAnimation')` and `sc.hasOwn(objectInstance, 'hasAnimation')`. `MultipleObject` has neither. NOT added to `objectsAnimationsData`.
- `if(objectInstance.multiple)` - true.
- `objectInstance.objProps = objProps`.
- `let childClassKey = sc.get(objectInstance, 'childObjectClassKey', false)` = false (not set on enemy), so `subObjClass` starts as false.
- `subObjClass = this.resolveClassFromTypes(objectClassTypes, objectInstance.childObjectType)` = `this.resolveClassFromTypes(objectClassTypes, 4)` = `EnemyObject`.
- `objectInstance.classInstance = subObjClass`, so `EnemyObject`.
- `this.enrichWithMultipleAnimationsData(objectData, objectInstance)` - object id=6 has four `related_objects_animations` rows, so `objectInstance.multipleAnimations` is filled with `{'merge-respawn-area-monsters_6_right': {...}, ..._down, ..._left, ..._up}`.
- `this.attachToMessagesListeners(objectInstance, objectData)` - `sc.hasOwn(objectInstance, 'listenMessages')` = false (MultipleObject has no listenMessages). Returns false. NOT added to `listenMessagesObjects`.
- `this.prepareAssetsPreload(objectData)` - adds the `objects_assets` row (object_asset_id=5) to `preloadAssets`. This causes client to preload `'enemy_forest_1'` spritesheet.
- `this.roomObjects[objectInstance.objectIndex] = objectInstance`, so `roomObjects['merge-respawn-area-monsters-idx-6']`. The Tree Punch area (object id=7) is on the same layer with a NULL `tile_index` too, its own id keeps it apart as `roomObjects['merge-respawn-area-monsters-idx-7']`.
- `this.roomObjectsByLayer[objectData.layer_name][objectData.id] = objectInstance` - the layer list is keyed by the object id, so `roomObjectsByLayer['merge-respawn-area-monsters']` keeps both areas: `{6: treeArea, 7: treePunchArea}`.

---

## Step 2 - Map Parsing - Respawn Layer Detection (lib/world/server/p2world.js)

Scans Tiled map layers during world creation. When a layer named `respawn-area-*` is found, fires an event that triggers `RespawnPlugin` to create a `RoomRespawn` instance for that layer, which will own all spawn tile tracking and instance creation.

During `RoomScene.createWorld`, `P2world.createWorldContent` parses the map layers. After the bodies queue is processed it loops the map layers again:

```javascript
for(let layer of mapLayers) {
    let eventData = {layer, world: this};
    await this.events.emit('reldens.parsingMapLayersAfterBodiesQueue', eventData);
}
```

In `RespawnPlugin.listenEvents` (`lib/respawn/server/plugin.js`) the listener validates the layer and the world from the event data and then runs:
```javascript
await this.createRoomRespawnArea(layer, world);
```

`RespawnPlugin.createRoomRespawnArea`:
- checks layer name contains `'respawn-area'`. True for `'merge-respawn-area-monsters'`.
- creates `new RoomRespawn({layer, world, events, dataServer, config})`.
- `await respawnArea.activateObjectsRespawn()`.
- `world.respawnAreas['merge-respawn-area-monsters'] = respawnArea`.

---

## Step 3 - RoomRespawn.activateObjectsRespawn (lib/respawn/server/room-respawn.js)

Parses the map layer to build the pool of valid spawn tiles, queries the `respawn` table for the matching definition, and calls `createNewObjectInstance` once per slot up to `instances_limit`.

- `this.parseMapForRespawnTiles()` - reads the layer data array. For `'merge-respawn-area-monsters'`, iterates all map tiles. Tiles with value != 0 are pushed to `this.respawnTiles` and `this.respawnTilesData[tileIndex] = {x, y, tile, tile_index, row, column}`.
- `this.layerObjects = this.world.objectsManager.roomObjectsByLayer[this.layer.name]` = `{6: treeArea, 7: treePunchArea}` (both area objects of the layer).
- queries the `respawn` entity with `{layer: 'merge-respawn-area-monsters', object_id: {operator: 'IN', value: ['6', '7']}}` - returns rows id=3 (object 6) and id=4 (object 7).
- iterates `this.respawnDefinitions`, for row id=3:
- `sc.hasOwn(this.layerObjects, respawnArea.object_id)` = `sc.hasOwn(this.layerObjects, 6)` = true.
- `sc.hasOwn(this.layerObjects[6], 'shouldRespawn')` = true (set by mapPrivateParams).
- `let multipleObj = this.layerObjects[respawnArea.object_id]`, the Tree area.
- `if(!multipleObj.objProps.enabled)` - `objProps.enabled = 1` (from DB row) - truthy, continues.
- `let objClass = multipleObj.classInstance` = `EnemyObject`.
- loops `qty = 0; qty < 12` (instances_limit=12) and calls `createNewObjectInstance(respawnArea, multipleObj, objClass, tilewidth, tileheight, qty)` for every `qty` from 0 to 11.
- row id=4 (object 7, Tree Punch, instances_limit=18) runs the same checks and loop, 18 times.

---

## Step 4 - RoomRespawn.createNewObjectInstance

Picks a random valid tile, clones the parent's props, instantiates `EnemyObject` at that position with a full physics body and Colyseus body state, and registers the live instance with the room's object manager. Runs once per `instances_limit`.

For qty=0:
- `this.instancesCreated[3] = []` (first instance of the respawn row id=3).
- `generateObjectIndex(respawnArea)` - `instancesCreated[3].length = 0`, returns `'merge-respawn-area-monsters_3_0'`.
- `let clonedObjProps = Object.assign({}, multipleObj.objProps)` - copies all DB fields + config/events/dataServer.
- `clonedObjProps.client_key = objectIndex`, so `'merge-respawn-area-monsters_3_0'`.
- `clonedObjProps.events = this.events`.
- `let {randomTileIndex, tileData} = this.getRandomTile(objectIndex)` - picks a random non-zero tile not used by another instance, returns `{x, y, tile, tile_index, row, column}` as `tileData`.
- `Object.assign(clonedObjProps, tileData)` - sets x, y on clonedObjProps.
- `let objInstance = new objClass(clonedObjProps)`, an `EnemyObject`.

Inside `EnemyObject` constructor (`lib/objects/server/object/type/enemy-object.js`):
- `super(props)` calls `NpcObject` -> `AnimationObject` -> `BaseObject`.
- `BaseObject`: `Object.assign(this, props)` - sets all props from clonedObjProps.
- `BaseObject`: `this.key = props.client_key` = `'merge-respawn-area-monsters_3_0'`.
- `mapClientParams`: `this.clientParams.key = 'merge-respawn-area-monsters_3_0'`, `this.clientParams.id = 6`.
- `mapPrivateParams`: sets `shouldRespawn=true`, `childObjectType=4`, `isAggressive=true`.
- `AnimationObject` and `NpcObject` call `mapClientParams` and `mapPrivateParams` again at the end of their constructors.
- `EnemyObject`: `this.hasState = true`.
- `EnemyObject`: `this.runOnHit = sc.get(props, 'runOnHit', true)` = true (default).
- `EnemyObject`: `this.isAggressive = sc.get(this, 'isAggressive', false)` = true (from mapPrivateParams).
- `EnemyObject`: `this.respawnTime = false`, `this.respawnStateTime = sc.get(props, 'battleTimeOff', 1000)` (1000 for this enemy), `this.respawnLayer = false`.
- `EnemyObject` calls `this.mapClientParams(props)` and `this.mapPrivateParams(props)` again at the end of its constructor, so the `private_params` values win over the constructor assignments (for example `randomMovement` becomes `{"maxTiles":3}`); this row has no `respawnStateTime` in its `private_params`, so it stays 1000.

Back in createNewObjectInstance:
- `if(sc.isObjectFunction(objInstance, 'runAdditionalRespawnSetup'))` = true.
- `await objInstance.runAdditionalRespawnSetup()` - sets up actions (skills), aggressive behavior event listener, battle end event listener.
- emits `reldens.afterRunAdditionalRespawnSetup`.
- `let assetsArr = this.getObjectAssets(multipleObj)` - iterates `multipleObj.objProps.related_objects_assets`, returns `['enemy_forest_1']`.
- `objInstance.clientParams.asset_key = assetsArr[0]`, so `'enemy_forest_1'`.
- `objInstance.clientParams.enabled = true`.
- `objInstance.clientParams.animations = multipleObj.multipleAnimations` (the four directional animations from `objects_animations`).
- `this.world.objectsManager.objectsAnimationsData[objectIndex] = objInstance.clientParams`.
- `this.world.objectsManager.roomObjects[objectIndex] = objInstance`.
- `await this.world.createWorldObject(objInstance, objectIndex, tilewidth, tileheight, tileData.x, tileData.y, this.pathFinder)`.

Inside `P2world.createWorldObject` (`lib/world/server/p2world.js`) `hasState` is resolved and passed to `createCollisionBody`, which builds a `PhysicalBody` with an `ObjectBodyState` schema:

```javascript
let hasState = this.allowBodiesWithState ? sc.get(roomObject, 'hasState', false) : false;
```

Then the body and its state are set on the object:

```javascript
roomObject.state = bodyObject.bodyState;
roomObject.objectBody = bodyObject;
```

Back in createNewObjectInstance:
- `objInstance.respawnTime = respawnArea.respawn_time` = 20000.
- `objInstance.respawnLayer = this.layer.name` = `'merge-respawn-area-monsters'`.
- `objInstance.objectIndex = objectIndex` = `'merge-respawn-area-monsters_3_0'`.
- `objInstance.randomTileIndex = randomTileIndex`.
- `this.instancesCreated[respawnArea.id].push(objInstance)`.
- `objInstance.respawnBehavior = new ObjectRespawnBehavior(objInstance)`.

Same process repeated up to `instances_limit`, creating `'merge-respawn-area-monsters_3_1'` to `'merge-respawn-area-monsters_3_11'`, then the 18 `'merge-respawn-area-monsters_4_<n>'` instances of the Tree Punch (object id=7, respawn row id=4) on the same layer.

---

## Step 5 - sceneRoomOnCreate (lib/respawn/server/plugin.js)

After the room and world are fully initialized, adds each child instance's body state to the Colyseus `bodies` MapSchema. From this point on, any change to `bodyState` is synced to all connected clients.

`RoomScene.onCreate` (`lib/rooms/server/scene.js`) emits `reldens.sceneRoomOnCreate` at its end. This is AFTER the world is created, after `this.roomData.objectsAnimationsData = this.objectsManager.objectsAnimationsData` and after the room `State` is created.

`RespawnPlugin.createRespawnAreasObjectsInstances(room)` runs:
- `let respawnAreasKeys = Object.keys(room.roomWorld.respawnAreas)` = `['merge-respawn-area-monsters', 'merge-respawn-area-mining-rocks']`.
- for each area, calls `this.createRespawnObjectsInstances(area, room)`.
- `createRespawnObjectsInstances` iterates `area.instancesCreated` = `{3: [enemyInstance0, ..., enemyInstance11], 4: [...18 instances]}`.
- calls `this.createRespawnObjectsInstancesInState(instanceObjects, room)` for each respawn row.

`createRespawnObjectsInstancesInState`:
- For `enemyInstance0`: `objInstance.hasState = true` -> `room.state.addBodyToState(objInstance.state, objInstance.client_key)` with `client_key = 'merge-respawn-area-monsters_3_0'`. Body state now synced to all clients.
- Every other instance: same with its own `client_key`.

---

## Step 6 - Client Receives Room Data

The client receives the serialized `objectsAnimationsData`, creates a Phaser sprite for the enemy at its starting position, and registers Colyseus body state listeners so server-side `inState`, `x`, and `y` changes drive the sprite's visibility and position in real time.

`room.state.roomData.objectsAnimationsData` contains:
```
{
  'merge-respawn-area-monsters_3_0': {
    key: 'merge-respawn-area-monsters_3_0',
    id: 6,
    asset_key: 'enemy_forest_1',
    enabled: true,
    autoStart: true,
    ...
  },
  'merge-respawn-area-monsters_3_1': { ... }
}
```

The 12 Tree enemies share the `asset_key` `'enemy_forest_1'` (and the 18 Tree Punch enemies share `'enemy_forest_2'`), so the server `SceneDataFilter` moves the properties with the same value in every enemy of the group to `animationsDefaults['enemy_forest_1']`, and the client `AnimationsDefaultsMerger.mergeDefaults` merges them back into each entry before the objects are created (see Step 4 and Step 5 of the rock flow below).

`ObjectAnimationFactory.createDynamicAnimations` (`lib/objects/client/object-animation-factory.js`), invoked from the `reldens.afterSceneDynamicCreate` listener of `ObjectsPlugin.listenEvents` (`lib/objects/client/plugin.js`):
- Iterates `sceneDynamic.objectsAnimationsData`.
- For key `'merge-respawn-area-monsters_3_0'`: calls `this.createAnimationFromAnimData(animProps, sceneDynamic)`.
- `if(!animProps.key)` - `animProps.key = 'merge-respawn-area-monsters_3_0'` - OK.
- `let classKey = sc.get(animProps, 'classKey', animProps.key)` is the object index (no `classKey` in this `client_params`), then `config.getWithoutLogs('client/customClasses/objects/'+classKey, AnimationEngine)` - no match, returns `AnimationEngine`.
- `let animationEngine = new animationClass(sceneDynamic.gameManager, animProps, sceneDynamic)`, an `AnimationEngine`.

Inside `AnimationEngine` constructor: `this.key = 'merge-respawn-area-monsters_3_0'`, `this.asset_key = 'enemy_forest_1'`, `this.enabled = true`.

The factory then creates the sprite and checks its visibility in one call:

```javascript
this.updateAnimationVisibility(existentBody, animationEngine.createAnimation());
```

`AnimationEngine.createAnimation()` - `this.enabled` is true, so it passes the `if(!this.enabled)` gate. Creates sprite at (x, y) with `asset_key = 'enemy_forest_1'`. Enemy IS VISIBLE.

`updateAnimationVisibility(existentBody, sprite)` - the sprite is only hidden when the body's `inState` is DEATH or DISABLED, so an ACTIVE enemy stays visible.

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

When the enemy's HP hits zero, `Pve.battleEnded` sets `inState=DEATH` to hide the sprite, then calls `EnemyObject.respawn(room)`, which disables collision, freezes the body as STATIC and hands the cycle over to `ObjectRespawnBehavior`. After `respawnTime` ms the behavior restores the object: `EnemyObject.onBeforeRestore` resets HP, makes the body DYNAMIC again and sets `AVOID_INTERPOLATION` to suppress client interpolation, the behavior moves the body to a new random tile, then sets `ACTIVE` after `respawnStateTime` ms so the client shows the sprite at the correct new position.

When HP reaches 0, the battle system itself triggers respawn - NOT a collision.

`Pve.battleEnded(playerSchema, room)` (`lib/actions/server/pve.js`):
- `this.targetObject.objectBody.bodyState.inState = GameConst.STATUS.DEATH`. Colyseus syncs to client. Client `setVisibility(ACTIVE === DEATH)` = false. Enemy HIDDEN.
- `if(sc.isObjectFunction(this.targetObject, 'respawn'))` - checks if method exists on the enemy instance.
- `await this.targetObject.respawn(room)` - calls `EnemyObject.respawn(room)` directly.

`EnemyObject.onBattleEnd` is NOT what triggers respawn - it only logs `'BattleEnd method not implemented for EnemyObject.'`. Respawn is called directly by `Pve.battleEnded` before the battle end event fires:

```javascript
if(sc.isObjectFunction(this.targetObject, 'respawn')){
    await this.targetObject.respawn(room);
}
this.sendBattleEndedActionData(room, playerSchema, actionData);
let event = new BattleEndedEvent({playerSchema, pve: this, actionData, room});
await this.events.emit(this.targetObject.getBattleEndEvent(), event);
```

`EnemyObject.runAdditionalRespawnSetup` registers:
- `setupActions()` - loads skills from DB.
- `this.aggression.setup()` - `EnemyAggression.setup()` listens to the `reldens.sceneRoomOnCreate` event to attach the aggression post-broadphase listener to the room world.
- `events.onWithKey(getBattleEndEvent(), onBattleEnd.bind(this), ...)` - registers battle end listener (currently only logs).

The `sceneRoomOnCreate` event fires AFTER `runAdditionalRespawnSetup` runs (respawn system creates instances during world creation, `sceneRoomOnCreate` fires after). This pattern allows child instances to register room-level behavior after the room is fully created.

When HP reaches 0 in battle, `EnemyObject.respawn(room)` is called.

`EnemyObject.respawn(room)`:
- `this.objectBody.resetAuto()` - stops movement.
- `this.objectBody.stopMove()`.
- `this.objectBody.collisionResponse = false` - disables collisions.
- `this.originalType = this.objectBody.type`.
- `this.objectBody.type = this.objectBody.world.bodyTypes.STATIC` - stops physics.
- `return this.respawnBehavior.execute(room)`.

`ObjectRespawnBehavior.execute(room)` (`lib/respawn/server/object-respawn-behavior.js`):
- `this.respawnTimer = await this.scheduleWithTimer(async () => { await this.restore(room); }, this.objInstance.respawnTime)` with `respawnTime = 20000`.

After 20 seconds, `ObjectRespawnBehavior.restore(room)` runs:
- `obj.onBeforeRestore(room)` -> `EnemyObject.onBeforeRestore` sets `this.objectBody.collisionResponse = true`, `this.objectBody.type = DYNAMIC`, `this.stats = Object.assign({}, this.initialStats)` (restores full HP) and `this.objectBody.bodyState.inState = GameConst.STATUS.AVOID_INTERPOLATION`. Colyseus syncs to client, `setVisibility(ACTIVE === AVOID_INTERPOLATION)` = `setVisibility(false)`. Enemy HIDDEN briefly.
- picks a new random tile from `respawnAreas['merge-respawn-area-monsters']` and repositions the body and its `bodyState.x`/`bodyState.y`.
- `obj.onAfterRestore(room)` -> `EnemyObject.onAfterRestore` emits `reldens.restoreObjectAfter`.
- `this.respawnStateTimer = await this.scheduleWithTimer(() => { this.setActive(room); }, sc.get(obj, 'respawnStateTime', 0))` (`respawnStateTime = sc.get(props, 'battleTimeOff', 1000)`, so 1000ms for this enemy).

`ObjectRespawnBehavior.setActive(room)`:
- `this.objInstance.isActive = false`.
- `this.objInstance.objectBody.bodyState.inState = GameConst.STATUS.ACTIVE`.
- Calls the optional `onSetActive(room)` hook (`EnemyObject.onSetActive`).
- Colyseus syncs to client. `setVisibility(ACTIVE === ACTIVE)` = `setVisibility(true)`. Enemy VISIBLE again.

---

## Step 9 - Client Visibility Summary

Summarizes how the Colyseus `inState` value drives sprite visibility throughout the enemy lifecycle. The same callback handles all state transitions.

Client `ObjectsPlugin.setOnChangeBodyCallback` (`lib/objects/client/plugin.js`):
- Registers listener on every property of the body state.
- On ANY property change: `this.setVisibility(currentBody, GameConst.STATUS.ACTIVE === body.inState)`.
- `currentBody = currentScene.objectsAnimations['merge-respawn-area-monsters_3_0']` = AnimationEngine instance.
- `ObjectsPlugin.setVisibility` calls `currentBody.sceneSprite.setVisible(isActive)`.

Enemy ACTIVE (inState=1) -> sprite visible.
Enemy AVOID_INTERPOLATION (inState=4) -> sprite hidden.
Enemy DEATH (inState=3) -> sprite hidden.

---

# Rock (TimingObject) Complete Spawn and Respawn Flow

## Key Differences vs Enemy Flow

Rocks use `childObjectClassKey` (string) instead of `childObjectType` (number) to resolve the sub-object class.
Rocks use `RockObject -> TimingObject -> NpcObject -> AnimationObject -> BaseObject`.
Rocks are interactive objects (click to start timed action) rather than collision-based enemies.
Rocks do NOT have their own `respawn` method; they rely entirely on `ObjectRespawnBehavior`.

---

## Example DB Records

These are the actual values from the default Reldens installation. For field descriptions and the SQL template, see `## Required DB Records` in the setup guide above.

`objects` table row id=16 (`migrations/production/reldens-sample-data-v4.0.0.sql`):
- `room_id = 114` (reldens-forest-level-1 scene)
- `layer_name = 'merge-respawn-area-mining-rocks'`
- `tile_index = NULL`
- `class_type = 7` (MultipleObject)
- `object_class_key = 'rock_forest_1_area'` (not in customClasses, falls back to class_type)
- `client_key = 'rock_forest_1'` (template key, irrelevant for spawned instances)
- `private_params = '{"shouldRespawn":true,"childObjectClassKey":"rock_forest_1","itemKey":"ore","cancelOnMove":true,"cancelOnHit":true,"cancelOnOutOfRange":false,"runOnAction":true,"collisionType":2,"hasState":true,"interactionArea":48}'`
- `client_params = '{"timingDuration":5000,"isInteractive":true,"frameStart":0,"frameEnd":0,"classKey":"rock_forest_1","ui":false}'`
- `enabled = 1`

`respawn` table row id=7:
- `object_id = 16`
- `respawn_time = 30000`
- `instances_limit = 10`
- `layer = 'merge-respawn-area-mining-rocks'`

`objects_assets` table row object_asset_id=14:
- `object_id = 16`
- `asset_type = 'spritesheet'`
- `asset_key = 'rock_forest_1'`
- `asset_file = 'rock.png'`
- `extra_params = '{"frameWidth":32,"frameHeight":32}'`

Sprite file: `theme/default/assets/custom/sprites/rock.png` (present)

---

## Step 1 - ObjectsManager.generateObjectFromObjectData

Identical to the enemy flow but resolves the child class via `childObjectClassKey='rock_forest_1'` (string lookup in `customClasses`) rather than `childObjectType` (numeric lookup in `objectsClassTypes`).

Called from `RoomScene.onCreate` for object id=16.

`config.getWithoutLogs('server/customClasses/objects/rock_forest_1_area', false)` -> false (not registered).
`resolveClassFromTypes(objectClassTypes, 7)` -> `MultipleObject`.

`new MultipleObject(objProps)`:
- `Object.assign(this, props)` sets all DB fields.
- `this.key = props.client_key = 'rock_forest_1'` (template key).
- `this.objectIndex = props.layer_name + (this.appendIndex || '-idx-'+props.id)` = `'merge-respawn-area-mining-rocks-idx-16'` (the NULL `tile_index` stays `null`, see the enemy flow Step 1).
- `mapPrivateParams`: `Object.assign(this, privateParamsObject)` sets `this.shouldRespawn = true`, `this.childObjectClassKey = 'rock_forest_1'`, `this.itemKey = 'ore'`, `this.cancelOnMove = true`, `this.cancelOnHit = true`, `this.hasState = true`, `this.collisionType = 2`, `this.runOnAction = true`, `this.interactionArea = 48`.
- `this.multiple = true`, `this.classInstance = false`.

`attachToAnimations(objectInstance)`: MultipleObject has no `isAnimation` or `hasAnimation` -> NOT added to `objectsAnimationsData`.

`if(objectInstance.multiple)` -> true.
`objectInstance.objProps = objProps`.
`childClassKey = sc.get(objectInstance, 'childObjectClassKey', false)` = `'rock_forest_1'`.
`subObjClass = config.getWithoutLogs('server/customClasses/objects/rock_forest_1', false)` = `RockObject` (registered by `ServerPlugin.defineCustomClasses` in `theme/plugins/server-plugin.js`).
`objectInstance.classInstance = RockObject`.

`enrichWithMultipleAnimationsData(objectData, objectInstance)`: object id=16 has no `objects_animations` rows, so `objectInstance.multipleAnimations` stays empty.

`attachToMessagesListeners`: MultipleObject has no `listenMessages` -> skipped. Template NOT added to `messageActions`.

`prepareAssetsPreload(objectData)` adds object_asset_id=14 to `preloadAssets`:
- key = `'1614'` (object_id=16 + object_asset_id=14)
- value = `{asset_type:'spritesheet', asset_key:'rock_forest_1', asset_file:'rock.png', extra_params:'{"frameWidth":32,"frameHeight":32}'}`

`roomObjects['merge-respawn-area-mining-rocks-idx-16'] = multipleObjInstance`.
`roomObjectsByLayer['merge-respawn-area-mining-rocks'][16] = multipleObjInstance`.

---

## Step 2 - Map Parsing

Same as enemy flow. The `merge-respawn-area-mining-rocks` layer is detected and a `RoomRespawn` instance is created to manage rock spawn tile tracking and instance creation.

`reldens-forest-level-1.json` contains layer `'merge-respawn-area-mining-rocks'` (id=10, width=72, height=100).
Its `data` array has 46 non-zero tiles (the clearing tile values 14, 15, 16, 21, 22 and others) at rows 23-28, columns 56-63 (columns 59 and 60 of row 23 are empty).
`parseMapForRespawnTiles()` finds those tiles and adds them to `this.respawnTiles`.

`this.layerObjects = roomObjectsByLayer['merge-respawn-area-mining-rocks']` = `{16: multipleObjInstance}`.
DB query for `respawn` with `{layer: 'merge-respawn-area-mining-rocks', object_id: IN [16]}` returns row id=7.

Check: `sc.hasOwn(layerObjects[7.object_id], 'shouldRespawn')` = `sc.hasOwn(layerObjects[16], 'shouldRespawn')` = true
Check: `multipleObj.objProps.enabled` = 1 -> truthy
Check: `multipleObj.classInstance` = `RockObject`
Loops `qty = 0; qty < 10` (instances_limit=10) -> calls `createNewObjectInstance` ten times.

---

## Step 3 - RoomRespawn.createNewObjectInstance

Instantiates one `RockObject` child at a random tile per slot, ten in total (`'merge-respawn-area-mining-rocks_7_0'` to `'merge-respawn-area-mining-rocks_7_9'`); the steps below follow the first one. The key difference from enemies: `runAdditionalRespawnSetup` registers the rock instance in `room.messageActions`, enabling server-side routing of player click messages to the correct instance.

`objectIndex = generateObjectIndex(respawnArea)` = `'merge-respawn-area-mining-rocks_7_0'` (layer + respawnArea.id + instances created so far).

`clonedObjProps = Object.assign({}, multipleObj.objProps)` clones all DB fields.
`clonedObjProps.client_key = 'merge-respawn-area-mining-rocks_7_0'` overrides the template key.
`{randomTileIndex, tileData} = getRandomTile(objectIndex)` picks a random non-zero tile of the respawn layer that no other instance uses.
`Object.assign(clonedObjProps, tileData)` sets `x`, `y`, `tile`, `tile_index`, `row`, `column`.

`new RockObject(clonedObjProps)` calls chain: `RockObject -> TimingObject -> NpcObject -> AnimationObject -> BaseObject`:

`BaseObject`:
- `Object.assign(this, props)` assigns all cloned props.
- `this.key = 'merge-respawn-area-mining-rocks_7_0'`.
- `this.uid = 'merge-respawn-area-mining-rocks_7_0-<timestamp>'`.
- `mapClientParams(props)`: `sc.toJson(props.client_params, {})` = `{timingDuration:5000, isInteractive:true, frameStart:0, frameEnd:0, classKey:'rock_forest_1', ui:false}`, merged into `this.clientParams`. Then `this.clientParams.key = this.key`, `this.clientParams.id = 16`.
- `mapPrivateParams(props)`: applies `private_params` again via `Object.assign(this, ...)`, setting `shouldRespawn`, `childObjectClassKey`, `itemKey`, `hasState`, etc.

`AnimationObject`:
- `this.isAnimation = true`.
- Reinitializes `this.clientParams` object then calls `mapClientParams`/`mapPrivateParams` again.

`NpcObject`:
- `this.hasAnimation = true`, `this.listenMessages = true`, `this.collisionResponse = true`.
- Sets `this.clientParams.isInteractive = true`.
- Sets `this.interactionArea` from the `server/objects/actions/interactionsDistance` config.
- Calls `mapClientParams`/`mapPrivateParams` again, so the `"interactionArea":48` of `private_params` replaces the config value.

`TimingObject`:
- `this.isActive = false`, `this.timingTimer = null`, `this.timingCheckInterval = null`.

`RockObject`:
- Class field `respawnStateTime = 100`.

`RockObject.runAdditionalRespawnSetup()`:
- Registers `this.events.onWithKey('reldens.sceneRoomOnCreate', (room) => { room.messageActions[this.key] = this; }, ...)`.
- When `reldens.sceneRoomOnCreate` fires: `room.messageActions['merge-respawn-area-mining-rocks_7_0'] = rockInstance`.

`objInstance.clientParams.asset_key = 'rock_forest_1'` (from `getObjectAssets`).
`objInstance.clientParams.enabled = true`.

`world.objectsManager.objectsAnimationsData['merge-respawn-area-mining-rocks_7_0'] = rockInstance.clientParams`.
`world.objectsManager.roomObjects['merge-respawn-area-mining-rocks_7_0'] = rockInstance`.

`createWorldObject(rockInstance, 'merge-respawn-area-mining-rocks_7_0', tileW, tileH, x, y, pathFinder)`:
- `rockInstance.interactionArea` is 48, so `roomObject.setupInteractionArea()` builds the interaction area around the rock position.
- `hasState = this.allowBodiesWithState ? sc.get(roomObject, 'hasState', false) : false` = `true`.
- Creates a `PhysicalBody` with an `ObjectBodyState` schema object.
- `rockInstance.state = bodyObject.bodyState`.
- `rockInstance.objectBody = bodyObject`.

`rockInstance.respawnTime = 30000`.
`rockInstance.respawnBehavior = new ObjectRespawnBehavior(rockInstance)`.

---

## Step 4 - State Synchronization (reldens.sceneRoomOnCreate)

Adds the rock's body state to the Colyseus `bodies` MapSchema and serializes `objectsAnimationsData` into the room's `sceneData`, making position and asset info available to any client that joins.

In `RoomScene.onCreate` (`lib/rooms/server/scene.js`):
`this.roomData.objectsAnimationsData = this.objectsManager.objectsAnimationsData`

At this point, `objectsAnimationsData['merge-respawn-area-mining-rocks_7_0']` already exists (added in Step 3 before the room state is created).

`new State(this.roomData, this.sceneDataFilter)` -> `mapRoomData()` -> `SceneDataFilter.filterRoomData(roomData)` -> `buildFilteredData(roomData)` (`lib/rooms/server/scene-data-filter.js`):
- `optimizeData(objectsAnimationsData, 'asset_key', false)`: the ten rock entries are grouped by `asset_key='rock_forest_1'` (and the enemies by `'enemy_forest_1'` and `'enemy_forest_2'`). The properties with the same value in every rock of the group (for example `classKey`, `timingDuration`, `isInteractive`, `id` and `layerName`) are moved to `animationsDefaults['rock_forest_1']`; each rock entry keeps its `key`, its `asset_key` (the grouping field) and the properties that differ, like its position.
- `filteredData.animationsDefaults` holds one entry per group with shared properties.
- `filteredData.preloadAssets`: rock asset entry `'1614'` preserved with all fields including `asset_type`.

`this.state = roomState`: the sceneData JSON now includes rock animation data, the animations defaults and preload assets.

`reldens.sceneRoomOnCreate` fires -> `RespawnPlugin.createRespawnAreasObjectsInstances(room)`:
`room.state.addBodyToState(rockInstance.state, 'merge-respawn-area-mining-rocks_7_0')`.
Rock body state is now in Colyseus `bodies` MapSchema -> synced to all clients.

`rockInstance.runAdditionalRespawnSetup` listener fires -> `room.messageActions['merge-respawn-area-mining-rocks_7_0'] = rockInstance`.

---

## Step 5 - Client Receives Room Data

Loads the `rock_forest_1` spritesheet, creates the Phaser sprite with `pointerdown` interaction enabled, and registers Colyseus body state change listeners. The rock is visible and clickable from this point.

Client `RoomEvents.checkAndCreateScene` (`lib/game/client/room-events.js`):

```javascript
if(0 === Object.keys(this.roomData).length){
    this.roomData = AnimationsDefaultsMerger.mergeDefaults(sc.toJson(this.room.state.sceneData));
}
```

`AnimationsDefaultsMerger.mergeDefaults` (`lib/game/client/animations-defaults-merger.js`):
- `preloadAssetsDefaults` is merged first into `preloadAssets` (grouped by `asset_type`), so shared spritesheet `extra_params` are restored before the preloader reads them.
- `animationsDefaults` is merged into `objectsAnimationsData` grouped by `asset_key`: the rock entry resolves the group value `'rock_forest_1'` and becomes `Object.assign({}, animationsDefaults['rock_forest_1'], rockEntry)`, so it gets back every shared property (the enemies are restored the same way from their own entries).
- `roomData.preloadAssetsDefaults` and `roomData.animationsDefaults` are deleted before the data is returned.

`ScenePreloader.preloadValidAssets`:
- Processes `preloadAssets['1614']`: `asset_type='spritesheet'` -> `this.load.spritesheet('rock_forest_1', '/assets/custom/sprites/rock.png', {frameWidth:32, frameHeight:32})`.

`ObjectAnimationFactory.createDynamicAnimations(sceneDynamic)` iterates `objectsAnimationsData`:
- Key `'merge-respawn-area-mining-rocks_7_0'`: `animProps.key` is set.
- `classKey = sc.get(animProps, 'classKey', animProps.key)` = `'rock_forest_1'` (`classKey` is set in `client_params`).
- `animationClass = config.getWithoutLogs('client/customClasses/objects/rock_forest_1', AnimationEngine)` -> `Rock` (registered by `ClientPlugin.defineCustomClasses` in `theme/plugins/client-plugin.js`), which extends `ToolTimingObject` (`theme/plugins/objects/client/tool-timing-object.js`), a client `TimingObject` that also plays the pickaxe tool animation while the timing runs.
- `new Rock(gameManager, animProps, sceneDynamic)`.

`AnimationEngine.createAnimation()`:
- `this.enabled = true`.
- Checks `this.currentPreloader.anims.textureManager.list['rock_forest_1']`, the texture loaded by the preloader.
- Creates sprite via `currentScene.physics.add.sprite(x, y, 'rock_forest_1')`.
- `this.isInteractive = true` -> `enableInteraction(currentScene)` registers the `pointerdown` listener (overridden by the client `TimingObject`).
- `currentScene.objectsAnimations['merge-respawn-area-mining-rocks_7_0'] = this`.

Rock sprite is NOW VISIBLE in the scene.

`ObjectsPlugin.setOnChangeBodyCallback` registers Colyseus body listeners:
- On any body property change: calls `animationFactory.updateObjectsAnimations('merge-respawn-area-mining-rocks_7_0', body, currentScene)`.
- `setVisibility(currentBody, ACTIVE === body.inState)` controls sprite visibility.

---

## Step 6 - Player Clicks Rock

A player click sends an `OBJECT_INTERACTION` message to the server, routed via `room.messageActions` to `RockObject.executeMessageActions`, which validates the player is within range then starts the `TimingObject` countdown.

Client `TimingObject.enableInteraction` click handler (`lib/objects/client/object/type/timing-object.js`):
- `(this.key === this.asset_key) ? this.id : this.key` -> the keys differ, so the id sent is `'merge-respawn-area-mining-rocks_7_0'`.
- Sends `{act: ObjectsConst.OBJECT_INTERACTION, id: 'merge-respawn-area-mining-rocks_7_0', type: this.type}` (`type` is `TYPE_NPC` for this object).

Server `RoomScene.executeSceneMessageActions` (`lib/rooms/server/scene.js`) iterates `messageActions`:
- `messageActions['merge-respawn-area-mining-rocks_7_0'] = rockInstance`.
- Calls `rockInstance.executeMessageActions(client, data, room, playerSchema)`.

`TimingObject.executeMessageActions`:
- `isValidId(data)`: `RockObject` overrides it as `this.key === data?.id || false || Number(this.id) === Number(data?.id || false)`, so `'merge-respawn-area-mining-rocks_7_0' === 'merge-respawn-area-mining-rocks_7_0'` passes.
- `isObjectInteractionMessage(data)`: `data.act === OBJECT_INTERACTION`.
- `isValidInteraction(playerSchema.state.x, playerSchema.state.y)`: validates player is within interaction area.
- `if(this.isActive)` -> false (rock is idle) -> proceeds.
- `startTiming(client, room, playerSchema)`.

`TimingObject.startTiming`:
- `this.isActive = true`.
- `client.send('*', {act: 'timingStart', id: 16, key: 'merge-respawn-area-mining-rocks_7_0'})`, sending `id = this.id = 16` (DB id, shared by every rock instance) and the instance `key`.
- Reads the affected property (`client/actions/skills/affectedProperty`, `hp`) and keeps its value at the start.
- Starts `timingCheckInterval` every 100ms: checks if player moved (`cancelOnMove=true`) or if the affected property is lower than its value at the previous check, a hit from an enemy or another player (`cancelOnHit=true`). Either one -> `cancelTiming(client)`.
- Starts `timingTimer = setTimeout(completeTiming, this.clientParams.timingDuration)` (5000ms).

Client receives `{act: 'timingStart', id: 16, key: 'merge-respawn-area-mining-rocks_7_0'}`. The registered `Rock` class (a `ToolTimingObject`, so a client `TimingObject`) matches on `message.key === this.key` and shows the progress bar only on that instance (matching on the shared id showed the bar on every rock). The base `AnimationEngine` does NOT handle `timingStart`, so without `classKey: 'rock_forest_1'` in `client_params` no progress bar would be rendered.

---

## Step 7 - Timing Completes

After `timingDuration` ms without the player moving, `completeTiming` credits the player with an ore item, disables the rock's collision group so the player can walk through it, sets `inState=DISABLED` to hide the sprite, then triggers `ObjectRespawnBehavior.execute` to start the respawn timer.

After 5000ms (if player did not move), `RockObject.completeTiming(client, room, playerSchema)`:
- `let newItem = playerSchema.inventory.manager.createItemInstance(this.itemKey)` with `this.itemKey = 'ore'`.
- `let addResult = await playerSchema.inventory.manager.addItem(newItem)`.
- If `addResult === false` (inventory full, etc.) -> `this.cancelTiming(client)` and return.
- `this.isActive = false`.
- `this.objectBody.setShapesCollisionGroup(0)`.
- `this.objectBody.bodyState.inState = GameConst.STATUS.DISABLED`.
- `client.send('*', {act: 'timingComplete', id: 16, key: 'merge-respawn-area-mining-rocks_7_0', rewarded: true, itemKey: 'ore'})`.
- `if(!this.respawnBehavior) { return; }` guard (respawnBehavior is set in Step 3).
- `this.respawnBehavior.execute(room)`.

Rock sprite becomes invisible: Colyseus syncs `inState = DISABLED` -> `setVisibility(false)`.

---

## Step 8 - ObjectRespawnBehavior.execute (lib/respawn/server/object-respawn-behavior.js)

Schedules `restore()` after `respawnTime` ms. On restore, `onBeforeRestore` sets `AVOID_INTERPOLATION`, the body moves to a new random tile, body state x/y are updated, then `respawnStateTime` ms later `setActive` sets `ACTIVE`. The client receives the position change while the sprite is hidden (AVOID_INTERPOLATION suppresses interpolation), then shows it at the correct position when ACTIVE arrives.

`execute(room)`:
- `this.respawnTimer = await this.scheduleWithTimer(async () => { await this.restore(room); }, this.objInstance.respawnTime)` with `respawnTime = 30000`.

After 30 seconds, `restore(room)`:
- `obj.onBeforeRestore(room)` -> `RockObject.onBeforeRestore` sets `this.objectBody.bodyState.inState = GameConst.STATUS.AVOID_INTERPOLATION`.
- Gets `respawnArea = world.respawnAreas['merge-respawn-area-mining-rocks']`.
- Picks new random tile via `respawnArea.getRandomTile(obj.objectIndex)`.
- Updates body position: `obj.objectBody.position = [newX, newY]`, `obj.objectBody.bodyState.x = newX`, `obj.objectBody.bodyState.y = newY`.
- Calls `updateBodyPositionInitialData(room, newX, newY)`, which (when `obj.updateInitialPosition` is set) updates `room.state.roomData.objectsAnimationsData['merge-respawn-area-mining-rocks_7_0'].x/y` and calls `room.state.mapRoomData()` to refresh the serialized sceneData.
- `this.respawnStateTimer = await this.scheduleWithTimer(() => { this.setActive(room); }, sc.get(obj, 'respawnStateTime', 0))` (100 for `RockObject`).

`setActive(room)`:
- `obj.isActive = false`.
- `obj.objectBody.bodyState.inState = GameConst.STATUS.ACTIVE`.
- Calls `RockObject.onSetActive`, which restores the collision group with `this.objectBody.setShapesCollisionGroup(this.objectBody.originalCollisionGroup)`.
- Colyseus syncs `inState = ACTIVE` to client.
- Client `setVisibility(ACTIVE === ACTIVE)` = `setVisibility(true)`.
- Rock sprite reappears at new position.

---

## Step 9 - Timing Cancelled (player moved or was hit)

If the player moves or is hit during the mining countdown, all timers are cleared and the client is notified. The rock remains active and immediately clickable again, no respawn is triggered.

`timingCheckInterval` fires every 100ms. If `playerSchema.state.x !== startX || playerSchema.state.y !== startY` (and `cancelOnMove=true`), or if the affected property is lower than its value at the previous 100ms check (and `cancelOnHit=true`, a heal never cancels). `lastAffectedValue` starts with the value when the timing started and is updated on every check:

```javascript
let currentAffectedValue = sc.get(playerSchema.stats, affectedProperty, 0);
if(this.cancelOnHit && currentAffectedValue < lastAffectedValue){
    this.cancelTiming(client);
    return;
}
lastAffectedValue = currentAffectedValue;
```

Then:
`cancelTiming(client)`:
- `clearInterval(timingCheckInterval)`.
- `clearTimeout(timingTimer)`.
- `this.isActive = false`.
- `client.send('*', {act: 'timingCancel', id: 16, key: 'merge-respawn-area-mining-rocks_7_0'})`.

Rock remains active and clickable. No respawn triggered.

---

## Critical Design Notes

- `childObjectClassKey` in `private_params` takes priority over `childObjectType` for sub-object class resolution. If `childObjectClassKey` is set, it looks up `customClasses.objects[childObjectClassKey]` first.
- Spawned rock instances get `client_key = objectIndex` (pattern: `layerName_respawnAreaId_instanceNumber`), overriding the template's DB `client_key`.
- `clientParams.id = 16` (DB id of template) but `clientParams.key = objectIndex`. Client sends `id = key` for interaction (since `key !== asset_key`). `RockObject.isValidId` accepts either `this.key === data.id` or `Number(this.id) === Number(data.id)`.
- `hasState = true` in `private_params` is required for `createWorldObject` to create `PhysicalBody` with `ObjectBodyState`, enabling Colyseus sync.
- `runAdditionalRespawnSetup` MUST register `room.messageActions[this.key]` for the click interaction to be routed to the rock instance. This fires via `reldens.sceneRoomOnCreate` listener.
- `ObjectRespawnBehavior` handles the respawn lifecycle for every instance created by the respawn system. Rocks call it directly from `completeTiming`; enemies call it from `EnemyObject.respawn()` after freezing the body, and hook into it with `onBeforeRestore`, `onAfterRestore` and `onSetActive`.
- `RockObject.completeTiming` overrides `TimingObject.completeTiming` to use `this.itemKey` directly instead of `rollReward()`. The `respawnBehavior` guard (`if(!this.respawnBehavior){ return; }`) prevents crashing when `completeTiming` is accidentally called on the template MultipleObject.
- The `reldens-forest-level-1.json` map layer `merge-respawn-area-mining-rocks` (id=10) has its `data` array with non-zero tile values in the clearing at rows 23-28, columns 56-63, defining where rocks can spawn.
