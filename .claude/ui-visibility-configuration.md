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
- Path: `client/ui/lifeBar/showCurrentPlayer`
- Default: `0` (disabled)
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
- Controls: NPCs and enemies lifebars visibility
- Use case: Disable for less cluttered visual experience

**showOnClick**
- Path: `client/ui/lifeBar/showOnClick`
- Default: `1` (enabled)
- Controls: Whether lifebars show only when target is clicked
- Works for: Both other players and objects when their specific show flags are disabled

### Implementation Flow

**File**: `lib/users/client/lifebar-ui.js`
**Method**: `canShowPlayerLifeBar(playerId)`

Flow:
1. Check if player is current player by comparing playerId with gameManager.getCurrentPlayer().playerId
2. If current player: return value of `barConfig.showCurrentPlayer`
3. If other player: check `barConfig.showAllPlayers` first, then `barConfig.showOnClick` if false
4. Draw lifebar only if check returns true

**Customizable Fields**:
- `showCurrentPlayer` - boolean - stored in `this.barConfig.showCurrentPlayer`
- `showAllPlayers` - boolean - stored in `this.barConfig.showAllPlayers`
- `showEnemies` - boolean - stored in `this.barConfig.showEnemies`
- `showOnClick` - boolean - stored in `this.barConfig.showOnClick`

### Configuration Examples

Hide current player lifebar:
```sql
UPDATE `config` SET `value` = '0' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/showCurrentPlayer';
```

Show all players lifebars always:
```sql
UPDATE `config` SET `value` = '1' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/showAllPlayers';
UPDATE `config` SET `value` = '0' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/showOnClick';
```

Hide all lifebars:
```sql
UPDATE `config` SET `value` = '0' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/showCurrentPlayer';
UPDATE `config` SET `value` = '0' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/showAllPlayers';
UPDATE `config` SET `value` = '0' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/showEnemies';
```

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
- Path: `client/ui/players/showCurrentPlayerName`
- Default: `0` (disabled)
- Controls: Current player's name visibility
- Use case: Disable for cleaner visual experience when player info is shown in UI panel

**showNames**
- Path: `client/ui/players/showNames`
- Default: `1` (enabled)
- Controls: Other players' names visibility
- Use case: Disable for less cluttered multiplayer experience

**showNamesLimit**
- Path: `client/ui/players/showNamesLimit`
- Default: `10`
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
UPDATE `config` SET `value` = '0' WHERE `scope` = 'client' AND `path` = 'ui/players/showCurrentPlayerName';
```

Hide all other players names:
```sql
UPDATE `config` SET `value` = '0' WHERE `scope` = 'client' AND `path` = 'ui/players/showNames';
```

Show both current and other players names:
```sql
UPDATE `config` SET `value` = '1' WHERE `scope` = 'client' AND `path` = 'ui/players/showCurrentPlayerName';
UPDATE `config` SET `value` = '1' WHERE `scope` = 'client' AND `path` = 'ui/players/showNames';
```

Increase name length limit:
```sql
UPDATE `config` SET `value` = '20' WHERE `scope` = 'client' AND `path` = 'ui/players/showNamesLimit';
```

---

## Common Patterns

### Pattern 1: Clean Current Player Display

When using custom UI panels for current player information:

```sql
UPDATE `config` SET `value` = '0' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/showCurrentPlayer';
UPDATE `config` SET `value` = '0' WHERE `scope` = 'client' AND `path` = 'ui/players/showCurrentPlayerName';
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
UPDATE `config` SET `value` = '1' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/showCurrentPlayer';
UPDATE `config` SET `value` = '1' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/showAllPlayers';
UPDATE `config` SET `value` = '1' WHERE `scope` = 'client' AND `path` = 'ui/players/showCurrentPlayerName';
UPDATE `config` SET `value` = '1' WHERE `scope` = 'client' AND `path` = 'ui/players/showNames';
UPDATE `config` SET `value` = '0' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/showOnClick';
```

Result: All players always show names and health bars

---

## Implementation Details

### Code Organization

Both systems follow the same architectural pattern:

1. Configuration loaded in constructor from gameManager.config
2. Single method determines visibility based on player type (current vs other)
3. Ternary operator selects appropriate config property
4. Early return if visibility check fails
5. Render or update UI element if check passes

### Property Access Pattern

Properties are stored as class instance variables for performance:

```javascript
this.barConfig = gameManager.config.get('client/ui/lifeBar');
this.globalConfigShowCurrentPlayerName = Boolean(this.config.get('client/ui/players/showCurrentPlayerName'));
this.globalConfigShowNames = Boolean(this.config.get('client/ui/players/showNames'));
```

### Conditional Logic Pattern

Both implementations use clean ternary logic:

```javascript
let shouldShow = id === this.playerId ? this.configForCurrent : this.configForOthers;
if(!shouldShow){
    return false;
}
```

### Integration Points

**Life Bars**:
- Created in: `lib/users/client/plugin.js` during `reldens.beforeCreateEngine` event
- Updated on: `reldens.playerStatsUpdateAfter`, `reldens.runPlayerAnimation`, `reldens.updateGameSizeBefore`
- Removed on: `reldens.playersOnRemove`

**Player Names**:
- Created in: `lib/users/client/player-engine.js` during `addPlayer()` call
- Updated on: Every animation frame during `updatePlayerState()`
- Removed on: `removePlayer()` call

---

## Migration Notes

When adding these configurations to existing installations:

Development migration file:
```sql
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES
('client', 'ui/lifeBar/showCurrentPlayer', '0', 3),
('client', 'ui/players/showCurrentPlayerName', '0', 3);
```

Default values set to `0` to avoid changing existing behavior where alternative UI systems may already be implemented.

After migration, users can explicitly enable these features if desired.
