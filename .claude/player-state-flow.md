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
  // Array of all players for this user
  related_players: PlayersModel[]
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
    // Last SAVED room
    room_id: number,
    // Last SAVED position
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
  // From database
  related_players: PlayersModel[],

  // ADDED AT RUNTIME: Selected player reference
  // Selected from related_players[]
  player: PlayersModel {
    ...database fields,
    // Database snapshot
    related_players_state: { ... },

    // ADDED AT RUNTIME: login state used to build the room player schema
    state: {
      // Room loaded from the database (or from the scene selected on login)
      room_id: number,
      // Position loaded from the database
      x: number,
      y: number,
      dir: string,
      // ADDED: Room name (not in database!)
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

**File:** `lib/rooms/server/login.js` (`RoomLogin.onAuth`)

After validating the options, the request origin and the joins limit, `onAuth` loads and validates the user through the login manager:

```javascript
let loginResult = await this.loginManager.processUserRequest(options, requestAddress);
if(sc.hasOwn(loginResult, 'error')){
    // @TODO - BETA - Improve login errors, use send message with type and here just return false.
    ErrorManager.error(loginResult.error);
}
```

Then it selects the player (Step 5), emits `reldens.roomLoginOnAuth`, and returns the user, which becomes the `userModel` received by `onJoin`:

```javascript
return await this.disconnectFromOtherServers(loginResult.user);
```

### Step 2: Load User From Database

**File:** `lib/users/server/manager.js` (`UsersManager.loadUserByUsername`, which calls `UsersManager.loadUserByProperty`)

`LoginManager.processReservedUserRequest` calls `this.usersManager.loadUserByUsername(userData.username)`, and `loadUserByProperty` loads the players WITH their state from the database:

```javascript
let loadedUser = await this.usersRepository.loadOneByWithRelations(
    propertyKey,
    propertyValue,
    ['related_users_login', 'related_players.related_players_state']
);
```

**Result:** User loaded with `related_players[]` array, each player has `related_players_state` from database.

### Step 3: Map Player State Relation

**File:** `lib/game/server/login-manager.js` (`LoginManager.mapPlayerStateRelation`)

`LoginManager.login` runs steps 3 and 4 after the password validation, when the user has players:

```javascript
if(sc.isArray(user.related_players) && 0 < user.related_players.length){
    this.mapPlayerStateRelation(user);
    // set the scene on the user players:
    this.events.emitSync('reldens.setSceneOnPlayers', this, user, userData);
    await this.setSceneOnPlayers(user, userData);
}
```

```javascript
mapPlayerStateRelation(user)
{
    if(!sc.isArray(user.related_players)){
        return;
    }
    for(let player of user.related_players){
        if(player.related_players_state && !player.state){
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

**File:** `lib/game/server/login-manager.js` (`LoginManager.setSceneOnPlayers`)

When the scene selection on login is allowed and a valid scene was selected, `applySelectedLocation` replaces `player.state`; then the `scene` property is ADDED to the state (it is not in the database):

```javascript
for(let player of user.related_players){
    //Logger.debug('Player state:', player);
    if(!player.state){
        continue;
    }
    let config = this.config.get('client/rooms/selection');
    if(
        config.allowOnLogin
        && userData['selectedScene']
        && userData['selectedScene'] !== RoomsConst.ROOM_LAST_LOCATION_KEY
        && this.roomsManager.loginAvailableRooms.some(room => room.name === userData['selectedScene'])
    ){
        await this.applySelectedLocation(player, userData['selectedScene']);
    }
    //Logger.debug('Get room name by ID. Player state:', player.state);
    player.state.scene = await this.playerRoomState.getRoomNameById(player.state.room_id);
}
```

**Result:** Each player now has `player.state.scene` with the room name string.

### Step 5: Select Player (Runtime Assignment)

**File:** `lib/rooms/server/login.js` (`RoomLogin.onAuth`, an id that is not in the `related_players` array rejects the login)

```javascript
if(sc.hasOwn(options, 'selectedPlayer')){
    let playerModel = sc.fetchByProperty(loginResult.user.related_players, 'id', options.selectedPlayer);
    if(!playerModel){
        Logger.warning('Auth invalid selected player.', {username: loginResult.user.username});
        ErrorManager.error(GameConst.INVALID_LOGIN_MESSAGE);
    }
    loginResult.selectedPlayer = options.selectedPlayer;
    loginResult.user.player = playerModel;
}
```

**Result:** `userModel.player` now references ONE player from the array with both:
- `player.related_players_state` (database snapshot)
- `player.state` (runtime state with scene)

---

## Gameplay Flow

### Joining Scene Room

**File:** `lib/rooms/server/scene.js` (`RoomScene.onJoin`)

`onJoin` selects the player again from `options.selectedPlayer` and validates the RUNTIME state (not the database state): a missing state, an invalid room or a scene that is not this room rejects the join with `GameConst.JOIN_GAME_ERROR_MESSAGE`:

```javascript
if(sc.hasOwn(options, 'selectedPlayer')){
    userModel.selectedPlayer = options.selectedPlayer;
    userModel.player = sc.fetchByProperty(userModel.related_players, 'id', options.selectedPlayer);
}
let isGuest = this.loginManager.isGuestUser(userModel);
if(this.validateRoomData){
    // @NOTE: here we use userModel.player.state since it is the runtime dynamic data applied on the userModel.
    if(!userModel.player?.state){
        Logger.warning('Missing user player state.', {userId: userModel.id, username: userModel.username});
        ErrorManager.error(GameConst.JOIN_GAME_ERROR_MESSAGE);
    }
    if(!this.validateRoom(userModel.player.state.scene, isGuest)){
        await this.events.emit('reldens.joinRoomInvalid', this, client, options, userModel, isGuest);
        ErrorManager.error(GameConst.JOIN_GAME_ERROR_MESSAGE);
    }
    if(userModel.player.state.scene !== this.roomName){
        Logger.warning(
            'Player scene "'+userModel.player.state.scene+'" does not match room "'+this.roomName+'".'
        );
        await this.events.emit('reldens.joinRoomInvalid', this, client, options, userModel, isGuest);
        ErrorManager.error(GameConst.JOIN_GAME_ERROR_MESSAGE);
    }
}
```

After the validation `createPlayerOnScene` creates the player schema in the room.

**FIX APPLIED:** Changed from `related_players_state.scene` (doesn't exist) to `state.scene` (exists).

### Saving Player State During Gameplay

**File:** `lib/rooms/server/scene.js` (`RoomScene.savePlayerState`)

The CURRENT position is read from the runtime `playerSchema.state`, NOT from `related_players_state`:

```javascript
let playerSchema = this.playerBySessionIdFromState(sessionId);
let {room_id, x, y, dir} = playerSchema.state;
let playerId = playerSchema.player_id;
let updatePatch = {room_id, x: parseInt(x), y: parseInt(y), dir};
```

After the `reldens.onSavePlayerStateBefore` event (a listener can stop the update), the database is updated with the CURRENT position:

```javascript
updateResult = await this.loginManager.usersManager.updateUserStateByPlayerId(playerId, updatePatch);
```

**Key Points:**
- Database updated FROM `playerSchema.state` (runtime)
- Database updated TO `players_state` table (will become `related_players_state` on next login)
- `related_players_state` in current session is NEVER updated after login (remains stale)

---

## Data Flow Diagram

**Step 1: DATABASE (players_state table)**
- room_id: 41, x: 1520, y: 1424, dir: 'down'
- (NO scene property)

**Step 2: LOAD - UsersManager.loadUserByUsername()**
- loadUserByProperty() loads the related_users_login and related_players.related_players_state relations
- related_players[].related_players_state = database snapshot

**Step 3: MAP - LoginManager.mapPlayerStateRelation()**
- player.state = player.related_players_state
- (Assignment creates runtime state)

**Step 4: ENHANCE - LoginManager.setSceneOnPlayers()**
- player.state.scene = PlayerRoomState.getRoomNameById(player.state.room_id)
- (Adds scene property to runtime state)

**Step 5: SELECT - RoomLogin.onAuth()**
- userModel.player = sc.fetchByProperty(related_players, 'id', selectedPlayer)
- (Assigns selected player to userModel.player)

**Step 6: VALIDATE - RoomScene.onJoin()**
- Re-select: userModel.player from options.selectedPlayer
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
  room_id: 41,
  x: 1520,
  y: 1424,
  dir: 'down',
  // Added by server
  scene: 'reldens-new-age-town'
}
```

**After Scene Change (player moves to house):** the room updates the Colyseus schema built from that state in the `Player` constructor (`lib/users/server/player.js`, `this.state = new BodyState(player.state)`), not `player.state` itself:
```javascript
// UNCHANGED for the whole session:
userModel.player.state = {
  room_id: 41,
  x: 1520,
  y: 1424,
  dir: 'down',
  scene: 'reldens-new-age-town'
}

// UPDATED during gameplay:
playerSchema.state = {
  room_id: 2,
  x: 528,
  y: 624,
  dir: 'down',
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
- `lib/users/server/manager.js` (`UsersManager.loadUserByUsername`, `UsersManager.loadUserByProperty`) - Load user with relations
- `lib/game/server/login-manager.js` (`LoginManager.mapPlayerStateRelation`) - Map player state relation
- `lib/game/server/login-manager.js` (`LoginManager.setSceneOnPlayers`) - Set scene on players
- `lib/rooms/server/login.js` (`RoomLogin.onAuth`) - Authentication and player selection
- `lib/rooms/server/scene.js` (`RoomScene.onJoin`) - Scene validation
- `lib/rooms/server/scene.js` (`RoomScene.savePlayerState`) - Save player state

**Database Tables:**
- `users` - User accounts
- `players` - Player characters
- `players_state` - Player positions (becomes `related_players_state` when loaded)

**Entity Relations:**
- `UsersModel.related_players` relates to `PlayersModel[]`
- `PlayersModel.related_players_state` relates to `PlayersStateModel`
