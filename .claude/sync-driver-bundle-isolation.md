# Sync Driver: Bundle Isolation Architecture

The `lib/sync/` module isolates every `@colyseus/*` import behind Reldens-owned driver classes. Its folder layout is **load-bearing for Parcel**, not cosmetic. Breaking the split will pull Node-only packages (`@colyseus/monitor`, `@colyseus/core`, `@colyseus/ws-transport`) into the browser bundle and Parcel will fail with errors like:

```
Failed to resolve 'url' from '...@colyseus/monitor/build/index.mjs'
Node builtin polyfill "url/" is not installed, but auto install is disabled.
```

## Folder layout

- `lib/sync/shared/colyseus/sync-schema-driver.js` - isomorphic, browser-safe
- `lib/sync/server/colyseus/sync-server-driver.js` - Node-only
- `lib/sync/server/colyseus/room.js` - Node-only (Room wrapper, onLeave translation)
- `lib/sync/client/colyseus/sync-client-driver.js` - browser-only

Three concerns, three folders. Each folder's driver is allowed to import ONLY the package set that fits its bundle target.

## What each driver exposes

### `SyncSchemaDriver` (`lib/sync/shared/colyseus/sync-schema-driver.js`)

- `Schema`, `MapSchema`, `ArraySchema`, `type`, `defineTypes`
- Imports ONLY `@colyseus/schema` (which is browser-safe)
- Used by: `lib/users/server/player.js`, `lib/world/server/body-state.js`, `lib/world/server/object-body-state.js`, `lib/rooms/server/state.js`

### `SyncServerDriver` (`lib/sync/server/colyseus/sync-server-driver.js`)

- `Server`, `Room`, `CloseCode`, `WebSocketTransport`, `monitor`
- Imports `@colyseus/core`, `@colyseus/ws-transport`, `@colyseus/monitor` - **all Node-only**
- Used by: `lib/game/server/game-server.js`, `lib/game/server/manager.js`, `lib/rooms/server/login.js`

### `SyncClientDriver` (`lib/sync/client/colyseus/sync-client-driver.js`)

- `Client`, `getStateCallbacks`
- Imports ONLY `@colyseus/sdk`
- Used by: `lib/game/client/game-client.js`, `lib/game/client/communication/state-callbacks-manager.js`

## Why the split exists (the trap)

The browser bundle does not start at any `lib/sync/` file directly - it starts at `theme/.../index.js` and walks through `lib/game/client/`. But several **client-side** files require **server-side** files for legitimate reasons:

- `lib/world/client/debug-world-creator.js` requires `lib/world/server/p2world.js` (shared physics setup)
- `lib/prediction/client/prediction-world-creator.js` requires `lib/world/server/p2world.js` and `lib/world/server/collisions-manager.js`

`p2world.js` then requires `lib/world/server/object-body-state.js` (a schema class). The schema class requires `type` from a sync driver.

If `object-body-state.js` required from `SyncServerDriver`, Parcel would follow that into `@colyseus/monitor`. By having `object-body-state.js` require from `SyncSchemaDriver` instead, Parcel only follows into `@colyseus/schema`, which is browser-safe.

**The schema classes are isomorphic by necessity, even though they live in `server/` folders.** Their imports must be too.

## Rules for adding/changing sync drivers

1. **Never import `@colyseus/core`, `@colyseus/monitor`, or `@colyseus/ws-transport` from `shared/` or `client/`.** Parcel will pull them into the browser bundle and break.
2. **Never import `@colyseus/sdk` from `server/` or `shared/`.** The SDK is browser-only.
3. **`@colyseus/schema` is the only Colyseus package safe in all three folders.** Today only `shared/` uses it.
4. **If a new schema-using class is added under any `lib/.../server/` path, require its primitives from `SyncSchemaDriver`, not `SyncServerDriver`.** Assume it will end up in the browser bundle even if it "looks server-only".
5. **If a new client file needs to require a server-side helper (physics, geometry, etc.), trace the helper's imports to ensure they stay in `shared/` or pure-JS territory.** Adding a `require('../../sync/server/...')` anywhere along that chain re-introduces the bundle leak.
6. **The `room.js` wrapper stays under `server/`** because Colyseus `Room` is a Node-only class. Client code should never extend or instantiate it.

## Verification commands

After any change to `lib/sync/` or to schema-using files, run:

```bash
npm exec -- reldens fullRebuild
```

If Parcel fails with an `@colyseus/*` resolution error, a server-only package has leaked into the browser bundle. The fix is always: find the schema/driver import chain and route it through `SyncSchemaDriver` instead of `SyncServerDriver`.

For static checks, search for forbidden cross-folder requires:

- `SyncServerDriver` referenced from any `client/` file or from `lib/sync/shared/` → bug
- `SyncClientDriver` referenced from any `server/` file → bug
- `@colyseus/core|monitor|ws-transport` requires anywhere outside `lib/sync/server/` → bug
- `@colyseus/sdk` requires anywhere outside `lib/sync/client/` → bug
- `@colyseus/schema` requires anywhere outside `lib/sync/shared/` → bug

## Background

This module replaced the earlier `lib/communications/colyseus-driver/` design as part of the Colyseus 0.16 → 0.17 upgrade. See `_source/_claude_proposals/colyseus/colyseus-0.16-to-0.17-migration-guide-with-driver.md` for the full migration rationale.
