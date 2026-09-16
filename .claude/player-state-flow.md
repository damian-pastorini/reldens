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
    // ← Last SAVED room
    room_id: number,
    // ← Last SAVED position
    x: number,
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
  // ← Selected from related_players[]
  player: PlayersModel {
    ...database fields,
    // Database snapshot
    related_players_state: { ... },

    // ADDED AT RUNTIME: login state used to build the room player schema
    state: {
      // ← Room loaded from the database (or from the scene selected on login)
      room_id: number,
      // ← Position loaded from the database
      x: number,
      y: number,
      dir: string,
      // ← ADDED: Room name (not in database!)
      scene: string
    }
  }
}
```

**Key Points:**
- `userModel.player` is **assigned at runtime** from `related_players[]`
- `player.state` is **created during login** and is not updated during gameplay (the room updates `playerSchema.state` instead)
- `player.state.scene` is **added by server**, not from database
- `player.state` is the **same object** as `player.related_players_state` unless `applySelectedLocation()` replaces it

---

## Complete Login Flow

### Step 1: User Authentication

**File:** `lib/rooms/server/login.js:71-108` (onAuth)

```javascript
async onAuth(client, options, request) {
    // Load user from database
    let loginResult = await this.loginManager.processUserRequest(options);

    // Select player if specified
    if(sc.hasOwn(options, 'selectedPlayer')){
        loginResult.selectedPlayer = options.selectedPlayer;
        loginResult.user.player = this.getPlayerByIdFromArray(
            loginResult.user.related_players,  // ← From database array
            options.selectedPlayer
        );
    }

    // ← The returned user becomes userModel in onJoin
    return await this.disconnectFromOtherServers(loginResult.user, options);
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
- The Knex driver returns plain row objects, so `player.state` and `player.related_players_state` are the **same mutable object**
- **Result:** the `scene` added in Step 4 is visible on both; they only become different objects when `applySelectedLocation()` replaces `player.state`

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

**File:** `lib/rooms/server/login.js:90-93`

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

**File:** `lib/rooms/server/scene.js:128-159`

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
- `related_players_state` in current session is NEVER updated after login (remains stale)

---

## Data Flow Diagram

**Step 1: DATABASE (players_state table)**
- room_id: 4, x: 400, y: 345, dir: 'down'
- (NO scene property)

**Step 2: LOAD - UsersManager.loadUserByUsername()**
- related_players[].related_players_state = database snapshot

**Step 3: MAP - LoginManager.mapPlayerStateRelation()**
- player.state = player.related_players_state
- (Assignment creates runtime state)

**Step 4: ENHANCE - LoginManager.setSceneOnPlayers()**
- player.state.scene = getRoomNameById(player.state.room_id)
- (Adds scene property to runtime state)

**Step 5: SELECT - RoomLogin.onAuth()**
- userModel.player = getPlayerByIdFromArray(...)
- (Assigns selected player to userModel.player)

**Step 6: VALIDATE - RoomScene.onJoin()**
- Check: userModel.player.state exists
- Validate: userModel.player.state.scene matches room

**Step 7: GAMEPLAY - Player moves, changes scenes**
- Updates: playerSchema.state (runtime)
- Unchanged: player.related_players_state (stale)

**Step 8: SAVE - RoomScene.savePlayerState()**
- Read FROM: playerSchema.state (current position)
- Write TO: database players_state table
- (Becomes related_players_state on next login)

---

## State Divergence

After login, you have **TWO sources of state** that diverge:

### Example Session:

**Initial Login:** `userModel.player.state` is the same object as `userModel.player.related_players_state`, with `scene` added on top of it:
```javascript
userModel.player.state = {
  // Town (from database)
  room_id: 4,
  x: 400,
  y: 345,
  dir: 'down',
  // Added by server
  scene: 'reldens-town'
}
```

**After Scene Change (player moves to house):** the room updates the Colyseus schema built from that state in `Player` (`lib/users/server/player.js:38`, `new BodyState(player.state)`), not `player.state` itself:
```javascript
// UNCHANGED for the whole session:
userModel.player.state = {
  room_id: 4,
  x: 400,
  y: 345,
  dir: 'down',
  scene: 'reldens-town'
}

// UPDATED during gameplay:
playerSchema.state = {
  room_id: 2,
  x: 548,
  y: 615,
  dir: 'up',
  scene: 'reldens-house-1'
}
```

**On Logout:** `playerSchema.state` is saved to database, becomes `related_players_state` on next login.

---

## Key Takeaways

1. **"related_" prefix is the NEW database relation naming** (not legacy)
2. **`related_players_state`** = Database snapshot loaded on login (the `players_state` table has no scene column)
3. **`player.state`** = Login state (has scene property, used to build the room player schema)
4. **`scene` property** = Only added at runtime, NOT in the database model
5. **Validation must use** `player.state.scene`, NOT `player.related_players_state.scene`
6. **Database updates** read from `playerSchema.state` and write to `players_state` table
7. **`player.state` is never updated** during gameplay (the room updates `playerSchema.state`)

---

## Code References

**Key Files:**
- `lib/users/server/manager.js:67-83` - Load user with relations
- `lib/game/server/login-manager.js:351-361` - Map player state relation
- `lib/game/server/login-manager.js:423-441` - Set scene on players
- `lib/rooms/server/login.js:71-108` - Authentication and player selection
- `lib/rooms/server/scene.js:128-159` - Scene validation
- `lib/rooms/server/scene.js:708-737` - Save player state

**Database Tables:**
- `users` - User accounts
- `players` - Player characters
- `players_state` - Player positions (becomes `related_players_state` when loaded)

**Entity Relations:**
- `UsersModel.related_players` relates to `PlayersModel[]`
- `PlayersModel.related_players_state` relates to `PlayersStateModel`
