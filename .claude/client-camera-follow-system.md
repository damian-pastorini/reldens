# Client Camera Follow System Architecture

This document describes how the camera follow system works in the Reldens client-side code.

## Overview

The camera follow system manages how the Phaser camera tracks the player character during gameplay. It involves multiple components across the client architecture: PlayerEngine, GameEngine, and scene management.

## Key Components

### 1. PlayerEngine (lib/users/client/player-engine.js)

**Purpose**: Manages the player character on the client-side, including camera initialization and configuration.

**Camera Configuration Properties** (lines 88-98):
```javascript
this.cameraRoundPixels = Boolean(
    this.config.getWithoutLogs('client/general/engine/cameraRoundPixels', true)
);
this.cameraInterpolationX = Number(
    this.config.getWithoutLogs('client/general/engine/cameraInterpolationX', 0.04)
);
this.cameraInterpolationY = Number(
    this.config.getWithoutLogs('client/general/engine/cameraInterpolationY', 0.04)
);
```

**Configuration Source**: These values come from the database `config` table with scope `client` and are loaded during game initialization.

### 2. Camera Initialization Flow (PlayerEngine.create())

**Execution Order** (lines 115-139):

1. **Player Sprite Creation** (line 126):
   - `this.addPlayer(this.playerId, addPlayerData)` creates the player sprite in the physics world

2. **Initial Camera Follow** (line 127):
   - `this.scene.cameras.main.startFollow(this.players[this.playerId])`
   - Camera begins tracking the player sprite

3. **Scene Visibility** (line 128):
   - `this.scene.scene.setVisible(true, this.roomName)` makes the scene visible

4. **Camera Fade-In Effect** (line 129):
   - `this.scene.cameras.main.fadeFrom(this.fadeDuration)`
   - Starts fade-in animation (default 1000ms duration)

5. **Physics World Configuration** (lines 130-132):
   - `fixedStep = false` enables variable physics timestep
   - Sets physics and camera bounds to match map dimensions

6. **Camera Fade Complete Handler** (lines 134-138):
   - Event listener triggered when fade animation completes
   - Re-initializes camera follow with interpolation settings
   - Sets lerp and roundPixels values

### 3. Phaser Camera Follow API

**startFollow() Method Signature**:
```javascript
camera.startFollow(target, roundPixels, lerpX, lerpY, offsetX, offsetY)
```

**Parameters**:
- `target`: The game object (player sprite) to follow
- `roundPixels` (optional): Boolean - force pixel-perfect rendering
- `lerpX` (optional): Number - horizontal interpolation (0-1, default 1)
- `lerpY` (optional): Number - vertical interpolation (0-1, default 1)
- `offsetX` (optional): Number - horizontal offset from target center
- `offsetY` (optional): Number - vertical offset from target center

**Lerp Behavior**:
- Value of `1`: Camera instantly snaps to target position (no interpolation)
- Value < `1`: Camera smoothly interpolates to target position
- Lower values (e.g., 0.04) = slower, smoother camera movement
- Higher values (e.g., 0.8) = faster, more responsive camera movement

### 4. GameEngine.updateGameSize() Integration

**Purpose** (lib/game/client/game-engine.js:79-106): Handles responsive behavior when window resizes or fullscreen toggles.

**Camera Lerp Adjustment** (lines 84-86, 101-104):
```javascript
if(player){
    activeScene.cameras.main.setLerp(player.cameraInterpolationX, player.cameraInterpolationY);
}
```

**Execution Flow**:
1. **Before resize operations** (line 85): Sets lerp values
2. **Timeout delay** (line 87): Waits for configured duration (default 500ms)
3. **After resize operations** (line 103): Restores lerp values

**Why Twice?**:
- First call: Prepares camera for UI element repositioning
- Second call: Ensures camera tracking restored after all resize operations complete

### 5. Event-Driven Architecture

**Scene Creation Event** (game-manager.js:248):
```javascript
this.events.on('reldens.afterSceneDynamicCreate', async () => {
    this.gameEngine.updateGameSize(this);
});
```

**Timing Sequence**:
1. Scene created
2. PlayerEngine.create() called → camera follow initialized
3. Camera fade starts (1000ms)
4. `reldens.afterSceneDynamicCreate` event fires
5. `updateGameSize()` called → adjusts camera lerp
6. Camera fade completes → lerp values set in event handler

### 6. Configuration Values

**Database Config Paths**:
- `client/general/engine/cameraRoundPixels`: Boolean (default: true)
- `client/general/engine/cameraInterpolationX`: Float (default: 0.04)
- `client/general/engine/cameraInterpolationY`: Float (default: 0.04)
- `client/players/animations/fadeDuration`: Integer milliseconds (default: 1000)
- `client/general/gameEngine/updateGameSizeTimeOut`: Integer milliseconds (default: 500)

**Config Loading**: Values are loaded from database during server initialization and sent to client in the `START_GAME` message as part of `gameConfig`.

### 7. Physics World Integration

**Fixed Step Setting** (player-engine.js:130):
```javascript
this.scene.physics.world.fixedStep = false;
```

**Impact**:
- `false`: Variable timestep - physics updates based on actual frame time
- `true`: Fixed timestep - physics updates at consistent intervals regardless of frame rate

**Camera Bounds** (lines 131-132):
```javascript
this.scene.physics.world.setBounds(0, 0, this.scene.map.widthInPixels, this.scene.map.heightInPixels);
this.scene.cameras.main.setBounds(0, 0, this.scene.map.widthInPixels, this.scene.map.heightInPixels);
```

Both physics world and camera are constrained to the map dimensions to prevent the camera from showing areas outside the game world.

### 8. Responsive Behavior

**Window Resize Listener** (game-manager.js:253-255):
```javascript
this.gameDom.getWindow().addEventListener('resize', () => {
    this.gameEngine.updateGameSize(this);
});
```

**Fullscreen Handlers** (handlers/full-screen-handler.js:57, 65):
- Entering fullscreen: `updateGameSize()` called
- Exiting fullscreen: `updateGameSize()` called

**Purpose**: Ensures camera interpolation remains consistent across different viewport sizes and display modes.

## Data Flow Summary

```
Database Config
    ↓
Server loads config
    ↓
Client receives config in START_GAME message
    ↓
PlayerEngine constructor reads config values
    ↓
PlayerEngine.create() initializes camera
    ↓
startFollow() begins tracking player
    ↓
Fade animation starts
    ↓
Camera fade completes → lerp values applied
    ↓
Window resize events → updateGameSize() maintains lerp
```

## Key Technical Points

1. **Camera initialization happens in two phases**: Initial `startFollow()` and post-fade configuration
2. **Lerp values must be passed to `startFollow()` or set via `setLerp()`** for interpolation to work
3. **Round pixels and lerp work together**: Round pixels prevents sub-pixel jitter, lerp provides smooth motion
4. **Physics timestep affects camera smoothness**: Variable timestep can cause frame-to-frame variations
5. **Responsive system maintains camera settings**: `updateGameSize()` ensures lerp persists through viewport changes

## File Locations

- **PlayerEngine**: `lib/users/client/player-engine.js`
- **GameEngine**: `lib/game/client/game-engine.js`
- **GameManager**: `lib/game/client/game-manager.js`
- **FullScreenHandler**: `lib/game/client/handlers/full-screen-handler.js`
- **Config Database**: `config` table with `scope='client'`
