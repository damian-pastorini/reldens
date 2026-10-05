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

**Location:** `rooms` table in `customData` column

The flag is only used when the `server/players/guestUser/allowOnRooms` config row is `0`. The basic configuration installs that row as `1`, which allows guests on every room and ignores `customData.allowGuest` (see 2.2).

**Example SQL:**
```sql
UPDATE rooms SET customData = '{"allowGuest": true}' WHERE name = 'town';
```

---

## 2. Server-Side Flow

### 2.1 Rooms Loading (`lib/rooms/server/manager.js`)

**Method:** `RoomsManager.loadRooms()`

It loads the rooms with their change and return points relations, builds a model per enabled room with `RoomModelBuilder.build()` and indexes the models by id and by name. Then it builds the guest and the selector lists:

```javascript
this.loadedRooms = rooms;
this.loadedRoomsById = roomsById;
this.loadedRoomsByName = roomsByName;
this.availableRoomsGuest = this.fetchGuestRooms(roomsByName);
let registrationRooms = this.filterRooms(true);
this.registrationAvailableRooms = this.extractRoomDataForSelector(registrationRooms);
this.registrationAvailableRoomsGuest = this.extractRoomDataForSelector(this.fetchGuestRooms(registrationRooms));
let loginRooms = this.filterRooms(false);
this.loginAvailableRooms = this.extractRoomDataForSelector(loginRooms);
this.loginAvailableRoomsGuest = this.extractRoomDataForSelector(this.fetchGuestRooms(loginRooms));
return this.loadedRooms;
```

`filterRooms(forRegistration)` reads the `client/rooms/selection/registrationAvailableRooms` or the `client/rooms/selection/loginAvailableRooms` config row (both installed as `*`) and always returns an object keyed by room name: `loadedRoomsByName` for `*`, otherwise `filterValidRooms()` keeps the configured room names that are loaded, in the same shape:

```javascript
filterValidRooms(configuredRooms, createdRooms)
{
    let validRooms = {};
    for(let roomName of configuredRooms){
        if(sc.hasOwn(createdRooms, roomName)){
            validRooms[roomName] = createdRooms[roomName];
        }
    }
    return validRooms;
}
```

`extractRoomDataForSelector()` turns each of those objects into the array of `{name, title}` entries sent to the client.

### 2.2 Guest Room Filtering (`lib/rooms/server/manager.js`)

**Method:** `RoomsManager.fetchGuestRooms()`

```javascript
fetchGuestRooms(availableRooms)
{
    if(this.allowGuestOnRooms){
        return availableRooms;
    }
    return this.filterGuestRooms(availableRooms);
}
```

**Method:** `RoomsManager.filterGuestRooms()`

```javascript
filterGuestRooms(availableRooms)
{
    if(!sc.isObject(availableRooms)){
        Logger.debug('The provided "availableRooms" is not an object.', availableRooms);
        return {};
    }
    let validRooms = {};
    for(let i of Object.keys(availableRooms)){
        let room = availableRooms[i];
        let customData = room.customData || {};
        if(sc.get(customData, 'allowGuest')){
            validRooms[room.roomName] = room;
        }
    }
    return validRooms;
}
```

`room.customData` is already a parsed object: `RoomModelBuilder.build()` runs `sc.toJson(room.customData, {})` when the room model is created.

**Global Setting:**
- Config path: `server/players/guestUser/allowOnRooms`, read by `RoomsManager.setupConfiguration()` as `this.allowGuestOnRooms`
- Installed as `1` by the basic configuration; the code fallback when the row is missing is `false`
- If `1`, all rooms allow guests and `customData.allowGuest` is ignored
- If `0`, only rooms with `customData.allowGuest = true` allow guests

The same `fetchGuestRooms()` result feeds BOTH the client room selector lists and the server join gate (`availableRoomsGuest`, checked by `RoomLogin.validateRoom()` in `lib/rooms/server/login.js` when a guest joins a scene room). The server gate is the source of truth: the client list is always a subset of what the gate accepts, so a guest is never shown a room the server would reject.

### 2.3 Config Assignment (`lib/rooms/server/manager.js`)

**Method:** `RoomsManager.defineRoomsInGameServer()`, after all rooms are loaded and defined:

```javascript
// save rooms lists data for clients:
if(this.config.client?.rooms?.selection){
    this.config.client.rooms.selection.availableRooms = {
        registration: this.registrationAvailableRooms,
        registrationGuest: this.registrationAvailableRoomsGuest,
        login: this.loginAvailableRooms,
        loginGuest: this.loginAvailableRoomsGuest
    };
}
```

**Called by:** `ServerManagersInitializer.defineServerRooms()` calls `RoomsManager.defineRoomsInGameServer()`

---

## 3. Config File Generation

### 3.1 Timing (CRITICAL)

**File:** `lib/game/server/manager.js`

**Execution order (inside `ServerManager.startGameServerInstance()`):**
1. `new ServerManagersInitializer(this).initializeManagers()`
   - Calls `defineServerRooms()`
   - Guest rooms configured in `this.configManager.client.rooms.selection.availableRooms`
2. **Config file created and client bundled**, both inside the same `RELDENS_CREATE_CONFIG_FILE` block (default `1`, `0` skips both):
   - `HomepageLoader.createConfigFile()` with guest rooms data
   - `themeManager.createClientBundle()` runs the Parcel bundle (only when `RELDENS_ALLOW_RUN_BUNDLER` is `1`)

```javascript
if(1 === Number(process.env.RELDENS_CREATE_CONFIG_FILE || 1)){
    let populatedConfigFile = HomepageLoader.createConfigFile(
        this.themeManager.projectThemePath,
        Object.assign({}, this.configManager.gameEngine, {client: this.configManager.client})
    );
    if(!populatedConfigFile){
        Logger.error('Failed to create config file for homepage.');
    }
    await this.themeManager.createClientBundle();
}
```

### 3.2 Config File Creation (`lib/game/server/homepage-loader.js`)

**Method:** `HomepageLoader.createConfigFile()`

```javascript
static createConfigFile(projectThemePath, initialConfiguration)
{
    let configFilePath = FileHandler.joinPaths(projectThemePath, 'config.js');
    let configFileContents = 'window.reldensInitialConfig = '+sc.toJsonString(initialConfiguration)+';';
    let writeResult = FileHandler.writeFile(configFilePath, configFileContents);
    if(!writeResult){
        Logger.error('Failed to write config file: '+configFilePath);
        return false;
    }
    Logger.info('Config file created: '+configFilePath);
    return true;
}
```

**Output file:** `theme/<projectThemeName>/config.js` (`ThemeManager.projectThemePath`, for example `theme/default/config.js`)

**Content structure:**
```javascript
window.reldensInitialConfig = {
    /* ...configManager.gameEngine properties, spread at the top level... */
    client: {
        rooms: {
            selection: {
                availableRooms: {
                    registration: [/* {name, title} per room */],
                    registrationGuest: [/* {name, title} per guest-allowed room */],
                    login: [/* {name, title} per room */],
                    loginGuest: [/* {name, title} per guest-allowed room */]
                }
            }
        }
    }
};
```

---

## 4. Client-Side Flow

### 4.1 Config Loading (`lib/game/client/game-manager.js`)

**Constructor** (`GameManager.constructor`)

```javascript
this.config = new ConfigManager();
let initialConfig = this.gameDom.getWindow()?.reldensInitialConfig || {};
sc.deepMergeProperties(this.config, initialConfig);
```

**Data source:** `window.reldensInitialConfig` from the theme `config.js` (see 3.2)

### 4.2 Client Start (`lib/game/client/handlers/client-start-handler.js`)

**Method:** `ClientStartHandler.clientStart()`, which activates the registration form and then the guest form before the other handlers:

```javascript
let registrationForm = new RegistrationFormHandler(this.gameManager);
registrationForm.activateRegistration();
let guestForm = new GuestFormHandler(this.gameManager);
guestForm.activateGuest();
```

**Called by:** `GameManager.clientStart()` on `DOMContentLoaded`

### 4.3 Guest Form Activation (`lib/game/client/handlers/guest-form-handler.js`)

**Method:** `GuestFormHandler.activateGuest()`

```javascript
activateGuest()
{
    if(!this.form){
        return false;
    }
    let availableGuestRooms = this.gameManager.config.getWithoutLogs(
        'client/rooms/selection/availableRooms/registrationGuest',
        {}
    );
    if(
        !this.gameManager.config.get('client/general/users/allowGuest')
        || 0 === Object.keys(availableGuestRooms).length
    ){
        this.form.classList.add('hidden');
        return true;
    }
    ErrorsBlockHandler.reset(this.form);
    let selectors = GameConst.SELECTORS;
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

The username sent by the client is not the final one: the server always replaces it (see `allowGuestUserName` in section 6).

**Form element:** `#guest-form` in `theme/default/index.html`

**Key logic:**
- If `availableGuestRooms` is empty: form hidden
- If `client/general/users/allowGuest` is false: form hidden
- Otherwise: form visible and functional

---

## 5. Complete Flow Diagram

**Step 1: DATABASE (rooms table and config table)**
- `server/players/guestUser/allowOnRooms` config row (installed as `1`: every room allows guests)
- With the row at `0`: customData: {"allowGuest": true} on each guest room

**Step 2: SERVER - RoomsManager.loadRooms()**
- Loads all rooms from database
- Calls fetchGuestRooms() to identify guest-allowed rooms (all of them, or the filterGuestRooms() result when allowOnRooms is off)
- Creates the availableRoomsGuest join gate and the registrationAvailableRoomsGuest and loginAvailableRoomsGuest lists

**Step 3: SERVER - RoomsManager.defineRoomsInGameServer()**
- Assigns guest rooms to config:
- config.client.rooms.selection.availableRooms = {
  - registrationGuest: [...],
  - loginGuest: [...]
- }

**Step 4: SERVER - ServerManager.startGameServerInstance()**
- After initializeManagers() completes, and only when RELDENS_CREATE_CONFIG_FILE is 1 (0 skips both calls below)
- Calls HomepageLoader.createConfigFile()
- Writes theme/<projectThemeName>/config.js (theme/default/config.js by default) with guest rooms data
- Calls themeManager.createClientBundle()
- Bundles config.js into dist/ (only when RELDENS_ALLOW_RUN_BUNDLER is 1)

**Step 5: CLIENT - Browser loads the index page built from theme/default/index.html**
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
- If empty: HIDE form
- If not empty: SHOW form and attach submit handler

---

## 6. Configuration Options

### Server-Side Configs

**Path:** `server/players/guestUser/allowOnRooms`
- **Type:** Boolean
- **Default:** installed as `1` by the basic configuration (code fallback `false` when the row is missing)
- **Effect:** If `1`, all rooms allow guests (ignores `customData.allowGuest`); set it to `0` to use `customData.allowGuest`

**Path:** `server/players/guestsUser/emailDomain`
- **Type:** String
- **Default:** not installed; when the row is missing or empty `ServerConfigEnricher.enrichGuestsEmailDomain()` fills it with `RELDENS_GUESTS_EMAIL_DOMAIN` (default `@guest-reldens.com`)
- **Effect:** Email domain for guest accounts

**Path:** `security/guests/maxPerIp` (scope `server`)
- **Type:** Number
- **Default:** installed as `20`, overrides `RELDENS_GUESTS_MAX_PER_IP` (the environment value only applies when the row is missing)
- **Effect:** Guest accounts created per address, see `.claude/ip-lists-and-login-blocks.md`

### Client-Side Configs

**Path:** `client/general/users/allowGuest`
- **Type:** Boolean
- **Default:** client config row installed as `1` (code fallback `false` when the row is missing)
- **Effect:** Master switch for guest login feature: the client hides the guest form and `UserRegistration.processGuestRequest()` rejects the guest requests when it is off

**Path:** `client/general/users/allowGuestUserName`
- **Type:** Boolean
- **Default:** `false` (not installed)
- **Effect:** The server always generates the guest username as `guest-<time>-<8 random chars>` in `UserRegistration.overrideWithGuestData()` (`lib/game/server/user-registration.js`). With the flag on, the client sends the typed name and the server appends it cleaned (only letters, digits and dashes, max 20 chars) as a suffix; with the flag off the client sends a random name that the server ignores.

```javascript
let generatedGuestName = 'guest-'+sc.getTime()+'-'+sc.randomChars(8);
userData.username = this.allowGuestUserName
    ? generatedGuestName+'-'+String(userData.username).replace(/[^a-zA-Z0-9-]/g, '').substring(0, 20)
    : generatedGuestName;
```

### Environment Variables

**Variable:** `RELDENS_CREATE_CONFIG_FILE`
- **Type:** Number (0 or 1)
- **Default:** `1`
- **Effect:** Controls whether the config.js file is created and the client bundle step runs after rooms are configured; `0` skips both

**Variable:** `RELDENS_GUESTS_EMAIL_DOMAIN`
- **Type:** String
- **Default:** `@guest-reldens.com`
- **Effect:** Email domain for guest user accounts, only used when the `server/players/guestsUser/emailDomain` row is missing or empty

**Variable:** `RELDENS_GUESTS_MAX_PER_IP`
- **Type:** Number
- **Default:** `20`
- **Effect:** Overridden by the installed `security/guests/maxPerIp` config row

---

## 7. Testing Guest System

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

---

## 8. Guest Login Flow

1. The guest form sends `isGuest: true` (the client sets `isNewUser: true` for every guest request).
2. `LoginManager.processUserRequest()` sends new guests to `UserRegistration.processGuestRequest()`
   (`lib/game/server/user-registration.js`): it rejects the request when guests are disabled
   (`client/general/users/allowGuest`) or the address reached the `security/guests/maxPerIp` limit (the config row
   overrides `RELDENS_GUESTS_MAX_PER_IP`), then `overrideWithGuestData()` generates the username, the email (with the
   guest email domain) and a random password, and `register()` creates the user with the guest role.
3. `RoomGame.onJoin()` (`lib/rooms/server/game.js`) sends the generated password back as `guestPassword` in the
   `START_GAME` message. The client keeps it only in memory (`GameManager.initEngine()`) and uses it to join the scene
   and feature rooms.
4. Every later login of an existing guest goes through `LoginManager.isValidGuestLogin()`: it is only accepted while the
   guest is active in the game room. Once the guest leaves the game (tab closed, disconnection) nobody can log into that
   account again, the password is never stored on the client.

A guest account is therefore disposable: its data is only reachable during the session that created it.

---

## 9. Guests Cleanup

`GuestsCleanup` (`lib/users/server/guests-cleanup.js`) removes the guest accounts that were not used for a while. It is
created and started by the users plugin on `reldens.serverReady` (`lib/users/server/plugin.js`).

### Configuration

- `server/players/guestUser/cleanupEnabled` - the basic configuration installs it as `0`; as every configuration row it
  wins over `RELDENS_GUESTS_CLEANUP_ENABLED`, so set the row to `1` to enable the cleanup
- `server/players/guestUser/cleanupAfterMs` (installed as `604800000`, 7 days, overrides
  `RELDENS_GUESTS_CLEANUP_AFTER_MS`) - time without activity before a guest is removed
- `server/players/guestUser/cleanupIntervalMs` (installed as `3600000`, 1 hour, overrides
  `RELDENS_GUESTS_CLEANUP_INTERVAL_MS`) - time between runs; the cleanup does not start when the interval is not lower
  than the cleanup time, nor without a guest role ID

### Run

1. Runs never overlap: a run started while another one is running is skipped.
2. `UsersManager.touchGuests()` refreshes `updated_at` of the guests with an active session on this server, so the
   other servers sharing the database do not remove them.
3. `UsersManager.loadGuestsOlderThan()` loads the guests whose `updated_at` is older than the cleanup time, with their
   players.
4. Guests with an active session on this server are skipped.
5. `UsersManager.deleteGuestUser()` removes each remaining guest.

### Guest deletion (`UsersManager.deleteGuestUser()`)

1. Skipped when one of the guest players owns a clan (the clan owner foreign key has no delete cascade).
2. Claim: a conditional update bans the guest only while it is still a guest and its `updated_at` is still older than
   the cleanup time. When no row is updated the guest was used again (on any server) and it is kept. The ban makes any
   login during the deletion fail.
3. Deletes, in order: the quests progress of each player (no foreign key), each player (the player stats, state,
   inventory, skills, scores and the other player tables cascade), the user logins, the user locale and the user.
4. When a step fails, the error is logged and the guest status and `updated_at` are restored to the loaded values.
   Restoring `updated_at` matters: the claim and the restore change the row, and the column updates itself on every
   change (`ON UPDATE CURRENT_TIMESTAMP`), which would hide the guest from the next runs for another full cleanup time.
   With the original value the next run loads the guest again and deletes whatever is left, so no orphan rows remain.

A failed guest never stops the run, the next guest is processed.

---

## 10. Code References

**Key Files:**
- `lib/rooms/server/manager.js` - Room loading and guest filtering
- `lib/rooms/server/login.js` - `validateRoom()`, the guest rooms join gate
- `lib/game/server/manager.js` - Config file creation timing
- `lib/game/server/homepage-loader.js` - Config file generation
- `lib/game/client/game-manager.js` - Config loading
- `lib/game/client/handlers/client-start-handler.js` - Form initialization
- `lib/game/client/handlers/guest-form-handler.js` - Guest form logic
- `lib/game/server/login-manager.js` - Guest requests routing and `isValidGuestLogin()`
- `lib/game/server/user-registration.js` - Guest account creation
- `lib/rooms/server/game.js` - `guestPassword` in the `START_GAME` message
- `lib/users/server/guests-cleanup.js` - Guests cleanup runs
- `lib/users/server/manager.js` - Guests claim and deletion

**Database:**
- Table: `rooms`
- Column: `customData` (JSON)
- Field: `allowGuest` (boolean)

**Config Paths:**
- Server: `server/players/guestUser/allowOnRooms`
- Server: `server/players/guestsUser/emailDomain`
- Server: `server/players/guestUser/cleanupEnabled`, `cleanupAfterMs`, `cleanupIntervalMs`
- Server: `server/security/guests/maxPerIp`
- Client: `client/general/users/allowGuest`
- Client: `client/general/users/allowGuestUserName`
- Client: `client/rooms/selection/availableRooms/registrationGuest`
- Client: `client/rooms/selection/availableRooms/loginGuest`
