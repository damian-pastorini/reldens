# Maps Elements Editor - Guide

End-user flow and implementer reference for the post-generation map element editor.

## End-user flow

### Where to launch the editor

- Maps Wizard preview page: an "Edit Map Elements" button next to each generated map's preview canvas (main map or sub-map). Click to enter edit mode on that canvas.
- Rooms entity view/edit page: button rendered in the extra-contents block and relocated next to the `map_filename` field. Hidden when the room has no map.

### What you can do in edit mode

- Hover an element: every tile of every layer of that element highlights blue.
- Mousedown on an element: drag starts immediately. Only the dragged element's tiles are overlaid with the green ghost at the cursor's tile-aligned position (no whole-layer fade - co-located elements stay untouched). Ghost renders red if any tile would land out of bounds. Mouseup commits the move, or snaps back if out of bounds. Other elements are inert during a drag.
- Right-click an element: a sub-menu offers Move up, Move down, Duplicate and Delete. The sub-menu closes when a drag begins or when clicking outside the menu.
- Move up / Move down: swaps this element's whole layer block with the next/previous ELEMENT's layer block in `mapJson.layers` (non-element layers in between are skipped, not split). Move up renders the element earlier (further behind); Move down renders it later (closer / on top). Useful for tweaking the 2.5D paint order when the automatic bottom-row sort isn't what you want.
- Duplicate (placing mode, not instant): right-click -> Duplicate -> a ghost (the source element's tiles, shifted to the cursor) follows the mouse. Click on the canvas to place at the current tile position. Press **Escape** OR click the toolbar's red **Cancel duplication** button to abort. The ghost renders red when out-of-bounds (cannot place there). On commit, the new record gets the next available numeric suffix per elementKey (`tree-001` -> `tree-002`).
- Delete: confirmation modal -> removes every tile of every layer of that element. The cleared layer is also pruned from `mapJson.layers` if it becomes all zeros, so no empty layers persist. Drags blocked while the modal is open.
- Resize Map: opens a panel with `Tiles to remove horizontally`, `Tiles to remove vertically`, and a 3x3 anchor picker. No default anchor; the Confirm button stays disabled until you pick one. Confirm shrinks the map and re-stamps the borders layer if border tile properties exist on the tileset. If any element would fall outside the new bounds, the resize is blocked and the offending instance IDs are surfaced in a `.resize-error` paragraph.
- Reset: toolbar button. Restores the LAST LOADED state - the in-memory snapshot is refreshed on every `editor.load()` (initial load AND after a backup restore via the Backups panel). Shows a confirmation dialog before discarding changes.
- Zoom controls: at the right edge of the toolbar (`-` button, `<percent>%` label, `+` button). Range 25%-400% in 25% steps. Implemented by setting `canvas.style.width`/`canvas.style.height` (NOT a CSS transform). The canvas sits inside a `.editor-canvas-scroll` wrapper with `overflow: auto`, and the parent `.wizard-map-option-container` also has `overflow: auto` so the LI shows scrollbars when the scaled canvas exceeds it. `canvasToTile()` uses `getBoundingClientRect().width` so click-to-tile coords stay correct at every zoom level.
- Save button flash: shows "Saved" or "Save failed" briefly (1.5s) after click; timer cancels and resets if the user clicks again.
- Dirty indicator: orange "Unsaved changes" text shown whenever any mutation happens; cleared after a successful save or after Reset.
- Cancel duplication button: hidden by default, shown only while the duplicator is in placing mode.

### Saving and rolling back

- Save: writes the current state to `generate-data/generated/{mapName}.json` (and the elements record). A timestamped backup pair (`{mapName}-{YYYY-MM-DD-HH-mm-ss}-back.json` plus the matching elements record) is written to `generate-data/generated/backups/` before the live file is overwritten. From the room entry point, the runtime copies in `theme/default/assets/maps/` and `dist/assets/maps/` are also overwritten (without backups - they are always reproducible from the source-of-truth).
- Game server reboot: required for in-game pickup after saving from the room entry point (same constraint as map regeneration).
- Initial backup: auto-created on `editor.load()`. The first time the editor opens a map, if there are no existing backups, the server writes one via `backupArchive.writeBackupPair(mapName)`. So **Reload Backup -> Initial state** always works as a roll-back path even on a map that has never been saved through the editor.
- Backups panel: `hidden` by default and toggled via the Backups toolbar button (no longer "collapsed"). Lists existing backups newest-first. Each row uses `EditorButtonFactory.create()` for Reload (restores the chosen backup; a pre-restore backup is written first so the restore is itself reversible) and Delete (removes the backup pair). The panel is `width: fit-content`, `max-height: 11rem`, `overflow-y: auto` so up to ~3 rows show with vertical scroll.

### Legacy maps

If a room has no elements record on disk, the editor falls back to the server-side `build-elements-from-layers` endpoint, which parses layer names (`{elementName}-{index}-{layerType}` convention). Only elements the detector recognises are interactive; anything else renders but cannot be moved / duplicated / deleted.

## Implementer reference

### Files

Server:

- `lib/admin/server/map-elements-builder.js`: thin Reldens wrapper around `@reldens/tile-map-generator`'s `ElementsFromLayersLoader`; adds Reldens metadata (schemaVersion, mapName, mapFileName, tilesetSessionId, compositeFile, generatedBy, generatedAt, tile/map dims) and owns the persistence filename convention. Exposes `build(props)`, `buildFromLayers(mapJson)`, `elementsFileName(mapName)`.
- `lib/admin/server/map-elements-backup-archive.js`: owns the backups folder; writes/lists/restores/deletes backup pairs. `writeBackupPair(mapName)` is called by both `save-map-edit` (pre-save) and `ensure-initial-backup` (on first editor open).
- `lib/admin/server/map-elements-custom-data-writer.js`: post-import writer that stamps `tilesetSessionId` and `mapElementsFile` into `rooms.customData`.
- `lib/admin/server/map-elements-records-emitter.js`: emits the elements record file at generation time by walking the wizard runner output (per main map, per multi-map, per sub-map). Every emit path runs the generated map through `mapJsonForRecords(generatedMap, generator)` which picks `generator.preMergeLayers` when present and then routes the layers through `LayerComponentSplitter.splitMapLayers()` (imported from `@reldens/tile-map-generator`).
- `@reldens/tile-map-generator` → `LayerComponentSplitter` (`npm-packages/tile-map-generator/lib/map/layer-component-splitter.js`): groups element layers by source `instanceId`; finds connected components in the UNION of all layers per instance (so `tree-001-base` and `tree-001-collisions` components line up spatially); each component emits one renamed layer per source layer using a globally unique counter PER elementKey base. End result: spatially distinct placements that were merged into a single shared layer come back out as one record per instance (`tree-1`, `tree-2`, ...) with no instanceId collisions across element groups. KNOWN LIMITATION: instances whose tiles are spatially TOUCHING (sharing an edge under 4-connectivity flood-fill) are treated as one component. Most placements don't touch in practice; this is an edge case.
- `lib/admin/server/subscribers/maps-elements-editor-subscriber.js`: hosts the 6 admin routes (see below).
- `lib/admin/server/subscribers/maps-wizard-subscriber.js`: instantiates `MapElementsCustomDataWriter` and `MapElementsRecordsEmitter`; invokes the emitter after `MapsWizardRunner.run()` succeeds.

Client (`theme/admin/js/maps-elements-editor/`):

- `maps-elements-editor.js`: `MapsElementsEditor` top-level controller. Idempotent `attachEventListeners()` + `dispose()` (called by the launcher when re-launching on the same canvas). `requestRender()` coalesces draw calls via `requestAnimationFrame` (`renderScheduled` flag). `afterMutation()` runs `zOrderSorter.sort()`, rebuilds the mover tile index, marks the painter base cache dirty, and requests a render. Caches `canvas.getBoundingClientRect()` in `cachedCanvasRect` so `canvasToTile()` doesn't trigger a layout per mousemove. Owns `save()` and `loadElements()` directly (no longer delegated to `EditorSave` / `ElementsLoader` helpers). Delegates UI to `this.ui = new EditorUi(this)`, reset/snapshot to `this.resetController = new EditorResetController(this)`, and layer ordering to `this.zOrderSorter = new ElementZOrderSorter(this)`.
- `map-elements-canvas-painter.js`: canvas rendering with an offscreen base cache. `ensureBaseCache(mapJson)` repaints the full multi-layer base into an offscreen canvas only when `baseDirty` is set; every other frame is a single `drawImage(baseCanvas, 0, 0)` blit + the hover/drag/duplicate overlays. `ensureCanvasSize(mapJson)` only re-sizes the live canvas when the map width × tilewidth changes (no per-frame `canvas.width = ...` reset). `ensureTilesetLut(mapJson)` precomputes `columns / spacing / margin / tileWidth / tileHeight` once per resize so the per-cell math doesn't repeat the columns formula. The painter is reused (single instance on the editor, not `new` on every render). Tileset column formula: `Math.floor((imagewidth - 2 * margin + spacing) / (tilewidth + spacing))`. `markBaseDirty()` is called from `editor.afterMutation()` and from `EditorResetController.restore()`.
- `element-z-order-sorter.js`: `ElementZOrderSorter`. After every mutation, walks `mapElements.elements`, computes each element's bottom row (`bounds.row + bounds.height`), and reorders the element-owned entries inside `mapJson.layers` so element layers with a SMALLER bottom row render earlier and LARGER bottom row render later (2.5D painter's algorithm: bottom row = on top). Non-element layers (e.g. ground, borders) keep their original positions; only the element-layer slots are sorted among themselves. Also exposes `moveElement(instanceId, direction)` for the context-menu Move up (-1) / Move down (+1) buttons - shifts that element's layers by one slot relative to the next/previous neighbor layer in `mapJson.layers`.
- `element-mover.js`: drag/move logic. Owns a `tileIndex` (`Map<"col,row" -> instanceId>`) built by `buildTileIndex()` for O(1) `findElementAt`. `editor.afterMutation()` rebuilds it after drag-commit / delete / duplicate-commit / resize-apply. `translateLayer` no longer rebuilds the whole layer from scratch - it clears OLD positions then stamps NEW positions in-place (preserves co-located other elements). `anyTileOutOfBounds(element, deltaCol, deltaRow)` now uses the cached `element.bounds` rectangle (4 comparisons) instead of iterating every tile of every layer. `findContainingMapLayer(elementLayer, mapWidth)` does a name-match first, then falls back to `findMapLayerContainingTile(tile, mapWidth)` (matches by `layer.data[row*width+col] === tile.gid`) - handles the case where records have per-instance split names but the actual mapJson has a merged layer name.
- `element-duplicator.js`: placing-mode state machine with `placingState`. Methods: `isPlacing()`, `startPlacing(instanceId)`, `updatePlacing(col, row)`, `confirmPlacing()`, `cancelPlacing()`, `anyTileOutOfBounds(source, ghostCol, ghostRow)` (bounds-rect check against `mapJson.width`/`height` - no per-tile iteration), `makeCopy(...)`, `shiftAndStamp(...)`. Bounds-checked before commit. After `confirmPlacing()`, `afterMutation()` -> `zOrderSorter.sort()` re-positions the new element's layers by its bottom row.
- `element-deleter.js`: tile removal across layers, element removal from the record. `clearLayerTilesAndPruneIfEmpty(elementLayer)` clears the tiles AND splices the layer out of `mapJson.layers` if its data becomes all-zero (no zombie empty layers in saved JSON). Layer lookup uses the same name-or-tile-position fallback (`findContainingMapLayerIndex` / `findMapLayerIndexContainingTile`).
- `map-resizer.js` + `map-resizer-borders.js`: resize + border re-stamp. Anchor cells now carry the `resize-anchor-picker-cell` class so the container CSS can style them without a bare `button` rule.
- `editor-context-menu.js`: right-click menu. Appended to `document.body` and styled by `theme/admin/css/container-element-context-menu.css` (its own container file, NOT nested under `.maps-elements-editor`, since the menu lives outside the editor DOM subtree). Menu rows: Move up, Move down, Duplicate, Delete (in that order). `onMove(direction)` calls `editor.zOrderSorter.moveElement(target, direction)`, then `markDirty()` + `painter.markBaseDirty()` + `requestRender()`. `outsideClickHandler` closes the menu on document mousedown outside it. `clampToViewport()` repositions if the rect exceeds the window.
- `editor-backups-panel.js`: list/reload/delete backups - delegates HTTP to `EditorJsonFetcher`. Backup rows call `this.editor.ui.buildButton(...)` for Reload / Delete (no more `EditorButtonFactory`). The row label `<span>` carries the `backups-panel-row-label` class so the container CSS can target it without a bare `span` rule.
- `editor-json-fetcher.js`: `EditorJsonFetcher` instance class with `fetch(url, options)` and `post(url, body)` methods. Try/catch + HTTP status guard + `lastError`. `MapsElementsEditor` and `EditorBackupsPanel` each own one.
- `editor-ui.js`: `EditorUi` class. Owns the toolbar / backups panel / resize panel / canvas-scroll wrapper DOM. Exposes `buildButton(label, extraClass, handler)` (the former `EditorButtonFactory.create` logic, now a method on the UI so callers do `this.editor.ui.buildButton(...)`), `refreshDirty(isDirty)`, `refreshCancelDuplicate(isPlacing)`, `flashSaveButton(success)`, `toggleBackupsPanel()`, `toggleResizePanel()`, `applyZoom()`, `zoomBy(delta)`, `formatZoom()`. Zoom state: `zoomLevel`, `zoomMin = 0.25`, `zoomMax = 4`, `zoomStep = 0.25`.
- `editor-reset-controller.js`: `EditorResetController` class. Owns the in-memory `JSON.stringify` snapshot of the last loaded `mapJson` + `mapElements`. Methods: `captureSnapshot()`, `restore()` (also calls `editor.painter.markBaseDirty()`), `confirmRestore()`, `ensureInitialBackup()` (POSTs to the ensure-initial-backup endpoint).

Client (`theme/admin/js/`):

- `admin-map-elements-editor-launcher.js`: `AdminMapElementsEditorLauncher`. Bound from `AdminClientMaps`. On each click of `.edit-elements-btn`: disposes any prior editor on the canvas (`canvas.mapsElementsEditor.dispose()`), CLONES the canvas via `detachExternalListeners(canvas)` to drop the modal `click` listener that `admin-functions.js:activateModalElements` attached at page load, then instantiates `MapsElementsEditor` on the clone. The tileset image gets both `onload` (creates the editor and calls `editor.load()`) and `onerror` (sets `tileset.dataset.loadError = '1'`).
- `element-name-suffix.js`: shared next-suffix helper used by the tileset editor's namer and the duplicator.

Server route paths (all prefixed with `/reldens-admin`):

- `POST /reldens-admin/maps-elements-editor/api/save-map-edit` - body `{ mapName, sessionId, context, mapJson, mapElements }`. Backs up the live pair to `generate-data/generated/backups/`, writes the new live pair, optionally syncs runtime copies for `context: 'room'`.
- `GET /reldens-admin/maps-elements-editor/api/list-backups?mapName=X` - returns `{ backups: [{ timestamp, mapJsonPath, elementsFilePath, sizeBytes }] }` newest-first.
- `POST /reldens-admin/maps-elements-editor/api/restore-backup` - body `{ mapName, backupTimestamp, context }`. Writes a pre-restore backup pair first, then swaps in the chosen pair. Room context re-copies to runtime folders.
- `POST /reldens-admin/maps-elements-editor/api/delete-backup` - body `{ mapName, backupTimestamp, context }`. Removes the chosen pair from the backups folder.
- `GET /reldens-admin/maps-elements-editor/api/build-elements-from-layers?mapName=X` - returns `{ mapElements: {...}, warnings: [...] }` for the legacy-map fallback.
- `POST /reldens-admin/maps-elements-editor/api/ensure-initial-backup` - body `{ mapName, context }`. If `backupArchive.listBackups(mapName)` is empty, calls `backupArchive.writeBackupPair(mapName)` to create an initial backup. Returns `{success, created, timestamp?, existingCount?}`. Called by `EditorResetController.ensureInitialBackup()` on every `editor.load()`.

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

### Records emission (generation time)

The records file (one per generated map) is produced by `MapElementsRecordsEmitter.emitForRunner()` after `MapsWizardRunner.run()` finishes:

1. `RandomMapGenerator.generateLayersList()` (in `@reldens/tile-map-generator`) snapshots `this.preMergeLayers = sc.deepJsonClone(layers)` BEFORE `mergeLayersByNameSubstring` runs. The runtime map keeps the smaller merged layer set; the snapshot preserves per-source-element data for the records emitter.
2. `MapElementsRecordsEmitter.mapJsonForRecords(generatedMap, generator)` picks `generator.preMergeLayers` if present (otherwise `generatedMap.layers`) and runs the result through `LayerComponentSplitter.splitMapLayers(layers, mapWidth, mapHeight)`. All three emit paths (`emitMain`, `emitMultiMaps`, `emitSubMaps`) go through it.
3. `MapElementsBuilder.build({mapJson, ...})` then parses the split layers into elements via `ElementsFromLayersLoader` and writes `{mapName}-room-map-elements.json`.

Practical effect: records files contain one element record per spatially distinct instance (e.g. five separate `tree-1` / `tree-2` / ... / `tree-5` records instead of one grouped `tree-001`).

### Priority chain (editor load)

`MapsElementsEditor.loadElements(mapName, mapElementsFile)` (inlined into the main editor; no longer a separate `ElementsLoader` class):

1. If `mapElementsFile` is supplied, try `/reldens-admin/generated/{mapElementsFile}`. If a record JSON is returned, use it.
2. Otherwise, call `GET /reldens-admin/maps-elements-editor/api/build-elements-from-layers?mapName=X` (uses `MapElementsBuilder.buildFromLayers()` server-side, which delegates to `@reldens/tile-map-generator`'s `ElementsFromLayersLoader`).
3. If neither works, the editor refuses to load.

### Folder layout

- Source-of-truth: `generate-data/generated/{mapName}.json` and `generate-data/generated/{mapName}-room-map-elements.json`.
- Backups: `generate-data/generated/backups/{mapName}-{YYYY-MM-DD-HH-mm-ss}-back.json` and `{mapName}-{YYYY-MM-DD-HH-mm-ss}-back-room-map-elements.json`.
- Runtime: `theme/default/assets/maps/{mapName}.json` and `dist/assets/maps/{mapName}.json`. Not backed up; always reproducible.

### Editor script include

The editor's script tags live in a single template at `theme/admin/templates/maps-elements-editor-scripts.html`, registered in `lib/admin/server/templates-list.js` as `mapsElementsEditorScripts: 'maps-elements-editor-scripts.html'`. It is NOT a Mustache partial - there is no `{{> }}` syntax and no partials map. `TemplateEngine.render(content, params)` is the plain two-argument Mustache wrapper, and the admin `renderCallback` is `(content, params) => themeManager.templateEngine.render(content, params)`.

The loaded content is passed as a Mustache variable. Both consumer templates declare the slot at the end of their markup:

```html
{{&mapsElementsEditorScripts}}
```

`AdminTemplatesLoader.fetchAdminFilesContents(themeManager.adminTemplates)` loads every registered template (including `mapsElementsEditorScripts`) into `adminFilesContents`. From there the variable is supplied at each consumer's render point - both reldens-owned, so no `@reldens/cms` edit is needed:

- `maps-wizard-maps-selection.html` is rendered per request by `MapsWizardSubscriber.mapsWizardMapsSelection`, which controls the render `data`. It sets `data.mapsElementsEditorScripts = sc.get(adminManager.adminFilesContents, 'mapsElementsEditorScripts', '')` before rendering, so the variable resolves at render time.
- `sections/view/rooms.html` is the entity view section, pre-rendered once at setup by `ContentsBuilder.buildEntitiesContents` with only `{id, entitySerializedData}` kept literal (any other variable is emptied during that render). So `MapsElementsEditorSubscriber.injectScriptsVariableIntoRoomsSection` fills the slot in `adminManager.adminFilesContents.sections.view.rooms` with the loaded scripts content before that render. The subscriber is constructed inside `reldens.beforeSetupAdminManager` (`lib/admin/server/plugin.js`), which runs before `AdminManager.setupAdmin` calls `buildEntitiesContents`, and the fill is synchronous so it always completes first.

To include the scripts in another template: add `{{&mapsElementsEditorScripts}}` to it and supply the variable in whatever code renders it (for a CMS-rendered entity section, fill the slot on `adminFilesContents.sections...` before setup, as the editor subscriber does for rooms). The old static `partials`/`partialsDir`/`setPartialsDir`/`loadPartials` infrastructure on `TemplateEngine` was removed, and no Mustache `{{> }}` partials are used anywhere in the admin.

### Logging

`Logger.info` on successful save / restore / delete / initial backup write. `Logger.warning` when layer-name detection is used or border properties are missing. `Logger.error` on validation or write failures. Never log full payloads.
