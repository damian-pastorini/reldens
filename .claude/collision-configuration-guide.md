# Collision Configuration Guide

## How the Physics System Works

Reldens uses the p2.js physics engine (server-authoritative). Every object that should physically exist in the world needs a physics body. Bodies fall into three types driven by the p2.js `Body.type` constant:

- `1` - `DYNAMIC`: affected by forces, pushed by other DYNAMIC bodies. Default for all objects.
- `2` - `STATIC`: immovable (`invMass = 0`). Cannot be pushed. Player stops at it.
- `4` - `KINEMATIC`: moved only by its own velocity, never pushed (`invMass = 0`). Used by the NPCs with random movement.

## Default Object Body Type

`p2world.js` line 137:
```javascript
this.worldObjectBodyType = sc.get(options.worldConfig, 'worldObjectBodyType', Body.DYNAMIC)
```

All object bodies default to `DYNAMIC`. The player movement system reapplies velocity every tick via Colyseus state updates. Two DYNAMIC bodies with equal mass push each other, so the player body displaces the NPC body on contact. Collision detection fires correctly (groups and masks include each other), but both bodies move as a result. Setting `collisionType:2` (STATIC) on the NPC body gives it `invMass=0`, directing the full contact impulse to the player and stopping it.

## How Objects Are Created With the Right Body Type

`p2world.js` in `createWorldObject` (line 634):
```javascript
let collisionType = sc.get(roomObject, 'collisionType', this.worldObjectBodyType);
```

The method reads `collisionType` directly off the `roomObject` instance. Because `BaseObject.mapPrivateParams` runs `Object.assign(this, privateParamsObject)`, any property in the `private_params` JSON column becomes an instance property - so the value set in the database is picked up here automatically.

## Configuring Collision Per Object (Database)

Add `"collisionType":2` to the `private_params` JSON column in the `objects` table for any NPC that should physically block the player:

```sql
UPDATE `objects` SET `private_params` = JSON_SET(`private_params`, '$.collisionType', 2) WHERE `id` = <object_id>;
```

### `collisionType` Values

- `2` (STATIC) - the body cannot be pushed or moved, p2 never integrates its velocity. Player stops when walking into it. Use for rocks, chests, fishing spots and any interactable that never moves.
- `1` (DYNAMIC) - default. NPC body is pushed by the player. Use for enemies that chase (they must move) and any object that should not block.
- `4` (KINEMATIC) - the body moves by its own velocity and cannot be pushed, so the player stops when walking into it. Use for the interactive NPCs with `randomMovement`, a STATIC body never moves.

### `hasState` Requirement for Respawnable STATIC Objects

When `collisionType:2` is used on a respawnable object (e.g. the mining rock) that also has animation state synced via Colyseus, `hasState:true` must also be set in `private_params`. This ensures the body is created as a `PhysicalBody` with a `bodyState` attached, which is required for timing/animation state updates.

```json
{"collisionType":2,"hasState":true}
```

Without `hasState`, the body is a plain `p2.Body` with no `bodyState`, and the Respawn plugin skips adding it to the room state entirely (`lib/respawn/server/plugin.js:119`).

## Which Objects Should Block the Player

### Moving NPCs: collisionType:4

The interactive NPCs wander around their tile, so they use KINEMATIC bodies with `hasState:true` and `randomMovement` (ids from `migrations/production/reldens-sample-data-v4.0.0.sql`):

- `npc_1` (Alfred, id=5) - town NPC
- `npc_2` (Mamon/healer, id=8) - town NPC
- `npc_3` (Gimly/merchant, id=10) - town NPC
- `npc_4` (Barrik/weapons master, id=12) - town NPC
- `npc_5` (Miles/quest NPC, id=13) - forest level 1 NPC

### Static interactables: collisionType:2

- `rock_forest_1_area` (id=16) - mining rock respawn parent, also needs `hasState:true`
- `fish_spawn_forest_1` (id=17) - fishing spot in the river
- `chest_forest_1` (id=18) - treasure chest

### Enemies: DYNAMIC

Enemy objects (class_type=4, childObjectType=4) use DYNAMIC bodies - they need to move and chase the player. Movement stopping on enemy contact comes from game logic: `collisions-manager.js playerHitObjectBegin` calls `roomObject.onHit()` on the enemy, which triggers the battle system and deactivates the player.

### Doors and transition triggers: no body blocking

Doors (class_type=2, `runOnHit:true`) fire the hit event when the player touches their body, which runs the door animation only. The door body is a full tile (shifted by `yFix`) on the same tile as the change point, while the change point body is half a tile (`P2world.createChangePoint`), so the door needs `"collisionResponse":false` in `private_params`: the player then walks through the door body (the hit event still fires) into the change point. With the default `collisionResponse` (true) the solid door body stops the player before the change point and the door never leads anywhere. The sample town doors (objects 19, 22 to 27) use `{"runOnHit":true,"roomVisible":true,"yFix":6,"collisionResponse":false}`. The room change is NOT done by the door: it comes from the change point body on that tile, created either from a map layer whose name contains `change-points` or from the `rooms_change_points` records by `StorageChangePointsCreator` (`lib/world/server/storage-change-points-creator.js`). A door without a change point on its tile opens and does nothing else.

### Fish spawn: tile layer boundary

The fish spawn point (id=17, `fish_spawn_forest_1`) sits in the river. The river's physical boundary comes from the map tile collision layer. The object itself carries `collisionType:2`, so its body is STATIC and also acts as an interaction target the player cannot push.

## Random Movement

An object wanders around its original tile when its `private_params` contain `randomMovement`:

```json
{"collisionType":4,"hasState":true,"randomMovement":{"maxTiles":5}}
```

- `maxTiles` (default `3`) - the farthest column and row offset from the original tile
- `minDelay` and `maxDelay` (defaults `3000` and `8000`) - the random wait in milliseconds between two moves
- `targetAttempts` (default `10`) - the random tiles tried per move before skipping it

The flow:

- `ObjectsPlugin` listens `reldens.createdWorldObject` and calls `ObjectsManager.startObjectRandomMovement` (`lib/objects/server/manager.js`), which sets the body original tile (`originalCol`, `originalRow`) to the tile the body was created on and creates the `ObjectRandomMovement` (`lib/objects/server/object/object-random-movement.js`) on `roomObject.randomMovementBehavior`. The respawn restore sets the original tile again on every new respawn tile.
- The body must be a `PhysicalBody` (`hasState:true`, enemies set it in their constructor), otherwise a warning is logged and the object stays still.
- Each move picks a walkable tile of the body path finder grid inside `maxTiles` whose whole path stays inside `maxTiles` from the original tile (a tile behind a wall reached only by walking out of the area is not used) and sets that path on `autoMoving`; a body outside the area walks back to its original tile; the move is skipped while the body is auto moving (chase or return), while its state is not active (dead) or while it is in battle with a player.
- A path that kept the body on the same tile between two moves (blocked by a wall corner or by another body standing on it) is stopped (`stopAutoMoving`) and the body gets a new random target in the same move, the path of an object in battle is never stopped this way. A body pushed out of its area by another body walks back inside on its next move, because every target is inside `maxTiles` from the original tile.
- `ObjectsPlugin` listens `reldens.sceneRoomOnCreate` and calls `ObjectsManager.addStateBodiesToRoomState`, so the bodies with state of the room objects are synced to the clients by the `client_key` (before only the respawn and bullet bodies were).
- `NpcObject.executeMessageActions` (also used by the traders) moves the interaction area of an NPC with random movement to its current body state position (`this.state.x`, `this.state.y`) before validating the interaction; the objects that never move keep the area of their creation or respawn position.
- `NpcObject.executeMessageActions` (also used by the traders) calls `ObjectRandomMovement.pauseForInteraction(client.sessionId)` after a valid interaction: the current path is stopped and no new move starts while any player keeps the dialog open. The dialog close button sends `{act: 'closeUi', id: objectId}`, `NpcObject` calls `resumeAfterInteraction(client.sessionId)` on it and on the out of reach close, and `ObjectsPlugin` listens `reldens.removePlayerBefore` to call `ObjectsManager.resumeObjectsMovementAfterInteraction` for a player that left the room with a dialog open. When the last dialog is closed the next move is scheduled again with a new random delay.
- `RoomScene.handleObjectsManagerOnRoomDispose` stops the timers.

The respawn parents pass `randomMovement` to their children. The sample data uses `3` for the aggressive enemies, `8` for the passive enemies and `5` for the NPCs.

## Room `customData` and the world options

A room `customData` key does NOT reach the physics world by itself. Two separate paths exist and both are explicit:

- `WorldConfig.mapWorldConfigValues(room, config)` (`lib/rooms/server/world-config.js`) reads a fixed list of keys from `room.customData` into `room.worldConfig` (`applyGravity`, `gravity`, `globalStiffness`, `globalRelaxation`, `useFixedWorldStep`, `timeStep`, `maxSubSteps`, `movementSpeed`, `allowPassWallsFromBelow`, `jumpSpeed`, `jumpTimeMs`, `tryClosestPath`, `onlyWalkable`, `wallsMassValue`, `playerMassValue`, `bulletsStopOnPlayer`, `bulletsStopOnObject`, `disableObjectsCollisionsOnChase`, `disableObjectsCollisionsOnReturn`, `collisionsGroupsByType`, `groupWallsVertically`, `groupWallsHorizontally`). It runs before the world is created and `worldConfig` is what `P2world` reads for those values.
- Anything `P2world` reads from the options root (`allowChangePoints`, `usePathFinder`, `allowBodiesWithState`, `type`) has to be passed in the object built by `RoomScene.createWorld` (`lib/rooms/server/scene.js`). `usePathFinder` is passed there from `customData`; `allowChangePoints`, `allowBodiesWithState` and `type` are not passed by anything, so the first two are always true and `type` is always the default (nothing reads `world.type`).

Adding a new per room physics key means adding it to one of those two places, otherwise it is silently ignored.

## Collision Groups and Masks

The group bits are defined in `WorldConst.COLLISIONS` (`lib/world/constants.js`) and the masks are built in `WorldConfig.mapWorldConfigValues` (`lib/rooms/server/world-config.js`) as `collisionsGroupsByType`, which `P2world.createCollisionShape` reads. They control WHICH bodies detect collision with each other:

- `PLAYER` (group=1, mask=127) - detects collision with everything
- `OBJECT` (group=2, mask=15) - detects players, objects, walls and player bullets
- `WALL` (group=4, mask=127) - detects everything; used for map tile boundaries
- `BULLET_PLAYER` (group=8, mask=63) - everything except drops
- `BULLET_OBJECT` (group=16, mask=13) - players, walls and player bullets
- `BULLET_OTHER` (group=32, mask=15) - players, objects, walls and player bullets
- `DROP` (group=64, mask=5) - players and walls only

The whole `collisionsGroupsByType` map can be overridden per room through `customData` or globally through the `server/rooms/world` config. All game objects use group=2 (OBJECT) by default. The `collisionGroup` property on the object instance can override this. OBJECT (2) is the correct group for NPCs, it includes players and other objects in its collision mask.

## `collisionType` Propagation for Respawnable Objects

For respawn parent objects (class_type=7), the `private_params` JSON is inherited by child instances via `room-respawn.js:128`:
```javascript
let clonedObjProps = Object.assign({}, multipleObj.objProps);
```

So setting `"collisionType":2` on the respawn parent row is sufficient, all spawned children will also have `collisionType=2` on their instances.

## Constructor and DB Load Order

`BaseObject` constructor calls `mapPrivateParams(props)` which does `Object.assign(this, privateParamsObject)`, promoting all `private_params` JSON fields to instance properties. Any assignment in a subclass constructor runs after this, so subclass constructor assignments take precedence over DB values for the same property. `collisionType` and `hasState` are left to `private_params` so the DB drives them.
