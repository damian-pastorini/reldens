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

## Environment Variable

```bash
RELDENS_CLIENT_PLAYERS_BARSPROPERTIES={"hp":{"enabled":true,"label":"HP","activeColor":"#ff0000","inactiveColor":"#330000"},"mp":{"enabled":true,"label":"MP","activeColor":"#0000ff","inactiveColor":"#000033"}}
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
('client', 'ui/lifeBar/showEnemies', '1', 3),
('client', 'ui/lifeBar/showOnClick', '1', 3),
('client', 'ui/lifeBar/top', '5', 2),
('client', 'ui/lifeBar/width', '50', 2),
('client', 'ui/lifeBar/x', '5', 2),
('client', 'ui/lifeBar/y', '12', 2);
```

### Production Migration

From `migrations/production/reldens-basic-config-v4.0.0.sql` (IDs 180-193):

```sql
(180, 'client', 'ui/lifeBar/enabled', '1', 3),
(181, 'client', 'ui/lifeBar/fillStyle', '0xff0000', 1),
(182, 'client', 'ui/lifeBar/fixedPosition', '0', 3),
(183, 'client', 'ui/lifeBar/height', '5', 2),
(184, 'client', 'ui/lifeBar/lineStyle', '0xffffff', 1),
(185, 'client', 'ui/lifeBar/responsiveX', '1', 2),
(186, 'client', 'ui/lifeBar/responsiveY', '24', 2),
(187, 'client', 'ui/lifeBar/showAllPlayers', '0', 3),
(188, 'client', 'ui/lifeBar/showEnemies', '1', 3),
(189, 'client', 'ui/lifeBar/showOnClick', '1', 3),
(190, 'client', 'ui/lifeBar/top', '5', 2),
(191, 'client', 'ui/lifeBar/width', '50', 2),
(192, 'client', 'ui/lifeBar/x', '5', 2),
(193, 'client', 'ui/lifeBar/y', '12', 2),
```

## Environment Variables

```bash
RELDENS_CLIENT_UI_LIFEBAR_ENABLED=1
RELDENS_CLIENT_UI_LIFEBAR_FILLSTYLE=0xff0000
RELDENS_CLIENT_UI_LIFEBAR_FIXEDPOSITION=0
RELDENS_CLIENT_UI_LIFEBAR_HEIGHT=5
RELDENS_CLIENT_UI_LIFEBAR_LINESTYLE=0xffffff
RELDENS_CLIENT_UI_LIFEBAR_RESPONSIVEX=1
RELDENS_CLIENT_UI_LIFEBAR_RESPONSIVEY=24
RELDENS_CLIENT_UI_LIFEBAR_SHOWALLPLAYERS=0
RELDENS_CLIENT_UI_LIFEBAR_SHOWENEMIES=1
RELDENS_CLIENT_UI_LIFEBAR_SHOWONCLICK=1
RELDENS_CLIENT_UI_LIFEBAR_TOP=5
RELDENS_CLIENT_UI_LIFEBAR_WIDTH=50
RELDENS_CLIENT_UI_LIFEBAR_X=5
RELDENS_CLIENT_UI_LIFEBAR_Y=12
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

### Example 5: Always Show Bars (No Click Required)

```sql
UPDATE `config` SET `value` = '0' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/showOnClick';
UPDATE `config` SET `value` = '1' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/showAllPlayers';
UPDATE `config` SET `value` = '1' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/showEnemies';
```

All players and enemies will always show their lifebars without requiring click interaction.

### Example 6: Custom Colors and Dimensions

```sql
UPDATE `config` SET `value` = '0x00ff00' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/fillStyle';
UPDATE `config` SET `value` = '0x000000' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/lineStyle';
UPDATE `config` SET `value` = '80' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/width';
UPDATE `config` SET `value` = '8' WHERE `scope` = 'client' AND `path` = 'ui/lifeBar/height';
```

Creates a green lifebar with black border, 80 pixels wide and 8 pixels tall.

## Visibility Behavior

The current player's lifebar is always visible when enabled, regardless of other settings.

**Configuration: showAllPlayers=0, showEnemies=0, showOnClick=0**
- Current Player: Always
- Other Players: Never
- NPCs/Enemies: Never

**Configuration: showAllPlayers=0, showEnemies=0, showOnClick=1**
- Current Player: Always
- Other Players: On Click
- NPCs/Enemies: Never

**Configuration: showAllPlayers=0, showEnemies=1, showOnClick=0**
- Current Player: Always
- Other Players: Never
- NPCs/Enemies: Always

**Configuration: showAllPlayers=0, showEnemies=1, showOnClick=1**
- Current Player: Always
- Other Players: On Click
- NPCs/Enemies: On Click

**Configuration: showAllPlayers=1, showEnemies=0, showOnClick=0**
- Current Player: Always
- Other Players: Always
- NPCs/Enemies: Never

**Configuration: showAllPlayers=1, showEnemies=0, showOnClick=1**
- Current Player: Always
- Other Players: Always
- NPCs/Enemies: Never

**Configuration: showAllPlayers=1, showEnemies=1, showOnClick=0**
- Current Player: Always
- Other Players: Always
- NPCs/Enemies: Always

**Configuration: showAllPlayers=1, showEnemies=1, showOnClick=1**
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
