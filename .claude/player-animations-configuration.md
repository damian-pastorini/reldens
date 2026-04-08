# Player Animations Configuration

## Overview

Player sprite animations and size are configured via the `config` table (database-driven).
There is no dedicated entity for animations — all values are stored as config rows.

## Player Size

Controls the spritesheet frame dimensions used when loading the player sprite.

**Scope**: `client`

- `client/players/size/width` — frame width in pixels (default: `52`)
- `client/players/size/height` — frame height in pixels (default: `71`)

These are read in `lib/game/client/scene-preloader.js` at preload time and used for:
- Spritesheet loading via Phaser `load.spritesheet()`
- Character selection avatar preview UI

Note: size is global only. Per-class-path size is not implemented yet.

## Animation Frames

Frame ranges define which spritesheet frames correspond to each movement direction.

### Default frames (fallback for all class paths)

**Config key**: `client/players/animations/defaultFrames`
**Type**: JSON

```json
{
    "left":  { "start": 3, "end": 5 },
    "right": { "start": 6, "end": 8 },
    "up":    { "start": 9, "end": 11 },
    "down":  { "start": 0, "end": 2 }
}
```

### Per-class-path frame overrides

**Config key**: `client/players/animations/{avatarKey}Frames`
**Type**: JSON

Where `avatarKey` is the `key` field of the `skills_class_path` record for that class path.

Example for a class path with `key = "mage"`:
- Config path: `client/players/animations/mageFrames`

```json
{
    "left":  { "start": 9,  "end": 11 },
    "right": { "start": 3,  "end": 5  },
    "up":    { "start": 6,  "end": 8  },
    "down":  { "start": 0,  "end": 2  }
}
```

If no per-class-path config row exists, the `defaultFrames` value is used as fallback.

**Resolution logic** (`lib/game/client/scene-preloader.js:409-411`):
```javascript
let avatarFrames = this.gameManager.config.getWithoutLogs(
    'client/players/animations/'+avatarKey+'Frames',
    this.gameManager.config.get('client/players/animations/defaultFrames')
);
```

### How avatarKey is assigned

The `avatarKey` is set server-side from `skills_class_path.key` in
`lib/actions/server/player-enricher.js:72` and sent to the client as part of
player state data.

## Other animation config keys

- `client/players/animations/fallbackImage` — sprite filename to use when no class-path sprite is found (default: `GameConst.IMAGE_PLAYER_BASE`)
- `client/players/animations/basedOnPress` — if `true`, animation plays on key press; if `false`, plays based on position delta
- `client/players/animations/collideWorldBounds` — whether player physics body collides with world bounds
- `client/players/animations/fadeDuration` — fade duration in ms for player death/respawn transitions
- `client/players/animations/diagonalHorizontal` — if `true`, horizontal animation plays during diagonal movement

## Sprite loading flow

1. Server sends class path data (including `key`) to client with initial game data
2. `lib/actions/client/preloader-handler.js` iterates all class paths and calls
   `load.spritesheet(avatarKey, '/assets/custom/sprites/'+avatarKey+'.png', playerSpriteSize)`
3. After load, `createPlayerAnimations(avatarKey)` is called which reads the per-class-path
   or default frame config and registers Phaser animations keyed as `{avatarKey}_{direction}`
   (e.g. `mage_left`, `mage_right`, `mage_up`, `mage_down`)
4. If the sprite file is not found in loaded assets, it falls back to `GameConst.IMAGE_PLAYER`
