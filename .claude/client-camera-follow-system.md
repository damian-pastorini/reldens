# Client Camera Follow System Architecture

This document describes how the camera follow system works in the Reldens client-side code.

## Overview

The camera follow system manages how the Phaser camera tracks the player character during gameplay. It involves multiple components across the client architecture: PlayerEngine, GameEngine, and scene management.

## Key Components

### 1. PlayerEngine (lib/users/client/player-engine.js)

**Purpose**: Manages the player character on the client-side, including camera initialization and configuration.

**Camera Configuration Properties** (`PlayerEngine` constructor):
```javascript
this.cameraRoundPixels = Boolean(
    this.config.getWithoutLogs('client/general/engine/cameraRoundPixels', false)
);
this.cameraInterpolationX = Number(
    this.config.getWithoutLogs('client/general/engine/cameraInterpolationX', 0.02)
);
this.cameraInterpolationY = Number(
    this.config.getWithoutLogs('client/general/engine/cameraInterpolationY', 0.02)
);
```

**Configuration Source**: These paths are not seeded by the migrations, so unless the rows are created manually the hardcoded fallbacks above are used. When the rows exist they are read from the `config` table with scope `client` and loaded during game initialization.

### 2. Camera Initialization Flow (PlayerEngine.create())

**Execution Order** (`PlayerEngine.create()`, in this order):

1. **Player Sprite Creation**:
   - `this.addPlayer(this.playerId, addPlayerData)` creates the player sprite in the physics world

2. **Scene Visibility**:
   - `this.scene.scene.setVisible(true, this.roomName)` makes the scene visible

3. **Camera Fade-In Effect**:
   - `this.scene.cameras.main.fadeFrom(this.fadeDuration)`
   - Starts fade-in animation (default 1000ms duration)

4. **Physics World Configuration**:
   - `fixedStep = false` enables variable physics timestep
   - Sets physics and camera bounds to match map dimensions

5. **Scene Camera Flag**:
   - `this.scene.cameras.main.setIsSceneCamera(true)`

6. **Camera Follow**:
   - `this.scene.cameras.main.startFollow(...)` receives the player sprite plus the roundPixels and both interpolation values in a single call:

```javascript
this.scene.cameras.main.startFollow(
    this.players[this.playerId],
    this.cameraRoundPixels,
    this.cameraInterpolationX,
    this.cameraInterpolationY
);
```

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

**Purpose** (`lib/game/client/game-engine.js` `GameEngine.updateGameSize()`): Handles responsive behavior when window resizes or fullscreen toggles.

**Camera Lerp Adjustment** (at the start of `updateGameSize()`, and again at the end of its `setTimeout()` callback):
```javascript
if(player){
    // automatically fix the camera position to the player:
    activeScene.cameras.main.setLerp(player.cameraInterpolationX, player.cameraInterpolationY);
}
```

**Execution Flow**:
1. **Before resize operations**: Sets lerp values
2. **Timeout delay**: the resize operations run in a `setTimeout()` that waits for `client/general/gameEngine/updateGameSizeTimeOut` (code fallback `0`, seeded value `500`)
3. **After resize operations** (after `reldens.updateGameSizeAfter` is emitted): Restores lerp values

**Why Twice?**:
- First call: Prepares camera for UI element repositioning
- Second call: Ensures camera tracking restored after all resize operations complete

### 5. Event-Driven Architecture

**Scene Creation Event** (`lib/game/client/game-manager.js` `GameManager.activateResponsiveBehavior()`):
```javascript
this.events.on('reldens.afterSceneDynamicCreate', async () => {
    if(!this.config.getWithoutLogs('client/ui/screen/responsive', true)){
        return;
    }
    this.gameEngine.updateGameSize(this);
    this.gameDom.getWindow().addEventListener('resize', () => {
        this.gameEngine.updateGameSize(this);
    });
});
```

**Timing Sequence**:
1. Scene created
2. PlayerEngine.create() called - camera fade starts (1000ms), then camera follow initialized with lerp and roundPixels
3. `reldens.afterSceneDynamicCreate` event fires
4. `updateGameSize()` called - adjusts camera lerp

### 6. Configuration Values

**Database Config Paths**:
- `client/general/engine/cameraRoundPixels`: Boolean (not seeded, code fallback: false)
- `client/general/engine/cameraInterpolationX`: Float (not seeded, code fallback: 0.02)
- `client/general/engine/cameraInterpolationY`: Float (not seeded, code fallback: 0.02)
- `client/players/animations/fadeDuration`: Integer milliseconds (seeded: 1000)
- `client/general/gameEngine/updateGameSizeTimeOut`: Integer milliseconds (seeded: 500, code fallback: 0)

**Config Loading**: Values are loaded from database during server initialization and sent to client in the `START_GAME` message as part of `gameConfig`.

### 7. Physics World Integration

**Fixed Step Setting** (`PlayerEngine.create()`):
```javascript
this.scene.physics.world.fixedStep = false;
```

**Impact**:
- `false`: Variable timestep - physics updates based on actual frame time
- `true`: Fixed timestep - physics updates at consistent intervals regardless of frame rate

**Camera Bounds** (`PlayerEngine.create()`):
```javascript
this.scene.physics.world.setBounds(0, 0, this.scene.map.widthInPixels, this.scene.map.heightInPixels);
this.scene.cameras.main.setBounds(0, 0, this.scene.map.widthInPixels, this.scene.map.heightInPixels);
```

Both physics world and camera are constrained to the map dimensions to prevent the camera from showing areas outside the game world.

### 8. Responsive Behavior

**Window Resize Listener** (`GameManager.activateResponsiveBehavior()`):
```javascript
this.gameDom.getWindow().addEventListener('resize', () => {
    this.gameEngine.updateGameSize(this);
});
```

**Fullscreen Handlers** (`lib/game/client/handlers/full-screen-handler.js`):
- Entering fullscreen: `FullScreenHandler.goFullScreen()` calls `updateGameSize()`
- Exiting fullscreen: `FullScreenHandler.exitFullScreen()` calls `updateGameSize()`

**Purpose**: Ensures camera interpolation remains consistent across different viewport sizes and display modes.

## Data Flow Summary

1. Database Config
2. Server loads config
3. Client receives config in START_GAME message
4. PlayerEngine constructor reads config values
5. PlayerEngine.create() initializes camera
6. Fade animation starts
7. startFollow() begins tracking player with the roundPixels and lerp values
8. Window resize events - updateGameSize() maintains lerp

## Key Technical Points

1. **Camera follow is configured in a single `startFollow()` call**, after the fade is started
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
