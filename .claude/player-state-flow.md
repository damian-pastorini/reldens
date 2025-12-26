# Player State Flow - Complete Technical Guide

## Overview

This document explains the complete player state management system in Reldens, including the database entity refactor that introduced the "related_" naming convention, and how player state flows from database to runtime.

---

## Architecture Layers

### 1. Database Layer (Persistent Storage)

After the entity refactor, all database relations use the **"related_" prefix** (this is the NEW/CURRENT convention, NOT legacy):

```javascript
UsersModel {
  id: number,
  email: string,
  username: string,
  password: string,
  role_id: number,

  // NEW: Database relations with "related_" prefix
  related_users_login: UsersLoginModel[],
  related_players: PlayersModel[]  // ← Array of all players for this user
}

PlayersModel {
  id: number,
  user_id: number,
  name: string,
  created_at: Date,
  updated_at: Date,

  // NEW: Player state from database (persistent)
  related_players_state: PlayersStateModel {
    id: number,
    player_id: number,
    room_id: number,    // ← Last SAVED room
    x: number,          // ← Last SAVED position
    y: number,
    dir: string
    // NOTE: NO scene property in database model!
  }
}
```

**Key Points:**
- `related_players` is an **array** (users can have multiple characters)
- `related_players_state` is the **database snapshot** of player position
- Database model does NOT include `scene` property (only `room_id`)

---

### 2. Runtime Layer (In-Memory During Gameplay)

During login and gameplay, additional properties are added for runtime state management:

```javascript
// After login processing:
userModel {
  ...database fields,
  related_players: PlayersModel[],  // From database

  // ADDED AT RUNTIME: Selected player reference
  player: PlayersModel {             // ← Selected from related_players[]
    ...database fields,
    related_players_state: { ... },  // Database snapshot

    // ADDED AT RUNTIME: Enhanced runtime state
    state: {
      room_id: number,    // ← CURRENT room (updated during gameplay)
      x: number,          // ← CURRENT position
      y: number,
      dir: string,
      scene: string       // ← ADDED: Room name (not in database!)
    }
  }
}
```

**Key Points:**
- `userModel.player` is **assigned at runtime** from `related_players[]`
- `player.state` is **created during login** and updated during gameplay
- `player.state.scene` is **added by server**, not from database
- `related_players_state` remains **unchanged** after initial load (becomes stale)

---

## Complete Login Flow

### Step 1: User Authentication

**File:** `lib/rooms/server/login.js:70-107` (onAuth)

```javascript
async onAuth(client, options, request) {
    // Load user from database
    let loginResult = await this.loginManager.processUserRequest(options);

    // Select player if specified
    if(sc.hasOwn(options, 'selectedPlayer')){
        loginResult.user.player = this.getPlayerByIdFromArray(
            loginResult.user.related_players,  // ← From database array
            options.selectedPlayer
        );
    }

    return loginResult.user;  // ← Becomes userModel in onJoin
}
```

### Step 2: Load User From Database

**File:** `lib/users/server/manager.js:67-83`

```javascript
async loadUserByUsername(username) {
    let loadedUser = await this.usersRepository.loadOneByWithRelations(
        'username',
        username,
        ['related_users_login', 'related_players.related_players_state']
        //                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        //                        Loads players WITH their state from DB
    );
    return loadedUser;
}
```

**Result:** User loaded with `related_players[]` array, each player has `related_players_state` from database.

### Step 3: Map Player State Relation

**File:** `lib/game/server/login-manager.js:351-361`

```javascript
mapPlayerStateRelation(user) {
    if(!sc.isArray(user.related_players)){
        return;
    }
    for(let player of user.related_players){
        if(player.related_players_state && !player.state){
            // Create runtime state from database state
            player.state = player.related_players_state;
        }
    }
}
```

**CRITICAL:** This creates `player.state` by assigning `player.related_players_state`.

**Question:** Is this assignment by reference or copy?
- In JavaScript, object assignment is **by reference**
- BUT: Database ORM models might be immutable/frozen
- **Result:** They can diverge during gameplay

### Step 4: Set Scene On Players

**File:** `lib/game/server/login-manager.js:423-441`

```javascript
async setSceneOnPlayers(user, userData) {
    for(let player of user.related_players){
        if(!player.state){
            continue;
        }

        // Check if user selected a different scene on login
        let config = this.config.get('client/rooms/selection');
        if(config.allowOnLogin && userData['selectedScene'] &&
           userData['selectedScene'] !== RoomsConst.ROOM_LAST_LOCATION_KEY){
            await this.applySelectedLocation(player, userData['selectedScene']);
        }

        // CRITICAL: Add scene property to state
        player.state.scene = await this.getRoomNameById(player.state.room_id);
        //           ^^^^^ ADDED HERE - not in database!
    }
}
```

**Result:** Each player now has `player.state.scene` with the room name string.

### Step 5: Select Player (Runtime Assignment)

**File:** `lib/rooms/server/login.js:89-91`

```javascript
if(sc.hasOwn(options, 'selectedPlayer')){
    loginResult.user.player = this.getPlayerByIdFromArray(
        loginResult.user.related_players,
        options.selectedPlayer
    );
}
```

**Result:** `userModel.player` now references ONE player from the array with both:
- `player.related_players_state` (database snapshot)
- `player.state` (runtime state with scene)

---

## Gameplay Flow

### Joining Scene Room

**File:** `lib/rooms/server/scene.js:126-156`

```javascript
async onJoin(client, options, userModel) {
    // userModel already has player selected from onAuth

    // Validate using RUNTIME state (not database state!)
    if(this.validateRoomData){
        if(!userModel.player.state){  // ← Check runtime state exists
            Logger.warning('Missing user player state.', userModel);
            return false;
        }
        if(!this.validateRoom(userModel.player.state.scene, isGuest)){
            //                            ^^^^^ Use runtime state with scene!
            return false;
        }
    }

    // Create player schema in room...
}
```

**FIX APPLIED:** Changed from `related_players_state.scene` (doesn't exist) to `state.scene` (exists).

### Saving Player State During Gameplay

**File:** `lib/rooms/server/scene.js:708-737`

```javascript
async savePlayerState(sessionId) {
    let playerSchema = this.playerBySessionIdFromState(sessionId);

    // Extract CURRENT position from runtime state
    let {room_id, x, y, dir} = playerSchema.state;  // ← From state, NOT related_players_state
    let playerId = playerSchema.player_id;
    let updatePatch = {room_id, x: parseInt(x), y: parseInt(y), dir};

    // Update database with CURRENT position
    updateResult = await this.loginManager.usersManager.updateUserStateByPlayerId(
        playerId,
        updatePatch
    );

    return playerSchema;
}
```

**Key Points:**
- Database updated FROM `playerSchema.state` (runtime)
- Database updated TO `players_state` table (will become `related_players_state` on next login)
- `related_players_state` in current session is NEVER updated (remains stale)

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. DATABASE (players_state table)                              │
│    room_id: 4, x: 400, y: 345, dir: 'down'                     │
│    (NO scene property)                                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. LOAD: UsersManager.loadUserByUsername()                     │
│    related_players[].related_players_state = database snapshot │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. MAP: LoginManager.mapPlayerStateRelation()                  │
│    player.state = player.related_players_state                 │
│    (Assignment creates runtime state)                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. ENHANCE: LoginManager.setSceneOnPlayers()                   │
│    player.state.scene = getRoomNameById(player.state.room_id)  │
│    (Adds scene property to runtime state)                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. SELECT: RoomLogin.onAuth()                                  │
│    userModel.player = getPlayerByIdFromArray(...)              │
│    (Assigns selected player to userModel.player)               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. VALIDATE: RoomScene.onJoin()                                │
│    Check: userModel.player.state exists                        │
│    Validate: userModel.player.state.scene matches room         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. GAMEPLAY: Player moves, changes scenes                      │
│    Updates: playerSchema.state (runtime)                       │
│    Unchanged: player.related_players_state (stale)             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. SAVE: RoomScene.savePlayerState()                           │
│    Read FROM: playerSchema.state (current position)            │
│    Write TO: database players_state table                      │
│    (Becomes related_players_state on next login)               │
└─────────────────────────────────────────────────────────────────┘
```

---

## State Divergence

After login, you have **TWO sources of state** that can diverge:

### Example Session:

**Initial Login:**
```javascript
userModel.player.related_players_state = {
  room_id: 4,  // Town (from database)
  x: 400,
  y: 345,
  dir: 'down'
}

userModel.player.state = {
  room_id: 4,  // Same as database
  x: 400,
  y: 345,
  dir: 'down',
  scene: 'reldens-town'  // Added by server
}
```

**After Scene Change (player moves to house):**
```javascript
userModel.player.related_players_state = {
  room_id: 4,  // UNCHANGED (stale)
  x: 400,
  y: 345,
  dir: 'down'
}

userModel.player.state = {
  room_id: 2,  // UPDATED to house
  x: 548,
  y: 615,
  dir: 'up',
  scene: 'reldens-house-1'  // UPDATED
}
```

**On Logout:** `state` is saved to database, becomes `related_players_state` on next login.

---

## The Bug and Fix

### Original Bug (scene.js:140-144)

```javascript
if(this.validateRoomData){
    if(!userModel.player.related_players_state){  // ❌ Checking database state
        Logger.warning('Missing user player state.', userModel);
        return false;
    }
    if(!this.validateRoom(userModel.player.related_players_state.scene, isGuest)){
        //                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        //                            ❌ related_players_state has NO scene property!
        return false;
    }
}
```

**Result:** `related_players_state.scene` is `undefined`, validation fails with "Invalid room for guest: undefined"

### The Fix (scene.js:140-144)

```javascript
if(this.validateRoomData){
    if(!userModel.player.state){  // ✅ Check runtime state
        Logger.warning('Missing user player state.', userModel);
        return false;
    }
    if(!this.validateRoom(userModel.player.state.scene, isGuest)){
        //                            ^^^^^^^^^^^
        //                            ✅ Runtime state HAS scene property!
        return false;
    }
}
```

**Result:** Validation uses `state.scene` which exists and contains the correct room name.

---

## Key Takeaways

1. **"related_" prefix is the NEW database relation naming** (not legacy)
2. **`related_players_state`** = Database snapshot (stale after load, no scene property)
3. **`state`** = Runtime state (active, has scene property, source of truth for gameplay)
4. **`scene` property** = Only exists in runtime `state`, NOT in database model
5. **Validation must use** `player.state.scene`, NOT `player.related_players_state.scene`
6. **Database updates** read from `state` and write to `players_state` table
7. **`related_players_state` is never updated** during a session (snapshot only)

---

## Code References

**Key Files:**
- `lib/users/server/manager.js:67-83` - Load user with relations
- `lib/game/server/login-manager.js:351-361` - Map player state relation
- `lib/game/server/login-manager.js:423-441` - Set scene on players
- `lib/rooms/server/login.js:70-107` - Authentication and player selection
- `lib/rooms/server/scene.js:126-156` - Scene validation (FIX LOCATION)
- `lib/rooms/server/scene.js:708-737` - Save player state

**Database Tables:**
- `users` - User accounts
- `players` - Player characters
- `players_state` - Player positions (becomes `related_players_state` when loaded)

**Entity Relations:**
- `UsersModel.related_players` → `PlayersModel[]`
- `PlayersModel.related_players_state` → `PlayersStateModel`
