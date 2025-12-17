# Colyseus 0.16 Migration Guide

Complete guide for the Colyseus 0.15 to 0.16 migration.

## Overview

The project has been upgraded from Colyseus 0.15 to 0.16. This migration introduced significant changes to state synchronization behavior and callback handling.

## Key Changes

- All client-side schema callbacks use `StateCallbacksManager` and `RoomStateEntitiesManager` wrapper classes
- Monitor API changed: `const { monitor } = require('@colyseus/monitor'); monitor()`
- Buffer polyfill required for browser bundling: `"buffer": "^6.0.3"` in package.json
- Schema upgraded to 3.0.x (backward compatible decorators)

## CRITICAL TIMING ISSUE - Async State Synchronization

Colyseus 0.16 introduced asynchronous state synchronization that differs from 0.15:

### In Colyseus 0.15
- `room.state` was immediately available when `joinOrCreate()` resolved
- Synchronous checks like `if(room.state)` always worked after join

### In Colyseus 0.16
- `room.state` synchronization is asynchronous and may not be ready immediately after `joinOrCreate()` resolves
- Synchronous checks can fail if executed too early
- Must use reactive patterns or wait for state

## Problem Pattern (WRONG)

```javascript
async joinRoom() {
    let room = await this.client.joinOrCreate('game');
    this.events.emit('reldens.joinedRoom', room);  // Fires immediately
    await this.activateRoom(room);  // Fires after
}

listenMessages(room, gameManager) {
    if(!room.state || !room.state.bodies){
        return false;  // Returns false, callbacks never set up!
    }
    this.setAddBodyCallback(room, gameManager);
    this.setRemoveBodyCallback(room);
}
```

**Why It Breaks:**
1. `reldens.joinedRoom` event fires before `room.state` is synced from server
2. Code hooked to this event runs `listenMessages()` immediately
3. Synchronous check `if(!room.state || !room.state.bodies)` returns false
4. Function returns early - callbacks never set up
5. Entities (NPCs, bullets) never receive state updates on client

## Correct Pattern (RIGHT)

```javascript
listenMessages(room, gameManager) {
    room.onMessage('*', (message) => {
        this.startObjectAnimation(message, gameManager);
        this.objectBattleEndAnimation(message, gameManager);
    });
    if(!room.state || !room.state.bodies){
        room.onStateChange.once((state) => {
            this.setAddBodyCallback(room, gameManager);
            this.setRemoveBodyCallback(room);
        });
        return false;
    }
    this.setAddBodyCallback(room, gameManager);
    this.setRemoveBodyCallback(room);
}
```

**Why It Works:**
1. If state not ready, use `room.onStateChange.once()` to wait for state sync
2. Callbacks set up reactively when state becomes available
3. If state already ready, callbacks set up immediately
4. Handles both timing scenarios correctly

## Alternative Pattern - Use Reactive Callbacks

```javascript
activateRoom(room) {
    this.playersManager = RoomStateEntitiesManager.onEntityAdd(
        room,
        'players',
        (player, key) => {
            this.handlePlayerAdded(player, key);
            this.listenPlayerChanges(player, key);
        }
    );
}
```

**Why This Works:**
- `onEntityAdd()` is reactive - triggers when entities appear in collection
- Works regardless of when state syncs
- Automatically handles timing issues
- Used by `room-events.js` for players (works correctly)

## MEMORY LEAK PREVENTION - Auto-Cleanup Behavior

### CRITICAL: Colyseus Auto-Cleans Listeners in Both 0.15 and 0.16

Colyseus automatically cleans up all listeners in these scenarios:
1. Entity removed from MapSchema collection → entity listeners cleaned
2. Room disposed → all room and state listeners cleaned
3. Client disconnects → all room listeners cleaned

## WRONG Pattern - Manual Manager Tracking (Creates Potential Memory Leaks)

```javascript
class ObjectsPlugin {
    constructor() {
        this.bodyPropertyManagers = {};  // ❌ WRONG - unnecessary tracking
    }

    setOnChangeBodyCallback(body, key, room, gameManager) {
        let bodyManager = RoomStateEntitiesManager.createManager(room);
        this.bodyPropertyManagers[key] = bodyManager;  // ❌ WRONG - storing reference
        bodyManager.listen(body, propertyKey, (newValue, previousValue) => {
            // Handle change
        });
    }

    setRemoveBodyCallback(room) {
        RoomStateEntitiesManager.onEntityRemove(room, 'bodies', (body, key) => {
            if(this.bodyPropertyManagers[key]){
                this.bodyPropertyManagers[key].dispose();  // ❌ WRONG - manual disposal
                delete this.bodyPropertyManagers[key];
            }
            this.bullets[key].destroy();
            delete this.bullets[key];
        });
    }

    disposeManagers() {
        for(let key of Object.keys(this.bodyPropertyManagers)){
            this.bodyPropertyManagers[key].dispose();  // ❌ WRONG - unnecessary
            delete this.bodyPropertyManagers[key];
        }
    }
}
```

**Why This Is Wrong:**
1. Creates property to track managers (`this.bodyPropertyManagers`)
2. Stores manager reference for each entity
3. Manually disposes managers when entities removed
4. Adds cleanup code that never existed in 0.15
5. **Colyseus already does this automatically!**
6. If cleanup code has bugs, creates memory leaks
7. Increases code complexity unnecessarily

## CORRECT Pattern - Let Colyseus Auto-Clean

```javascript
class ObjectsPlugin {
    setOnChangeBodyCallback(body, key, room, gameManager) {
        let bodyManager = RoomStateEntitiesManager.createManager(room);  // Local variable only
        let bodyProperties = Object.keys(body);
        for(let propertyKey of bodyProperties){
            bodyManager.listen(body, propertyKey, async (newValue, previousValue) => {
                // Handle property change
            });
        }
    }

    setRemoveBodyCallback(room) {
        RoomStateEntitiesManager.onEntityRemove(room, 'bodies', (body, key) => {
            if(-1 === key.indexOf('bullet') || !sc.hasOwn(this.bullets, key)){
                return false;
            }
            this.bullets[key].destroy();
            delete this.bullets[key];
        });
    }
}
```

**Why This Is Correct:**
1. Manager created as local variable - no tracking
2. No storage of manager references
3. No manual disposal code
4. Colyseus auto-cleans when:
   - Entity removed from `room.state.bodies` collection
   - Room disposed
   - Client disconnects
5. Matches 0.15 behavior exactly
6. Simpler, less code, fewer bugs

## Event Timing and Execution Order

Understanding when events fire helps prevent timing bugs:

```javascript
async joinGameRoom(roomName, selectedPlayer) {
    let joinedFirstRoom = await this.client.joinOrCreate(roomName, {
        selectedPlayer: selectedPlayer.id
    });
    await this.emitJoinedRoom(joinedFirstRoom, playerScene);  // Event 1: reldens.joinedRoom
    await this.activeRoomEvents.activateRoom(joinedFirstRoom);  // Event 2: Activate room
}
```

**Execution Order:**
1. `joinOrCreate()` resolves (state sync may not be complete yet in 0.16)
2. `reldens.joinedRoom` event fires (line 356 in game-manager.js)
   - Plugins listen to this via `events.on('reldens.joinedRoom', ...)`
   - `lib/objects/client/plugin.js:listenMessages()` called here
   - **State may not be ready at this point!**
3. `activateRoom()` called (line 359 in game-manager.js)
   - Uses reactive `onEntityAdd()` patterns
   - Works regardless of state timing
   - `lib/game/client/room-events.js` sets up player callbacks here

## Best Practices

### 1. Use Reactive Patterns When Possible
- Prefer `onEntityAdd()` over synchronous state checks
- Callbacks trigger when entities appear, regardless of timing

### 2. Wait for State If Needed
- If synchronous check required, use `room.onStateChange.once()` as fallback
- Ensures callbacks set up even if state not ready

### 3. Never Store Manager References Unless Required
- Managers are lightweight wrappers around cleanup functions
- Colyseus auto-cleans when entities removed or room disposed
- Only store if you need to explicitly call `dispose()` before entity removal

### 4. Don't Add Disposal Code That Didn't Exist in 0.15
- If it worked in 0.15 without manual cleanup, it works in 0.16
- Colyseus auto-cleanup behavior is consistent across versions
- Only difference is the callback wrapping syntax

### 5. Compare Working vs Broken Code
- Players work: Use `onEntityAdd()` in `activateRoom()` (reactive)
- Bodies broke: Used synchronous check in `listenMessages()` (timing-dependent)
- Same pattern → same behavior

## Files Affected in Migration

### Core client state management
- `lib/game/client/communication/state-callbacks-manager.js` - NEW: Wraps `getStateCallbacks()`
- `lib/game/client/communication/room-state-entities-manager.js` - NEW: Factory methods for entity callbacks
- `lib/game/client/room-events.js` - Updated: Player callback setup (working example)
- `lib/objects/client/plugin.js` - Updated: Object/body callback setup (required timing fix)

### Server monitoring
- `lib/game/server/server.js` - Updated: Monitor API changed in 0.16

### Build configuration
- `package.json` - Added: `"buffer": "^6.0.3"` dependency for Parcel bundling
- `theme/default/package.json` - Added: buffer dependency in theme

## Common Migration Mistakes

1. ❌ Forgetting to wait for state when using synchronous checks
2. ❌ Adding unnecessary manager tracking properties
3. ❌ Creating manual disposal code that Colyseus handles automatically
4. ❌ Storing manager references when not needed
5. ❌ Not using reactive patterns (`onEntityAdd`, `onEntityRemove`)
6. ❌ Assuming 0.16 has same synchronous state behavior as 0.15

## Correct Migration Checklist

1. ✅ Wrap all schema callbacks with `StateCallbacksManager` or `RoomStateEntitiesManager`
2. ✅ Use reactive patterns (`onEntityAdd`) when possible
3. ✅ Add `room.onStateChange.once()` fallback for synchronous state checks
4. ✅ Keep managers as local variables unless explicit disposal needed
5. ✅ Remove manual cleanup code added during migration (Colyseus auto-cleans)
6. ✅ Test entity addition, removal, and room reconnection
7. ✅ Verify no memory leaks with Chrome DevTools Memory Profiler

## State Synchronization

- Server uses Colyseus Schema for state (see `lib/rooms/server/state.js`)
- Client uses `StateCallbacksManager` and `RoomStateEntitiesManager` for Colyseus 0.16 callback handling
- All schema callbacks require `getStateCallbacks(room)` wrapper in Colyseus 0.16
- Manager classes located in `lib/game/client/communication/`:
  - `state-callbacks-manager.js` - Wraps `getStateCallbacks()`, provides `onAdd()`, `onRemove()`, `onChange()`, `listen()` methods
  - `room-state-entities-manager.js` - Static factory methods for common entity callback patterns
- **CRITICAL**: Collections from `wrappedState[collectionName]` are already wrapped - don't wrap again
- **CRITICAL**: Entities received in callbacks must be wrapped before calling `listen()`
- Players, objects, and world state auto-sync to clients
