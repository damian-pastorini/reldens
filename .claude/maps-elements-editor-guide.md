# Maps Elements Editor - Guide

End-user flow and implementer reference for the post-generation map element editor.

## End-user flow

### Where to launch the editor

- Maps Wizard preview page: an "Edit Map Elements" button next to each generated map's preview canvas (main map or sub-map). Click to enter edit mode on that canvas.
- Rooms entity view/edit page: button rendered in the extra-contents block and relocated next to the `map_filename` field. Hidden when the room has no map.

### What you can do in edit mode

- Hover an element: every tile of every layer of that element highlights blue.
- Mousedown on an element: drag starts immediately. Original tiles fade, a green ghost follows the cursor (red if any tile would land out of bounds). Mouseup commits the move, or snaps back if out of bounds. Other elements are inert during a drag.
- Right-click an element: a sub-menu offers Duplicate and Delete. The sub-menu closes when a drag begins.
- Duplicate: creates a copy of the element with the next available numeric suffix (e.g. `tree-001` -> `tree-002`) at a small offset. Drag it where you want.
- Delete: confirmation modal -> removes every tile of every layer of that element. Drags blocked while the modal is open.
- Resize Map: opens a panel with `Tiles to remove horizontally`, `Tiles to remove vertically`, and a 3x3 anchor picker. No default anchor; the Confirm button stays disabled until you pick one. Confirm shrinks the map and re-stamps the borders layer if border tile properties exist on the tileset. If any element would fall outside the new bounds, the resize is blocked.

### Saving and rolling back

- Save: writes the current state to `generate-data/generated/{mapName}.json` (and the elements elements record). A timestamped backup pair (`{mapName}-{YYYY-MM-DD-HH-mm-ss}-back.json` plus the matching elements elements record) is written to `generate-data/generated/backups/` before the live file is overwritten. From the room entry point, the runtime copies in `theme/default/assets/maps/` and `dist/assets/maps/` are also overwritten (without backups - they are always reproducible from the source-of-truth).
- Game server reboot: required for in-game pickup after saving from the room entry point (same constraint as map regeneration).
- Backups panel: collapsed by default. Lists existing backups newest-first. Each row has Reload (restores the chosen backup; a pre-restore backup is written first so the restore is itself reversible) and Delete (removes the backup pair).

### Legacy maps

If a room has no elements elements record and no `tilesetSessionId` in its `customData`, the editor falls back to parsing element groupings from layer names (`{elementName}-{index}-{layerType}` convention). A warning banner is shown. Only elements the detector recognises are interactive; anything else renders but cannot be moved / duplicated / deleted.

## Implementer reference

### Files

Server:

- `lib/admin/server/map-elements-builder.js`: thin Reldens wrapper around `@reldens/tile-map-generator`'s `ElementsFromLayersLoader`; adds Reldens metadata (schemaVersion, mapName, mapFileName, tilesetSessionId, compositeFile, generatedBy, generatedAt, tile/map dims) and owns the persistence filename convention. Exposes `build(props)`, `buildFromLayers(mapJson)`, `elementsFileName(mapName)`.
- `lib/admin/server/map-elements-backup-archive.js`: owns the backups folder; writes/lists/restores/deletes backup pairs.
- `lib/admin/server/map-elements-custom-data-writer.js`: post-import writer that stamps `tilesetSessionId` and `mapElementsFile` into `rooms.customData`.
- `lib/admin/server/map-elements-records-emitter.js`: emits the elements record file at generation time by walking the wizard runner output (per main map, per multi-map, per sub-map).
- `lib/admin/server/subscribers/maps-elements-editor-subscriber.js`: hosts the 5 admin routes.
- `lib/admin/server/subscribers/maps-wizard-subscriber.js`: instantiates `MapElementsCustomDataWriter` and `MapElementsRecordsEmitter`; invokes the emitter after `MapsWizardRunner.run()` succeeds.

Client:

- `theme/admin/js/maps-elements-editor/maps-elements-editor.js`: top-level controller.
- `theme/admin/js/maps-elements-editor/map-elements-canvas-painter.js`: canvas rendering (base, hover, ghost).
- `theme/admin/js/maps-elements-editor/element-mover.js`: drag/move logic.
- `theme/admin/js/maps-elements-editor/element-duplicator.js`: duplicate with next-suffix.
- `theme/admin/js/maps-elements-editor/element-deleter.js`: delete + clear tiles.
- `theme/admin/js/maps-elements-editor/map-resizer.js` + `map-resizer-borders.js`: resize + border re-stamp.
- `theme/admin/js/maps-elements-editor/editor-context-menu.js`: right-click menu.
- `theme/admin/js/maps-elements-editor/editor-save.js`: POST to the save route.
- `theme/admin/js/maps-elements-editor/editor-backups-panel.js`: list/reload/delete backups.
- `theme/admin/js/maps-elements-editor/elements-loader.js`: priority chain loader.
- `theme/admin/js/shared/element-name-suffix.js`: shared next-suffix helper used by the tileset editor's namer and the duplicator.

### Sidecar schema

`generate-data/generated/{mapName}-room-map-elements.json`:

```
{
  "schemaVersion": 1,
  "mapName": "town-001",
  "mapFileName": "town-001.json",
  "tilesetSessionId": "2026-05-28-12-34-56-my-town",
  "compositeFile": "composite.json",
  "generatedAt": "...",
  "generatedBy": "elements-composite-loader",
  "tileWidth": 32,
  "tileHeight": 32,
  "mapWidth": 60,
  "mapHeight": 40,
  "bordersLayer": "borders",
  "elements": [
    {
      "instanceId": "tree-001",
      "elementKey": "tree",
      "index": 1,
      "bounds": { "col": 12, "row": 7, "width": 2, "height": 3 },
      "layers": [
        { "name": "tree-001-below-player", "type": "below-player", "tiles": [{ "col": 12, "row": 7, "gid": 158 }] },
        { "name": "tree-001-collisions", "type": "collisions", "tiles": [{ "col": 12, "row": 9, "gid": 168 }] }
      ]
    }
  ]
}
```

### Priority chain (editor load)

1. Try `{mapName}-room-map-elements.json` next to the map JSON.
2. Else, if `room.customData.tilesetSessionId` is set, derive from the session.
3. Else, call `GET /reldens-admin/maps-elements-editor/api/build-elements-from-layers?mapName=X` (uses `MapElementsBuilder.buildFromLayers()` server-side, which delegates to `@reldens/tile-map-generator`'s `ElementsFromLayersLoader`) and show the "Detected by layer names" warning banner.
4. If none works, the editor refuses to load.

### Admin routes

- `POST /reldens-admin/maps-elements-editor/api/save-map-edit` - body `{ mapName, sessionId, context, mapJson, mapElements }`. Backs up the live pair to `generate-data/generated/backups/`, writes the new live pair, optionally syncs runtime copies for `context: 'room'`.
- `GET /reldens-admin/maps-elements-editor/api/list-backups?mapName=X` - returns `{ backups: [{ timestamp, mapJsonPath, elementsFilePath, sizeBytes }] }` newest-first.
- `POST /reldens-admin/maps-elements-editor/api/restore-backup` - body `{ mapName, backupTimestamp, context }`. Writes a pre-restore backup pair first, then swaps in the chosen pair. Room context re-copies to runtime folders.
- `POST /reldens-admin/maps-elements-editor/api/delete-backup` - body `{ mapName, backupTimestamp, context }`. Removes the chosen pair from the backups folder.
- `GET /reldens-admin/maps-elements-editor/api/build-elements-from-layers?mapName=X` - returns `{ mapElements: {...}, warnings: [...] }` for the legacy-map fallback.

### Folder layout

- Source-of-truth: `generate-data/generated/{mapName}.json` and `generate-data/generated/{mapName}-room-map-elements.json`.
- Backups: `generate-data/generated/backups/{mapName}-{YYYY-MM-DD-HH-mm-ss}-back.json` and `{mapName}-{YYYY-MM-DD-HH-mm-ss}-back-room-map-elements.json`.
- Runtime: `theme/default/assets/maps/{mapName}.json` and `dist/assets/maps/{mapName}.json`. Not backed up; always reproducible.

### Logging

`Logger.info` on successful save / restore / delete. `Logger.warning` when layer-name detection is used or border properties are missing. `Logger.error` on validation or write failures. Never log full payloads.
