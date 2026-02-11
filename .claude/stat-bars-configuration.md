# Stat Bars Configuration

## Overview

The player stats bars system is a generic client-side feature that displays visual bars for any configured player stat in the player box UI.

## Configuration Path

**Scope**: `client`
**Path**: `players/barsProperties`
**Type**: JSON (type 4)

## Configuration Structure

The configuration is a JSON object where each key represents a stat key, and each value contains the bar properties for that stat.

```json
{
    "statKey": {
        "enabled": true,
        "label": "Display Label",
        "activeColor": "#hexcolor",
        "inactiveColor": "#hexcolor"
    }
}
```

## Properties

Each stat bar configuration requires the following properties:

- **enabled** (boolean): Whether the bar should be displayed
- **label** (string): The display label shown above the bar
- **activeColor** (string): Hex color for the filled portion of the bar
- **inactiveColor** (string): Hex color for the empty/background portion of the bar

All four properties are required. If any property is missing, the bar will not be displayed.

## Activation Rules

- If config does not exist or is empty: bars system is NOT activated
- If config exists: bars are activated ONLY for stats with all required properties
- Each stat is validated independently via BarProperties model
- Only bars with `ready === true` are rendered

## Database Configuration

### Development Migration

Add to `migrations/development/beta.39.7-sql-update.sql`:

```sql
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES
('client', 'players/barsProperties', '{"hp":{"enabled":true,"label":"HP","activeColor":"#ff0000","inactiveColor":"#330000"},"mp":{"enabled":true,"label":"MP","activeColor":"#0000ff","inactiveColor":"#000033"}}', 4);
```

### Production Migration

Add to `migrations/production/reldens-basic-config-v4.0.0.sql`:

```sql
(92, 'client', 'players/barsProperties', '{"hp":{"enabled":true,"label":"HP","activeColor":"#ff0000","inactiveColor":"#330000"},"mp":{"enabled":true,"label":"MP","activeColor":"#0000ff","inactiveColor":"#000033"}}', 4),
```

## Examples

### HP and MP Bars

```json
{
    "hp": {
        "enabled": true,
        "label": "HP",
        "activeColor": "#ff0000",
        "inactiveColor": "#330000"
    },
    "mp": {
        "enabled": true,
        "label": "MP",
        "activeColor": "#0000ff",
        "inactiveColor": "#000033"
    }
}
```

### Stamina Bar

```json
{
    "stamina": {
        "enabled": true,
        "label": "Stamina",
        "activeColor": "#00ff00",
        "inactiveColor": "#003300"
    }
}
```

### Multiple Stats

```json
{
    "hp": {
        "enabled": true,
        "label": "HP",
        "activeColor": "#ff0000",
        "inactiveColor": "#330000"
    },
    "mp": {
        "enabled": true,
        "label": "MP",
        "activeColor": "#0000ff",
        "inactiveColor": "#000033"
    },
    "stamina": {
        "enabled": true,
        "label": "STA",
        "activeColor": "#ffff00",
        "inactiveColor": "#333300"
    },
    "atk": {
        "enabled": false,
        "label": "ATK",
        "activeColor": "#ff6600",
        "inactiveColor": "#331100"
    }
}
```

In this example, HP, MP, and Stamina bars will be displayed. ATK bar will not be displayed because `enabled: false`.

## Disabling Bars

To disable a specific stat bar, set `enabled: false`:

```json
{
    "hp": {
        "enabled": false,
        "label": "HP",
        "activeColor": "#ff0000",
        "inactiveColor": "#330000"
    }
}
```

To disable the entire bars system, remove the config or set it to an empty object `{}`.

## Technical Notes

- The stat key in the config must match the stat key in the database `stats` table
- Bars are rendered in the order they appear in the configuration object
- Bar values are calculated from `message.stats[statKey]` (current) and `message.statsBase[statKey]` (max)
- Percentage calculation: `(currentValue / maxValue) * 100`
- Bars update automatically when stats change via `reldens.playerStatsUpdateAfter` event
- Bars are rendered inside `#player-stats-bars-wrapper` within `#ui-player-extras` container

---

# Player Names Configuration

## Overview

The player names system displays character names above sprites. Names can be configured separately for the current player and other players.

## Configuration Path

**Scope**: `client`
**Path**: `ui/players`
**Type**: Multiple (boolean, object)

## Configuration Properties

### Visibility Controls

- **showCurrentPlayerName** (type 3 - boolean): Show name for the current player
  - Default: `0` (hidden)
  - Database: `client/ui/players/showCurrentPlayerName`
  - When disabled, current player's name will not be displayed
  - Useful when using alternative UI systems or cleaner visual experience

- **showNames** (type 3 - boolean): Show names for all other players
  - Default: `1` (enabled)
  - Database: `client/ui/players/showNames`
  - Controls name visibility for other players (not current player)

- **showNamesLimit** (type 2 - number): Maximum name length before truncation
  - Default: `10`
  - Database: `client/ui/players/showNamesLimit`
  - Names longer than this value will be truncated with '...'

### Visual Appearance

Names are styled using the `nameText` configuration object with the following properties:

- **align** (type 1 - string): Text alignment
  - Default: `center`
  - Database: `client/ui/players/nameText/align`

- **depth** (type 2 - number): Rendering depth/z-index
  - Default: `200000`
  - Database: `client/ui/players/nameText/depth`

- **fill** (type 1 - string): Text color
  - Default: `#ffffff`
  - Database: `client/ui/players/nameText/fill`

- **fontFamily** (type 1 - string): Font family
  - Default: `Verdana, Geneva, sans-serif`
  - Database: `client/ui/players/nameText/fontFamily`

- **fontSize** (type 1 - string): Font size
  - Default: `12px`
  - Database: `client/ui/players/nameText/fontSize`

- **height** (type 2 - number): Vertical offset from sprite
  - Default: `-90`
  - Database: `client/ui/players/nameText/height`

- **shadowBlur** (type 2 - number): Shadow blur radius
  - Default: `5`
  - Database: `client/ui/players/nameText/shadowBlur`

- **shadowColor** (type 1 - string): Shadow color
  - Default: `rgba(0,0,0,0.7)`
  - Database: `client/ui/players/nameText/shadowColor`

- **shadowX** (type 2 - number): Shadow X offset
  - Default: `5`
  - Database: `client/ui/players/nameText/shadowX`

- **shadowY** (type 2 - number): Shadow Y offset
  - Default: `5`
  - Database: `client/ui/players/nameText/shadowY`

- **stroke** (type 1 - string): Text stroke color
  - Default: `#000000`
  - Database: `client/ui/players/nameText/stroke`

- **strokeThickness** (type 2 - number): Stroke thickness
  - Default: `4`
  - Database: `client/ui/players/nameText/strokeThickness`

## Database Configuration

### Development Migration

Add to `migrations/development/[version]-sql-update.sql`:

```sql
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES
('client', 'ui/players/showCurrentPlayerName', '0', 3);
```

### Production Migration

From `migrations/production/reldens-basic-config-v4.0.0.sql`:

Existing configurations (IDs 239-252):
```sql
(239, 'client', 'ui/players/nameText/align', 'center', 1),
(240, 'client', 'ui/players/nameText/depth', '200000', 2),
(241, 'client', 'ui/players/nameText/fill', '#ffffff', 1),
(242, 'client', 'ui/players/nameText/fontFamily', 'Verdana, Geneva, sans-serif', 1),
(243, 'client', 'ui/players/nameText/fontSize', '12px', 1),
(244, 'client', 'ui/players/nameText/height', '-90', 2),
(245, 'client', 'ui/players/nameText/shadowBlur', '5', 2),
(246, 'client', 'ui/players/nameText/shadowColor', 'rgba(0,0,0,0.7)', 1),
(247, 'client', 'ui/players/nameText/shadowX', '5', 2),
(248, 'client', 'ui/players/nameText/shadowY', '5', 2),
(249, 'client', 'ui/players/nameText/stroke', '#000000', 1),
(250, 'client', 'ui/players/nameText/strokeThickness', '4', 2),
(251, 'client', 'ui/players/nameText/textLength', '4', 2),
(252, 'client', 'ui/players/showNames', '1', 3),
```

New configuration to add:
```sql
(253, 'client', 'ui/players/showCurrentPlayerName', '0', 3),
```

## Configuration Examples

### Example 1: Hide Current Player Name

```sql
UPDATE `config` SET `value` = '0' WHERE `scope` = 'client' AND `path` = 'ui/players/showCurrentPlayerName';
```

Current player's name will not be displayed. Useful when using alternative UI systems.

### Example 2: Hide All Other Players' Names

```sql
UPDATE `config` SET `value` = '0' WHERE `scope` = 'client' AND `path` = 'ui/players/showNames';
```

Other players' names will not be displayed. Current player's name visibility depends on `showCurrentPlayerName`.

### Example 3: Show Both Current Player and Other Players' Names

```sql
UPDATE `config` SET `value` = '1' WHERE `scope` = 'client' AND `path` = 'ui/players/showCurrentPlayerName';
UPDATE `config` SET `value` = '1' WHERE `scope` = 'client' AND `path` = 'ui/players/showNames';
```

All players' names will be displayed.

### Example 4: Customize Name Text Style

```sql
UPDATE `config` SET `value` = '#00ff00' WHERE `scope` = 'client' AND `path` = 'ui/players/nameText/fill';
UPDATE `config` SET `value` = '16px' WHERE `scope` = 'client' AND `path` = 'ui/players/nameText/fontSize';
UPDATE `config` SET `value` = '6' WHERE `scope` = 'client' AND `path` = 'ui/players/nameText/strokeThickness';
```

Creates green player names with 16px font size and thicker stroke.

## Visibility Behavior

**Configuration: showCurrentPlayerName=0, showNames=0**
- Current Player: Name hidden
- Other Players: Names hidden

**Configuration: showCurrentPlayerName=0, showNames=1**
- Current Player: Name hidden
- Other Players: Names shown

**Configuration: showCurrentPlayerName=1, showNames=0**
- Current Player: Name shown
- Other Players: Names hidden

**Configuration: showCurrentPlayerName=1, showNames=1**
- Current Player: Name shown
- Other Players: Names shown

## Implementation Details

### Files

- **PlayerEngine**: `lib/users/client/player-engine.js` - Main player management class
- **SpriteTextFactory**: `lib/game/client/engine/sprite-text-factory.js` - Text rendering utility

### Key Methods

- `showPlayerName(id)`: Displays name above player sprite, checks configuration
- `updateNamePosition(playerSprite)`: Updates name position during movement
- `applyNameLengthLimit(showName)`: Truncates long names

### Events

- `reldens.playerEngineAddPlayer`: Called when player is added, triggers name display
- `reldens.runPlayerAnimation`: Updates name position during animation

---

# Life Bar Configuration

## Overview

The life bar system displays health bars for the current player, other players, NPCs, and enemies. Life bars are rendered using Phaser graphics and can be positioned either fixed on the UI scene or floating above sprites.

## Configuration Path

**Scope**: `client`
**Path**: `ui/lifeBar`
**Type**: Multiple (boolean, number, string)

## Configuration Properties

### Core Settings

- **enabled** (type 3 - boolean): Enable or disable the entire lifebar system
  - Default: `1` (enabled)
  - Database: `client/ui/lifeBar/enabled`

### Visual Appearance

- **fillStyle** (type 1 - string): Hex color for the filled portion of the bar
  - Default: `0xff0000` (red)
  - Database: `client/ui/lifeBar/fillStyle`
  - Format: Hex color without `#` prefix (e.g., `0xff0000`)

- **lineStyle** (type 1 - string): Hex color for the bar border
  - Default: `0xffffff` (white)
  - Database: `client/ui/lifeBar/lineStyle`
  - Format: Hex color without `#` prefix (e.g., `0xffffff`)

- **height** (type 2 - number): Height of the bar in pixels
  - Default: `5`
  - Database: `client/ui/lifeBar/height`

- **width** (type 2 - number): Width of the bar in pixels
  - Default: `50`
  - Database: `client/ui/lifeBar/width`

- **top** (type 2 - number): Distance above sprite in pixels
  - Default: `5`
  - Database: `client/ui/lifeBar/top`

### Positioning

The lifebar system supports two positioning modes: fixed and floating.

#### Fixed Position

- **fixedPosition** (type 3 - boolean): Current player's bar appears at fixed position on UI scene
  - Default: `0` (floating above sprite)
  - Database: `client/ui/lifeBar/fixedPosition`
  - When enabled, uses `x`, `y`, `responsiveX`, `responsiveY` properties

- **x** (type 2 - number): Fixed X position in pixels
  - Default: `5`
  - Database: `client/ui/lifeBar/x`
  - Used when `fixedPosition: 1` and responsive mode is disabled

- **y** (type 2 - number): Fixed Y position in pixels
  - Default: `12`
  - Database: `client/ui/lifeBar/y`
  - Used when `fixedPosition: 1` and responsive mode is disabled

#### Responsive Positioning

- **responsiveX** (type 2 - number): Responsive X position as percentage of screen width
  - Default: `1`
  - Database: `client/ui/lifeBar/responsiveX`
  - Calculation: `uiX = responsiveX * screenWidth / 100`
  - Used when `fixedPosition: 1` and `client/ui/screen/responsive` is enabled

- **responsiveY** (type 2 - number): Responsive Y position as percentage of screen height
  - Default: `24`
  - Database: `client/ui/lifeBar/responsiveY`
  - Calculation: `uiY = responsiveY * screenHeight / 100`
  - Used when `fixedPosition: 1` and `client/ui/screen/responsive` is enabled

### Visibility Controls

- **showCurrentPlayer** (type 3 - boolean): Show lifebar for the current player
  - Default: `0` (hidden)
  - Database: `client/ui/lifeBar/showCurrentPlayer`
  - When disabled, current player's lifebar will not be displayed
  - Useful when using alternative UI systems like player stats bars

- **showAllPlayers** (type 3 - boolean): Show lifebars for all other players
  - Default: `0` (hidden)
  - Database: `client/ui/lifeBar/showAllPlayers`
  - When disabled, other players' bars only show via `showOnClick`

- **showEnemies** (type 3 - boolean): Show lifebars for NPCs and enemies
  - Default: `1` (enabled)
  - Database: `client/ui/lifeBar/showEnemies`
  - Controls all objects (NPCs/enemies)

- **showOnClick** (type 3 - boolean): Show lifebars only when target is clicked
  - Default: `1` (enabled)
  - Database: `client/ui/lifeBar/showOnClick`
  - Works for both other players and objects when their specific show flags are disabled

## Database Configuration

### Development Migration

Add to `migrations/development/[version]-sql-update.sql`:

```sql
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES
('client', 'ui/lifeBar/enabled', '1', 3),
('client', 'ui/lifeBar/fillStyle', '0xff0000', 1),
('client', 'ui/lifeBar/fixedPosition', '0', 3),
('client', 'ui/lifeBar/height', '5', 2),
('client', 'ui/lifeBar/lineStyle', '0xffffff', 1),
('client', 'ui/lifeBar/responsiveX', '1', 2),
('client', 'ui/lifeBar/responsiveY', '24', 2),
('client', 'ui/lifeBar/showAllPlayers', '0', 3),
('client', 'ui/lifeBar/showCurrentPlayer', '0', 3),
('client', 'ui/lifeBar/showEnemies', '1', 3),
('client', 'ui/lifeBar/showOnClick', '1', 3),
('client', 'ui/lifeBar/top', '5', 2),
('client', 'ui/lifeBar/width', '50', 2),
('client', 'ui/lifeBar/x', '5', 2),
('client', 'ui/lifeBar/y', '12', 2);
```

### Production Migration

From `migrations/production/reldens-basic-config-v4.0.0.sql` (IDs 181-194):

```sql
(181, 'client', 'ui/lifeBar/enabled', '1', 3),
(182, 'client', 'ui/lifeBar/fillStyle', '0xff0000', 1),
(183, 'client', 'ui/lifeBar/fixedPosition', '0', 3),
(184, 'client', 'ui/lifeBar/height', '5', 2),
(185, 'client', 'ui/lifeBar/lineStyle', '0xffffff', 1),
(186, 'client', 'ui/lifeBar/responsiveX', '1', 2),
(187, 'client', 'ui/lifeBar/responsiveY', '24', 2),
(188, 'client', 'ui/lifeBar/showAllPlayers', '0', 3),
(189, 'client', 'ui/lifeBar/showCurrentPlayer', '0', 3),
(190, 'client', 'ui/lifeBar/showEnemies', '1', 3),
(191, 'client', 'ui/lifeBar/showOnClick', '1', 3),
(192, 'client', 'ui/lifeBar/top', '5', 2),
(193, 'client', 'ui/lifeBar/width', '50', 2),
(194, 'client', 'ui/lifeBar/x', '5', 2),
(195, 'client', 'ui/lifeBar/y', '12', 2),
```

## Configuration Examples

### Example 1: Fixed Position in Top-Left Corner

```sql
UPDATE `config` SET `value` = '1' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/fixedPosition';
UPDATE `config` SET `value` = '5' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/x';
UPDATE `config` SET `value` = '5' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/y';
```

This positions the current player's lifebar at coordinates (5, 5) on the UI scene, fixed regardless of player movement.

### Example 2: Responsive Fixed Position

```sql
UPDATE `config` SET `value` = '1' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/fixedPosition';
UPDATE `config` SET `value` = '50' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/responsiveX';
UPDATE `config` SET `value` = '5' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/responsiveY';
```

This positions the current player's lifebar at 50% of screen width and 5% of screen height, adapting to different resolutions.

### Example 3: Show All Players' Lifebars

```sql
UPDATE `config` SET `value` = '1' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/showAllPlayers';
```

All other players' lifebars are always visible, floating above their sprites.

### Example 4: Hide Enemy Lifebars

```sql
UPDATE `config` SET `value` = '0' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/showEnemies';
```

NPCs and enemies will not show lifebars at all.

### Example 5: Hide Current Player Lifebar

```sql
UPDATE `config` SET `value` = '0' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/showCurrentPlayer';
```

Current player's lifebar will not be displayed. Useful when using alternative UI systems like player stats bars.

### Example 6: Always Show Bars (No Click Required)

```sql
UPDATE `config` SET `value` = '0' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/showOnClick';
UPDATE `config` SET `value` = '1' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/showAllPlayers';
UPDATE `config` SET `value` = '1' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/showEnemies';
```

All players and enemies will always show their lifebars without requiring click interaction.

### Example 7: Custom Colors and Dimensions

```sql
UPDATE `config` SET `value` = '0x00ff00' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/fillStyle';
UPDATE `config` SET `value` = '0x000000' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/lineStyle';
UPDATE `config` SET `value` = '80' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/width';
UPDATE `config` SET `value` = '8' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/height';
```

Creates a green lifebar with black border, 80 pixels wide and 8 pixels tall.

## Visibility Behavior

The current player's lifebar visibility is controlled by `showCurrentPlayer` configuration.

**Configuration: showCurrentPlayer=0, showAllPlayers=0, showEnemies=0, showOnClick=0**
- Current Player: Never
- Other Players: Never
- NPCs/Enemies: Never

**Configuration: showCurrentPlayer=0, showAllPlayers=0, showEnemies=0, showOnClick=1**
- Current Player: Never
- Other Players: On Click
- NPCs/Enemies: Never

**Configuration: showCurrentPlayer=0, showAllPlayers=0, showEnemies=1, showOnClick=1**
- Current Player: Never
- Other Players: On Click
- NPCs/Enemies: On Click

**Configuration: showCurrentPlayer=1, showAllPlayers=0, showEnemies=0, showOnClick=0**
- Current Player: Always
- Other Players: Never
- NPCs/Enemies: Never

**Configuration: showCurrentPlayer=1, showAllPlayers=0, showEnemies=1, showOnClick=1**
- Current Player: Always
- Other Players: On Click
- NPCs/Enemies: On Click

**Configuration: showCurrentPlayer=1, showAllPlayers=1, showEnemies=0, showOnClick=0**
- Current Player: Always
- Other Players: Always
- NPCs/Enemies: Never

**Configuration: showCurrentPlayer=1, showAllPlayers=1, showEnemies=1, showOnClick=0**
- Current Player: Always
- Other Players: Always
- NPCs/Enemies: Always

## Positioning Behavior

### Floating Mode (fixedPosition: 0)

- Current player's bar floats above sprite
- Other players' bars float above their sprites
- NPCs/enemies bars float above their sprites
- Bars automatically update position as sprites move
- Position calculation: `(spriteX - barWidth/2, spriteY - barHeight - top + spriteTopOffset/2)`

### Fixed Mode (fixedPosition: 1)

- **Current player only**: Bar appears at fixed position on UI scene
- Other players and NPCs/enemies always float above sprites
- Fixed position uses either:
  - Absolute coordinates: `x`, `y` properties (when responsive is disabled)
  - Responsive coordinates: `responsiveX`, `responsiveY` properties (when `client/ui/screen/responsive` is enabled)
- Bar position updates on screen resize

## Implementation Details

### Files

- **LifebarUi**: `lib/users/client/lifebar-ui.js` - Main lifebar management class
- **ObjectsHandler**: `lib/users/client/objects-handler.js` - Handles NPCs/enemies lifebars
- **Plugin**: `lib/users/client/plugin.js` - Initializes lifebar system

### Events

- `reldens.playerStatsUpdateAfter`: Updates current player's lifebar
- `reldens.joinedRoom`: Sets up message listeners for lifebar updates
- `reldens.runPlayerAnimation`: Redraws player lifebar
- `reldens.updateGameSizeBefore`: Recalculates fixed position on resize
- `reldens.playersOnRemove`: Removes player lifebar on disconnect
- `reldens.playerEngineAddPlayer`: Processes queued lifebar messages
- `reldens.createAnimationAfter`: Draws object lifebars
- `reldens.objectBodyChanged`: Updates object lifebar
- `reldens.gameEngineShowTarget`: Shows target lifebar on click
- `reldens.gameEngineClearTarget`: Hides previous target lifebar

### Bar Property

The lifebar tracks the stat configured at `client/actions/skills/affectedProperty`, which defaults to `hp`.

To change the tracked stat:

```sql
UPDATE `config` SET `value` = 'mp' WHERE `scope` = 'client' AND `path` = 'actions/skills/affectedProperty';
```

This would make lifebars track magic points instead of health points.
