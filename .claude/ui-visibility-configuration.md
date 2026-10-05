# UI Visibility Configuration

## Overview

This document describes the configuration system for controlling visibility of UI elements that can be displayed separately for the current player versus other players and NPCs.

---

## Life Bar Visibility Configuration

### Purpose

Controls the display of health bars above player and NPC sprites. Allows independent configuration for current player, other players, and NPCs/enemies.

### Configuration Paths

- **Scope**: `client`
- **Base Path**: `ui/lifeBar`
- **Type**: boolean (type 3)

### Visibility Properties

**showCurrentPlayer**
- Path: `client/ui/lifeBar/showCurrentPlayer` (not seeded by the migrations, must be added manually)
- Default: disabled (with no config row the value resolves to `undefined`)
- Controls: Current player's lifebar visibility
- Use case: Disable when using alternative UI systems like stat bars in player info panel

**showAllPlayers**
- Path: `client/ui/lifeBar/showAllPlayers`
- Default: `0` (disabled)
- Controls: Other players' lifebars visibility
- Use case: Enable for PvP-focused games where seeing other players' health is important

**showEnemies**
- Path: `client/ui/lifeBar/showEnemies`
- Default: `1` (enabled)
- Controls: NPCs and enemies lifebars visibility, when disabled their bars are never shown (not even on click)
- Use case: Disable for less cluttered visual experience

**showOnClick**
- Path: `client/ui/lifeBar/showOnClick`
- Default: `1` (enabled)
- Controls: Whether lifebars show only when target is clicked
- Other players: applies when `showAllPlayers` is disabled, the clicked player bar is shown
- NPCs/enemies: requires `showEnemies` enabled, and restricts their bars to the clicked target (`lib/users/client/objects-handler.js` `ObjectsHandler.isValidMessage()` and `ObjectsHandler.isValidToDraw()`)

### Implementation Flow

**File**: `lib/users/client/lifebar-ui.js`
**Method**: `canShowPlayerLifeBar(playerId)`

Flow:
1. Check if player is current player by comparing playerId with gameManager.getCurrentPlayer().playerId
2. If current player: hide the bar and return false when the player is dead or disabled, otherwise return value of `barConfig.showCurrentPlayer`
3. If other player: check `barConfig.showAllPlayers` first, then `barConfig.showOnClick` and whether the player is the current target if false
4. Draw lifebar only if check returns true

NPCs and enemies bars are handled by `lib/users/client/objects-handler.js`: the lifebar messages for objects are only processed when `showEnemies` is enabled, and with `showOnClick` enabled only the clicked target bar is drawn.

**Customizable Fields**:
- `showCurrentPlayer` - boolean - stored in `this.barConfig.showCurrentPlayer`
- `showAllPlayers` - boolean - stored in `this.barConfig.showAllPlayers`
- `showEnemies` - boolean - stored in `this.barConfig.showEnemies`
- `showOnClick` - boolean - stored in `this.barConfig.showOnClick`

### Configuration Examples

The `showCurrentPlayer`, `showCurrentPlayerName` and `showNamesLimit` rows are not seeded, so an `UPDATE` on them changes 0 rows. The examples use `INSERT ... ON DUPLICATE KEY UPDATE` for those paths (the `config` table has the `scope_path` unique key).

Hide current player lifebar:
```sql
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/lifeBar/showCurrentPlayer', '0', 3)
ON DUPLICATE KEY UPDATE `value` = '0';
```

Show all players lifebars always:
```sql
UPDATE `config` SET `value` = '1' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/showAllPlayers';
UPDATE `config` SET `value` = '0' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/showOnClick';
```

Hide all lifebars (disables the whole lifebar system, `LifebarUi.createLifeBarUi()` returns false when it is off):
```sql
UPDATE `config` SET `value` = '0' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/enabled';
```

Setting only `showCurrentPlayer`, `showAllPlayers` and `showEnemies` to `0` is not enough, other players bars would still show on click while `showOnClick` is `1`.

---

## Player Names Visibility Configuration

### Purpose

Controls the display of character names above player sprites. Allows independent configuration for current player versus other players.

### Configuration Paths

- **Scope**: `client`
- **Base Path**: `ui/players`
- **Type**: boolean (type 3)

### Visibility Properties

**showCurrentPlayerName**
- Path: `client/ui/players/showCurrentPlayerName` (not seeded by the migrations, must be added manually)
- Default: disabled (with no config row the value resolves to `false`)
- Controls: Current player's name visibility
- Use case: Disable for cleaner visual experience when player info is shown in UI panel

**showNames**
- Path: `client/ui/players/showNames`
- Default: `1` (enabled)
- Controls: Other players' names visibility
- Use case: Disable for less cluttered multiplayer experience

**showNamesLimit**
- Path: `client/ui/players/showNamesLimit` (not seeded by the migrations, must be added manually)
- Default: `10` (code fallback)
- Controls: Maximum name length before truncation with ellipsis
- Use case: Prevent long names from cluttering the screen

### Implementation Flow

**File**: `lib/users/client/player-engine.js`
**Method**: `showPlayerName(id)`

Flow:
1. Determine which config to check using ternary: `id === this.playerId ? showCurrentPlayerName : showNames`
2. Return false if config value is false
3. Validate player exists and has name property
4. Apply name length limit if configured
5. Attach text sprite to player using SpriteTextFactory

**Method**: `updateNamePosition(playerSprite)`

Flow:
1. Determine which config to check: `playerId === this.playerId ? showCurrentPlayerName : showNames`
2. Return false if config is disabled or nameSprite doesn't exist
3. Calculate relative position and update sprite coordinates

**Customizable Fields**:
- `globalConfigShowCurrentPlayerName` - boolean - loaded from `client/ui/players/showCurrentPlayerName`
- `globalConfigShowNames` - boolean - loaded from `client/ui/players/showNames`
- `globalConfigShowNamesLimit` - number - loaded from `client/ui/players/showNamesLimit`
- `globalConfigNameText` - object - loaded from `client/ui/players/nameText` with style properties

### Configuration Examples

Hide current player name:
```sql
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/players/showCurrentPlayerName', '0', 3)
ON DUPLICATE KEY UPDATE `value` = '0';
```

Hide all other players names:
```sql
UPDATE `config` SET `value` = '0' WHERE `scope` = 'client' AND `path` = 'ui/players/showNames';
```

Show both current and other players names:
```sql
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/players/showCurrentPlayerName', '1', 3)
ON DUPLICATE KEY UPDATE `value` = '1';
UPDATE `config` SET `value` = '1' WHERE `scope` = 'client' AND `path` = 'ui/players/showNames';
```

Increase name length limit:
```sql
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/players/showNamesLimit', '20', 2)
ON DUPLICATE KEY UPDATE `value` = '20';
```

---

## Common Patterns

### Pattern 1: Clean Current Player Display

When using custom UI panels for current player information:

```sql
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/lifeBar/showCurrentPlayer', '0', 3)
ON DUPLICATE KEY UPDATE `value` = '0';
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/players/showCurrentPlayerName', '0', 3)
ON DUPLICATE KEY UPDATE `value` = '0';
```

Result: Current player has no floating UI elements, all info shown in panels

### Pattern 2: Minimal Multiplayer Display

For focused gameplay with minimal distractions:

```sql
UPDATE `config` SET `value` = '0' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/showAllPlayers';
UPDATE `config` SET `value` = '0' WHERE `scope` = 'client' AND `path` = 'ui/players/showNames';
UPDATE `config` SET `value` = '1' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/showOnClick';
```

Result: Other players show info only when clicked

### Pattern 3: Full Visibility

For PvP or cooperative multiplayer:

```sql
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/lifeBar/showCurrentPlayer', '1', 3)
ON DUPLICATE KEY UPDATE `value` = '1';
UPDATE `config` SET `value` = '1' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/showAllPlayers';
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/players/showCurrentPlayerName', '1', 3)
ON DUPLICATE KEY UPDATE `value` = '1';
UPDATE `config` SET `value` = '1' WHERE `scope` = 'client' AND `path` = 'ui/players/showNames';
UPDATE `config` SET `value` = '0' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/showOnClick';
```

Result: All players always show names and health bars

---

## Implementation Details

### Code Organization

Both systems follow the same architectural pattern:

1. Configuration loaded from gameManager.config: `PlayerEngine` loads it in its constructor, `LifebarUi` loads it in `createLifeBarUi()` (not in the constructor)
2. Single method determines visibility based on player type (current vs other)
3. The player type selects the appropriate config property
4. Early return if visibility check fails
5. Render or update UI element if check passes

### Property Access Pattern

Properties are stored as class instance variables for performance.

`LifebarUi.createLifeBarUi()`:
```javascript
this.barConfig = gameManager.config.get('client/ui/lifeBar');
```

`PlayerEngine` constructor:
```javascript
this.globalConfigShowNames = Boolean(this.config.get('client/ui/players/showNames'));
/** @type {boolean} */
this.globalConfigShowCurrentPlayerName = Boolean(this.config.getWithoutLogs('client/ui/players/showCurrentPlayerName'));
```

### Conditional Logic Pattern

`PlayerEngine.showPlayerName()` uses a ternary:

```javascript
let shouldShow = id === this.playerId
    ? this.globalConfigShowCurrentPlayerName
    : this.globalConfigShowNames;
if(!shouldShow){
    return false;
}
```

`LifebarUi.canShowPlayerLifeBar()` uses early returns:

```javascript
if(isCurrentPlayer){
    return this.barConfig.showCurrentPlayer;
}
if(this.barConfig.showAllPlayers){
    // @TODO - BETA - Include validation for other players inState.
    return true;
}
return this.barConfig.showOnClick && playerId === this.getCurrentTargetId();
```

### Integration Points

**Life Bars**:
- Created in: `lib/users/client/plugin.js` during `reldens.beforeCreateEngine` event
- Updated on: `reldens.playerStatsUpdateAfter`, `reldens.runPlayerAnimation`, `reldens.updateGameSizeBefore`
- Removed on: `reldens.playersOnRemove`

**Player Names**:
- Created in: `lib/users/client/player-engine.js` during `addPlayer()` call
- Updated on: Every animation frame during `updatePlayerState()`
- Removed on: `removePlayer()` call, which destroys the name sprite when the player has one and always destroys the player sprite, so players without names (for example with `showNames` set to `0`) are removed too

---

## Migration Notes

No migration seeds `ui/lifeBar/showCurrentPlayer` or `ui/players/showCurrentPlayerName`. Without the rows both resolve to a falsy value, so the current player lifebar and name are hidden.

To manage them from the `config` table, add the rows manually:
```sql
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES
('client', 'ui/lifeBar/showCurrentPlayer', '0', 3),
('client', 'ui/players/showCurrentPlayerName', '0', 3);
```

Then set them to `1` to enable these features if desired.
