# Collision Configuration Guide

## How the Physics System Works

Reldens uses the p2.js physics engine (server-authoritative). Every object that should physically exist in the world needs a physics body. Bodies fall into three types driven by the p2.js `Body.type` constant:

- `1` — `DYNAMIC`: affected by forces, pushed by other DYNAMIC bodies. Default for all objects.
- `2` — `STATIC`: immovable (`invMass = 0`). Cannot be pushed. Player stops at it.
- `4` — `KINEMATIC`: scripted movement (not used by game objects).

## Default Object Body Type

`p2world.js` line 135:
```javascript
this.worldObjectBodyType = sc.get(options.worldConfig, 'worldObjectBodyType', Body.DYNAMIC)
```

All object bodies default to `DYNAMIC`. The player movement system reapplies velocity every tick via Colyseus state updates. Two DYNAMIC bodies with equal mass push each other, so the player body displaces the NPC body on contact. Collision detection fires correctly (groups and masks include each other), but both bodies move as a result. Setting `collisionType:2` (STATIC) on the NPC body gives it `invMass=0`, directing the full contact impulse to the player and stopping it.

## How Objects Are Created With the Right Body Type

`p2world.js` in `createWorldObject`:
```javascript
let collisionType = sc.get(roomObject, 'collisionType', this.worldObjectBodyType);
```

The method reads `collisionType` directly off the `roomObject` instance. Because `BaseObject.mapPrivateParams` runs `Object.assign(this, privateParamsObject)`, any property in the `private_params` JSON column becomes an instance property — so the value set in the database is picked up here automatically.

## Configuring Collision Per Object (Database)

Add `"collisionType":2` to the `private_params` JSON column in the `objects` table for any NPC that should physically block the player:

```sql
UPDATE `objects` SET `private_params` = JSON_SET(`private_params`, '$.collisionType', 2) WHERE `id` = <object_id>;
```

### `collisionType` Values

- `2` (STATIC) — NPC cannot be pushed or moved. Player stops when walking into it. Use for all interactive NPCs, rocks, chests, and any stationary interactable.
- `1` (DYNAMIC) — default. NPC body is pushed by the player. Use for enemies that chase (they must move) and any object that should not block.
- `4` (KINEMATIC) — scripted movement, not currently used for game objects.

### `hasState` Requirement for Respawnable STATIC Objects

When `collisionType:2` is used on a respawnable object (e.g. the mining rock) that also has animation state synced via Colyseus, `hasState:true` must also be set in `private_params`. This ensures the body is created as a `PhysicalBody` with a `bodyState` attached, which is required for timing/animation state updates.

```json
{"collisionType":2,"hasState":true}
```

Without `hasState`, the body is a plain `p2.Body` with no `bodyState`, and the Respawn plugin skips adding it to the room state entirely.

## Which Objects Should Have collisionType:2

### Static NPCs and interactables

All NPCs and interactables that are physically present in the world and should block the player:

- `npc_1` (Alfred, id=5) — town NPC
- `npc_2` (Mamon/healer, id=8) — town NPC
- `npc_3` (Gimly/merchant, id=10) — town NPC
- `npc_4` (Barrik/weapons master, id=12) — town NPC
- `npc_5` (Miles/quest NPC, id=13) — forest NPC
- `rock_forest_1` (id=16) — mining rock, also needs `hasState:true`
- `chest_forest_1` (id=18) — treasure chest

### Enemies: DYNAMIC

Enemy objects (class_type=4, childObjectType=4) use DYNAMIC bodies — they need to move and chase the player. Movement stopping on enemy contact comes from game logic: `collisions-manager.js playerHitObjectBegin` calls `roomObject.onHit()` on the enemy, which triggers the battle system and deactivates the player.

### Doors and transition triggers: no body blocking

Doors (class_type=2, `runOnHit:true`) fire the hit event to change rooms when the player overlaps the tile. The body type remains DYNAMIC so the player passes through and the event fires.

### Fish spawn: tile layer boundary

The fish spawn point (id=17, `fish_spawn_forest_1`) sits in the river. The river's physical boundary comes from the map tile collision layer. The object body itself is DYNAMIC and serves only as an interaction target.

## Collision Groups and Masks

These are set in `collisions-manager.js` and are NOT per-object configurable. They control WHICH objects detect collision with each other:

- `PLAYER` (group=1, mask=127) — detects collision with everything
- `OBJECT` (group=2, mask=31) — detects collision with players and other objects
- `WALL` (group=4) — used for map tile boundaries only
- `ENEMY` (group=8)
- `NPC` (group=16)

All game objects use group=2 (OBJECT) by default. The `collisionGroup` property on the object instance can override this. OBJECT (2) is the correct group for NPCs — it includes players and other objects in its collision mask. WALL (4) has a different mask designed for map tile boundaries and excludes other NPC groups.

## `collisionType` Propagation for Respawnable Objects

For respawn parent objects (class_type=7), the `private_params` JSON is inherited by child instances via `room-respawn.js`:
```javascript
let clonedObjProps = Object.assign({}, multipleObj.objProps);
```

So setting `"collisionType":2` on the respawn parent row is sufficient — all spawned children will also have `collisionType=2` on their instances.

## Constructor and DB Load Order

`BaseObject` constructor calls `mapPrivateParams(props)` which does `Object.assign(this, privateParamsObject)`, promoting all `private_params` JSON fields to instance properties. Any assignment in a subclass constructor runs after this, so subclass constructor assignments take precedence over DB values for the same property. `collisionType` and `hasState` are left to `private_params` so the DB drives them.
