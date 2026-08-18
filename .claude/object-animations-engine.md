# Object Animations Engine

How a DB `objects` row becomes an animated sprite on the client, what each param
does, and how to reuse one spritesheet across many objects.

Main class: `lib/objects/client/animation-engine.js` (`AnimationEngine`).

## The one thing to understand: two different keys

An object row has two keys that do completely different jobs. Mixing them up is the
usual source of bugs.

- `client_key`: the object INSTANCE identity. Keys the sprite in the scene, hit
  routing, life bars, targeting and battle lookups. MUST be unique per object.
- `asset_key`: the loaded TEXTURE (spritesheet) name, just points at a PNG. Many
  objects can share it.

`asset_key` lives in `client_params`. If you omit it, it falls back to `client_key`.

Rule of thumb:
- Want two objects to be separate things in the game: give them different `client_key`.
- Want them to draw the same sprite: give them the same `asset_key`.

## Reuse one spritesheet across many objects (the recipe)

Give every object a UNIQUE `client_key`, point them all at the SAME `asset_key`, and
create only ONE assets row for that texture. The others reuse the already-loaded
texture, no assets row of their own needed.

DB example: three doors that look identical but are three real, independent doors.

```sql
-- objects: unique client_key each, same asset_key in client_params
INSERT INTO `objects` (`room_id`,`layer_name`,`tile_index`,`class_type`,`object_class_key`,`client_key`,`private_params`,`client_params`,`enabled`) VALUES
(21,'merge-collisions',3522,2,'door_3','door_house_3','{"runOnHit":true,"roomVisible":true,"yFix":6}','{"positionFix":{"y":-18},"frameStart":0,"frameEnd":3,"repeat":0,"hideOnComplete":false,"autoStart":false,"restartTime":2000,"asset_key":"door_house_3"}',1),
(21,'merge-collisions',3534,2,'door_4','door_house_4','{"runOnHit":true,"roomVisible":true,"yFix":6}','{"positionFix":{"y":-18},"frameStart":0,"frameEnd":3,"repeat":0,"hideOnComplete":false,"autoStart":false,"restartTime":2000,"asset_key":"door_house_3"}',1),
(21,'merge-collisions',4800,2,'door_5','door_house_5','{"runOnHit":true,"roomVisible":true,"yFix":6}','{"positionFix":{"y":-18},"frameStart":0,"frameEnd":3,"repeat":0,"hideOnComplete":false,"autoStart":false,"restartTime":2000,"asset_key":"door_house_3"}',1);

-- objects_assets: ONE row for the shared texture (attach it to the first door only)
INSERT INTO `objects_assets` (`object_id`,`asset_type`,`asset_key`,`asset_file`,`extra_params`) VALUES
(<door_3 id>,'spritesheet','door_house_3','door-a-x3.png','{"frameWidth":32,"frameHeight":64}');
```

Result: the `door_house_3` texture loads once; each door is its own instance, so a hit
animates the exact door you hit.

Do NOT give the three doors the same `client_key`. They then overwrite each other in
the client scene registry (only one sprite survives) and life-bar/targeting lookups
resolve to the wrong or a missing instance and crash. Sharing the texture is done with
`asset_key`, never by sharing `client_key`.

## Parameters

Values shown are from the door example above.

### private_params (server side, control WHEN the animation fires)

- `runOnHit`: play when the player collides with the object body. Door: `true`.
- `roomVisible`: broadcast the animation to everyone in the room. Door: `true`.
- `playerVisible`: send only to the player who triggered it, instead of the room. Door: unset.
- `yFix` (and `xFix`): shift the SERVER body + anchor by N pixels; moves collision AND render. Door: `6`.

### client_params (client side, control HOW it looks/plays)

- `asset_key`: texture to draw, shared across objects; falls back to `client_key`. Door: `door_house_3`.
- `frameStart` / `frameEnd`: first/last spritesheet frame; `0..3` = 4 frames. Door: `0` / `3`.
- `repeat`: loop count; `0` = play once, `-1` = loop forever (the default when unset). Door: `0`.
- `autoStart`: play immediately on creation (needs more than 1 frame). Door: `false`.
- `hideOnComplete`: Phaser hides the sprite when the animation finishes. Door: `false`.
- `restartTime`: milliseconds after finishing to reset to the first frame and pause. Door: `2000`.
- `positionFix` `{x,y}`: shift ONLY the rendered sprite, not the collision body. Door: `{y:-18}`.
- `enabled`: if false, no sprite is created (logs `Animation disabled`); default true. Door: inherits true.

Note: `hideOnComplete` (hide) is different from `destroyOnComplete` (remove entirely).

## Object position

```
server body / anchor = tilePixel + yFix          (collision uses THIS)
rendered sprite       = tilePixel + yFix + positionFix
```

- `yFix` moves the real object (collision + render).
- `positionFix` nudges only the drawing, to line the art up over the body.

Door: body at `tileY + 6`, sprite drawn at `tileY + 6 - 18 = tileY - 12`.

### Aligning a sprite taller than the tile

The sprite has no `setOrigin`, so Phaser uses origin `0.5, 0.5`: the sprite is drawn
CENTERED on the tile center. A sprite taller than the tile therefore spills equally
above and below the tile, and its foot does not rest on the tile.

To make the foot sit on the tile, raise it by half the overshoot:

```
positionFix.y ≈ -(frameHeight - tileHeight) / 2      (then nudge a few px for empty art)
```

`positionFix` is a FIXED offset, it does not scale with the sprite. Each sprite
HEIGHT needs its own `positionFix.y`. If the sprite height changes by N pixels, adjust
`positionFix.y` by `-N/2` (taller sprite = more negative).

Examples on a 32px tile:

- 64px sprite: `-(64-32)/2 = -16` (the doors use `-18`, 2px extra for art padding).
- 68px sprite (same art, 4px taller): `-18 - (68-64)/2 = -20`.

## Lifecycle (what happens at runtime)

1. Server sends each object's `client_params` to the client as animation data.
2. `AnimationEngine` is constructed from those params.
3. `createAnimation()`:
   - if `enabled` is false, stop (logs `Animation disabled`);
   - if the `asset_key` texture is not loaded yet, load it and retry;
   - register a Phaser animation named after `client_key`, using the `asset_key` frames;
   - create the sprite at the computed position and store it in the scene under
     `client_key`;
   - if `autoStart`, play now.
4. On hit, the server broadcasts the animation message; the client finds the sprite by
   `client_key` and calls `runAnimation()` to play it. `restartTime` resets it after.

## Code map (for maintainers)

- Key resolution: `animation-engine.js:80` `this.asset_key = sc.get(props, 'asset_key', props.key)`.
- Instance registry (keyed by `client_key`): `animation-engine.js:222`
  `currentScene.objectsAnimations[this.key] = this`.
- Hit routing (by `client_key`): `lib/objects/client/plugin.js:290-293`.
- Texture load (by `asset_key`, one per assets row): `lib/game/client/scene-preloader.js:198`.
- Position math: server `lib/world/server/p2world.js:640-643`; client `calculateAnimPosition`
  in `animation-engine.js` and sprite placement around `:211-214`.
- Server params: defaults in `lib/objects/server/object/type/animation-object.js:33-43`;
  `client_key`/param mapping in `lib/objects/server/object/type/base-object.js`.
- `client_key` is also the lookup key for life bars, battle and targeting
  (`lib/actions/client/receiver-wrapper.js`, `lib/game/client/scene-dynamic.js`), which is
  why it must be unique.
