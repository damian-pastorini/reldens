# Guest System Technical Guide

## Overview

The guest system allows anonymous players to join the game without registration. This document explains the complete technical flow from database configuration to client-side form activation.

---

## 1. Database Configuration

### Rooms Table - `customData` Field

Each room can be marked as guest-accessible via the `customData` JSON field:

```json
{
  "allowGuest": true
}
```

**Location:** `rooms` table → `customData` column

**Example SQL:**
```sql
UPDATE rooms SET customData = '{"allowGuest": true}' WHERE name = 'town';
```

---

## 2. Server-Side Flow

### 2.1 Rooms Loading (`lib/rooms/server/manager.js`)

**Method:** `loadRooms()` (lines 204-241)

```javascript
async loadRooms(){
    let roomsModels = await this.dataServer.getEntity('rooms').loadAllWithRelations([...]);

    // Process each room
    for(let room of roomsModels){
        let roomModel = this.generateRoomModel(room);
        rooms.push(roomModel);
        roomsById[room.id] = roomModel;
        roomsByName[room.name] = roomModel;
    }

    // Filter guest rooms
    this.availableRoomsGuest = this.filterGuestRooms(roomsByName);

    // Create room lists for registration and login
    let registrationRooms = this.filterRooms(true);
    this.registrationAvailableRooms = this.extractRoomDataForSelector(registrationRooms);
    this.registrationAvailableRoomsGuest = this.extractRoomDataForSelector(
        this.fetchGuestRooms(registrationRooms)
    );

    let loginRooms = this.filterRooms(false);
    this.loginAvailableRooms = this.extractRoomDataForSelector(loginRooms);
    this.loginAvailableRoomsGuest = this.extractRoomDataForSelector(
        this.fetchGuestRooms(loginRooms)
    );

    return this.loadedRooms;
}
```

### 2.2 Guest Room Filtering (`lib/rooms/server/manager.js`)

**Method:** `filterGuestRooms()` (line 415+)

```javascript
filterGuestRooms(availableRooms){
    let guestRooms = {};
    for(let roomName of Object.keys(availableRooms)){
        let room = availableRooms[roomName];
        let customData = sc.get(room, 'customData', {});
        if(sc.isString(customData)){
            customData = JSON.parse(customData);
        }
        // Check if allowGuest is true
        if(sc.get(customData, 'allowGuest')){
            guestRooms[roomName] = room;
        }
    }
    return guestRooms;
}
```

**Method:** `fetchGuestRooms()` (line 403+)

```javascript
fetchGuestRooms(availableRooms){
    // Check global setting
    if(this.allowGuestOnRooms){
        return availableRooms; // All rooms allow guests
    }
    // Filter by room-specific allowGuest
    return this.filterGuestRooms(availableRooms);
}
```

**Global Setting:**
- Config path: `server/players/guestUser/allowOnRooms`
- Default: `true`
- If `true`, all rooms allow guests
- If `false`, only rooms with `customData.allowGuest = true` allow guests

### 2.3 Config Assignment (`lib/rooms/server/manager.js`)

**Method:** `defineRoomsInGameServer()` (lines 109-116)

```javascript
// After all rooms are loaded and defined
if(this.config.client?.rooms?.selection){
    this.config.client.rooms.selection.availableRooms = {
        registration: this.registrationAvailableRooms,
        registrationGuest: this.registrationAvailableRoomsGuest,  // ← Guest rooms here
        login: this.loginAvailableRooms,
        loginGuest: this.loginAvailableRoomsGuest                 // ← Guest rooms here
    };
}
```

**Called by:** `ServerManager.defineServerRooms()` → `RoomsManager.defineRoomsInGameServer()`

---

## 3. Config File Generation

### 3.1 Timing (CRITICAL)

**File:** `lib/game/server/manager.js`

**Execution order:**
1. `initializeManagers()` (line 261-263)
   - Calls `defineServerRooms()`
   - Guest rooms configured in `this.configManager.client.rooms.selection.availableRooms`
2. **Config file created** (line 264-272)
   - `HomepageLoader.createConfigFile()` with guest rooms data
3. **Client built** (line 272)
   - Bundles config.js into dist folder

### 3.2 Config File Creation (`lib/game/server/homepage-loader.js`)

**Method:** `createConfigFile()` (lines 51-62)

```javascript
static createConfigFile(projectThemePath, initialConfiguration){
    let configFilePath = FileHandler.joinPaths(projectThemePath, 'config.js');
    let configFileContents = 'window.reldensInitialConfig = '+JSON.stringify(initialConfiguration)+';';
    let writeResult = FileHandler.writeFile(configFilePath, configFileContents);
    if(!writeResult){
        Logger.error('Failed to write config file: '+configFilePath);
        return false;
    }
    Logger.info('Config file created: '+configFilePath);
    return true;
}
```

**Output file:** `theme/config.js`

**Content structure:**
```javascript
window.reldensInitialConfig = {
    gameEngine: { /* ... */ },
    client: {
        rooms: {
            selection: {
                availableRooms: {
                    registration: { /* normal rooms */ },
                    registrationGuest: { /* guest-allowed rooms */ },  // ← KEY DATA
                    login: { /* normal rooms */ },
                    loginGuest: { /* guest-allowed rooms */ }          // ← KEY DATA
                }
            }
        }
    }
};
```

---

## 4. Client-Side Flow

### 4.1 Config Loading (`lib/game/client/game-manager.js`)

**Constructor** (line 48-94)

```javascript
constructor(){
    this.config = new ConfigManager();
    let initialConfig = this.gameDom.getWindow()?.reldensInitialConfig || {};
    sc.deepMergeProperties(this.config, initialConfig);  // ← Loads from window.reldensInitialConfig
    // ...
}
```

**Data source:** `window.reldensInitialConfig` from `theme/config.js`

### 4.2 Client Start (`lib/game/client/handlers/client-start-handler.js`)

**Method:** `clientStart()` (line 30-53)

```javascript
clientStart(){
    let registrationForm = new RegistrationFormHandler(this.gameManager);
    registrationForm.activateRegistration();

    let guestForm = new GuestFormHandler(this.gameManager);  // ← Guest handler
    guestForm.activateGuest();                               // ← Activates guest form

    // ... other handlers
}
```

**Called by:** `GameManager.clientStart()` on `DOMContentLoaded`

### 4.3 Guest Form Activation (`lib/game/client/handlers/guest-form-handler.js`)

**Method:** `activateGuest()` (lines 34-72)

```javascript
activateGuest(){
    if(!this.form){
        return false;
    }

    // Get guest rooms from config
    let availableGuestRooms = this.gameManager.config.getWithoutLogs(
        'client/rooms/selection/availableRooms/registrationGuest',  // ← Config path
        {}
    );

    // Check if guest login is allowed AND guest rooms exist
    if(
        !this.gameManager.config.get('client/general/users/allowGuest')
        || 0 === Object.keys(availableGuestRooms).length  // ← CRITICAL CHECK
    ){
        this.form.classList.add('hidden');  // ← HIDE FORM
        return true;
    }

    // Form is visible, activate submit handler
    this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        if(!this.form.checkValidity()){
            return false;
        }
        this.form.querySelector(selectors.LOADING_CONTAINER).classList.remove(GameConst.CLASSES.HIDDEN);
        let randomGuestName = 'guest-'+sc.randomChars(12);
        let userName = this.gameManager.config.getWithoutLogs('client/general/users/allowGuestUserName', false)
            ? this.gameDom.getElement(selectors.GUEST.USERNAME).value
            : randomGuestName;
        let formData = {
            formId: this.form.id,
            username: userName,
            password: userName,
            rePassword: userName,
            isGuest: true
        };
        this.gameManager.startGame(formData, true);
    });

    return true;
}
```

**Form element:** `#guest-form` in `theme/default/index.html`

**Key logic:**
- If `availableGuestRooms` is empty → form hidden
- If `client/general/users/allowGuest` is false → form hidden
- Otherwise → form visible and functional

---

## 5. Complete Flow Diagram

**Step 1: DATABASE (rooms table)**
- customData: {"allowGuest": true}

**Step 2: SERVER - RoomsManager.loadRooms()**
- Loads all rooms from database
- Calls filterGuestRooms() to identify guest-allowed rooms
- Creates registrationAvailableRoomsGuest list

**Step 3: SERVER - RoomsManager.defineRoomsInGameServer()**
- Assigns guest rooms to config:
- config.client.rooms.selection.availableRooms = {
  - registrationGuest: [...],
  - loginGuest: [...]
- }

**Step 4: SERVER - ServerManager.startGameServerInstance()**
- After initializeManagers() completes
- Calls HomepageLoader.createConfigFile()
- Writes theme/config.js with guest rooms data
- Calls themeManager.buildClient()
- Bundles config.js into dist/

**Step 5: CLIENT - Browser loads theme/default/index.html**
- Includes script src="config.js"
- Sets window.reldensInitialConfig

**Step 6: CLIENT - GameManager constructor**
- Reads window.reldensInitialConfig
- Merges into this.config

**Step 7: CLIENT - ClientStartHandler.clientStart()**
- Creates GuestFormHandler
- Calls activateGuest()

**Step 8: CLIENT - GuestFormHandler.activateGuest()**
- Reads config.get('client/rooms/selection/availableRooms/registrationGuest')
- If empty → HIDE form
- If not empty → SHOW form and attach submit handler

---

## 6. Configuration Options

### Server-Side Configs

**Path:** `server/players/guestUser/allowOnRooms`
- **Type:** Boolean
- **Default:** `true`
- **Effect:** If `true`, all rooms allow guests (ignores `customData.allowGuest`)

**Path:** `server/players/guestsUser/emailDomain`
- **Type:** String
- **Default:** `@guest-reldens.com`
- **Effect:** Email domain for guest accounts

### Client-Side Configs

**Path:** `client/general/users/allowGuest`
- **Type:** Boolean
- **Default:** Set from server config
- **Effect:** Master switch for guest login feature

**Path:** `client/general/users/allowGuestUserName`
- **Type:** Boolean
- **Default:** `false`
- **Effect:** If `true`, allows guests to choose username; if `false`, generates random username

### Environment Variables

**Variable:** `RELDENS_CREATE_CONFIG_FILE`
- **Type:** Number (0 or 1)
- **Default:** `1`
- **Effect:** Controls whether config.js file is created after rooms are configured

**Variable:** `RELDENS_GUESTS_EMAIL_DOMAIN`
- **Type:** String
- **Default:** `@guest-reldens.com`
- **Effect:** Email domain for guest user accounts

---

## 7. Common Issues & Solutions

### Issue 1: Guest form is hidden even though rooms have allowGuest

**Cause:** Config file was created BEFORE rooms were configured

**Solution:**
1. Applied in `manager-claude.js`
2. Config file creation moved to AFTER `initializeManagers()`
3. Restart server to regenerate config.js with correct data

### Issue 2: Guest rooms not updating after database changes

**Cause:** Config file is static, created on server start

**Solution:**
1. Restart server (config.js regenerated automatically)
2. No client rebuild needed

### Issue 3: All rooms show as guest-allowed when they shouldn't

**Cause:** `server/players/guestUser/allowOnRooms` is set to `true`

**Solution:**
1. Set config to `false` in database
2. Restart server
3. Only rooms with `customData.allowGuest = true` will allow guests

### Issue 4: "Invalid room for guest: undefined" Error

**Cause:** Player state validation using wrong object after entity refactor

**The Bug:**
After the entity refactor introduced "related_" prefix for database relations, the codebase has:
- `userModel.player.related_players_state` - Database snapshot (NO scene property)
- `userModel.player.state` - Runtime state (HAS scene property)

The validation code was checking `related_players_state.scene` which doesn't exist.

**Error in scene.js (BEFORE FIX):**
```javascript
// Line 140: Checking database state
if(!userModel.player.related_players_state){
    Logger.warning('Missing user player state.', userModel);
    return false;
}
// Line 144: Accessing scene from database state (doesn't exist!)
if(!this.validateRoom(userModel.player.related_players_state.scene, isGuest)){
    // related_players_state has NO scene property → undefined
    return false;
}
```

**Fix Applied (scene.js:140-144):**
```javascript
// Line 140: Check runtime state instead
if(!userModel.player.state){
    Logger.warning('Missing user player state.', userModel);
    return false;
}
// Line 144: Use scene from runtime state (exists!)
if(!this.validateRoom(userModel.player.state.scene, isGuest)){
    // state.scene contains the room name
    return false;
}
```

**Root Cause Analysis:**

1. **Database Model** (`related_players_state`):
   - Loaded from `players_state` table
   - Contains: `room_id`, `x`, `y`, `dir`
   - Does NOT contain `scene` property
   - Snapshot from database, never updated during session

2. **Runtime State** (`state`):
   - Created during login from `related_players_state`
   - Enhanced with `scene` property via `setSceneOnPlayers()`
   - Updated during gameplay (scene changes, movement)
   - Source of truth for validation and saving

3. **The Flow:**
   ```
   Database → related_players_state (no scene)
           ↓
   mapPlayerStateRelation() → creates state
           ↓
   setSceneOnPlayers() → adds state.scene
           ↓
   Validation MUST use state.scene ✓
   ```

**Why This Affected Guests:**
- New guests: First time creating player, fresh data load exposes the bug immediately
- Existing players: May have workarounds or different code paths masking the issue

**Related Documentation:**
See `.claude/player-state-flow.md` for complete player state architecture.

---

## 8. Testing Guest System

### Database Setup

```sql
-- Enable guest on specific room
UPDATE rooms
SET customData = '{"allowGuest": true}'
WHERE name = 'town';

-- Disable guest on specific room
UPDATE rooms
SET customData = '{"allowGuest": false}'
WHERE name = 'forest';
```

### Verification Points

1. **Server logs:** Check for `Initialize Managers` → should see rooms loaded
2. **Config file:** Check `theme/config.js` for `registrationGuest` data
3. **Browser console:** Check `window.reldensInitialConfig.client.rooms.selection.availableRooms.registrationGuest`
4. **UI:** Guest form should be visible if guest rooms exist

### Debug Commands

```javascript
// In browser console
console.log(reldens.config.get('client/rooms/selection/availableRooms/registrationGuest'));
// Should show object with guest-allowed rooms

// Check if guest login is enabled
console.log(reldens.config.get('client/general/users/allowGuest'));
// Should be true

// Check guest form element
console.log(document.querySelector('#guest-form'));
// Should exist and not have 'hidden' class if guest rooms exist
```

---

## 9. Code References

**Key Files:**
- `lib/rooms/server/manager.js` - Room loading and guest filtering
- `lib/game/server/manager.js` - Config file creation timing
- `lib/game/server/homepage-loader.js` - Config file generation
- `lib/game/client/game-manager.js` - Config loading
- `lib/game/client/handlers/client-start-handler.js` - Form initialization
- `lib/game/client/handlers/guest-form-handler.js` - Guest form logic

**Database:**
- Table: `rooms`
- Column: `customData` (JSON)
- Field: `allowGuest` (boolean)

**Config Paths:**
- Server: `server/players/guestUser/allowOnRooms`
- Server: `server/players/guestsUser/emailDomain`
- Client: `client/general/users/allowGuest`
- Client: `client/general/users/allowGuestUserName`
- Client: `client/rooms/selection/availableRooms/registrationGuest`
- Client: `client/rooms/selection/availableRooms/loginGuest`
