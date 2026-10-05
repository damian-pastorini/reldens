# Worked Example: Turn the tent into an enterable door (town session -> house-composite interior)

This walks one fixed scenario through the admin panel: the surface is a Tileset Analyzer town session saved with the name `reldens-town` (in this example 27x45 at 32x32, element `tent-001` plus trees and ground spots, no door wiring yet) and the interior is the shipped example `house-composite.json` (40x26 at 16x16). A session id is the save timestamp followed by the session name (`YYYY-MM-DD-HH-mm-ss-reldens-town`) and is written `{sessionId}` below. We turn `tent-001` into a door by hand-adding `tent-001-change-points` + `tent-001-return-point` layers modeled on the reference `reldens-town-composite-with-associations.json` (in `node_modules/@reldens/tile-map-generator/examples/layer-elements-composite/`), leaving the trees decorative.

## A - Build / load the town session

Open the Tileset Analyzer admin page.
    Example: navigate to `/reldens-admin/tileset-analyzer/` (route registered in `TilesetAnalyzerSubscriber.setupRoutes()`, `lib/admin/server/subscribers/tileset-analyzer-subscriber.js`; the sidebar link is pushed into the "Wizards" group by the `reldens.eventBuildSideBarBefore` listener in `TilesetAnalyzerSubscriber.listenEvents()`).

The saved sessions list loads automatically on page init; the Generated Files button only shows/hides that already-populated list.
    Example: `TilesetSessionManager.load()` (`theme/admin/js/tileset-to-tilemap/session-manager.js`) runs at page init and fetches `/reldens-admin/tileset-analyzer/sessions` to populate `ul.generated-files-list`. Clicking `button.generated-files-toggle-btn` ("Generated Files", `theme/admin/templates/tileset-to-tilemap.html`) only toggles the `hidden` class on `.generated-files-list` and `.generated-files-search` (`TilesetEventBindings.bind()` in `tileset-event-bindings.js`); it issues no fetch.

Load the town session from its row.
    Example: in row `li[data-session-id="{sessionId}"]` click `button.generated-file-load-btn` ("Load"); `TilesetSessionManager.loadSession()` confirms, then GETs `/reldens-admin/tileset-analyzer/sessions/{sessionId}/load` (`withSessionData()`) and auto-fills the `.session-name-input` field with the part of the id after the timestamp, `reldens-town`.

Optional - regenerate `composite.json` + `map-generator-config.json` in place (only if you changed elements; skip when reusing the existing files).
    Example: keep `input.override-files-checkbox` CHECKED and `.session-name-input`=`reldens-town`, then click `button.generate-btn` ("Generate All"). `TilesetGenerator.generate()` POSTs `/reldens-admin/tileset-analyzer/generate` through `runGenerate()`, and since `SharedUtils.buildSessionId()` keeps the session timestamp while override is checked, it rewrites `output/{sessionId}/composite.json` (`theme/admin/js/tileset-to-tilemap/tileset-generator.js`). Do NOT use the per-tileset `button.tileset-generate-btn` - `TilesetGenerator.generateSingle()` calls `runGenerate()` with `forceNewSession`, which always builds a NEW timestamped session id.

Confirm the loaded composite size and that `tent-001` exists.
    Example: the session `composite.json` top-level `width` and `height` are `27` and `45`, its top-level `tilewidth` and `tileheight` are `32`, and every tileset entry declares 32x32. `tent-001` emits layers `tent-001-collisions`, `tent-001-over-player`, `tent-001-collisions-over-player`, `tent-001-path` and the group carries a `quantity` property, so it is placed and the door layers will ride along.

## B - Bring in the interior files

Copy the interior composite and BOTH its tileset images into the SAME session output folder (the wizard's `rootFolder`); the wizard's upload field writes elsewhere, so this is a manual file copy.
    Example: copy `house-composite.json`, `inside.png`, and `outside.png` from `node_modules/@reldens/tile-map-generator/examples/layer-elements-composite/` into the project `generate-data/tileset-sessions/output/{sessionId}/`. Both PNGs are required: `house-composite.json` declares the `inside` tileset (firstgid 1, `inside.png`) and the `outside` tileset (firstgid 1681, `outside.png`); omitting `outside.png` leaves the outside tileset image missing.

```bash
cp "node_modules/@reldens/tile-map-generator/examples/layer-elements-composite/house-composite.json" \
   "node_modules/@reldens/tile-map-generator/examples/layer-elements-composite/inside.png" \
   "node_modules/@reldens/tile-map-generator/examples/layer-elements-composite/outside.png" \
   "generate-data/tileset-sessions/output/{sessionId}/"
```

The generate step also provides these files when they are missing: `MapsWizardSubscriber.generateMaps()` calls `CompositeSampleFilesProvider.ensureCompositeFile()` (`lib/admin/server/composite-sample-files-provider.js`), which recurses over the composites named by the `compositeFileNames` layer properties and copies each missing one, plus the tileset images it references, from those package examples into the session folder. The manual copy is only needed to use a modified interior.

Why this folder: `AssociatedMaps.loadTileMapJSON()` (`@reldens/tile-map-generator` `lib/generator/associated-maps.js`) resolves the interior as `FileHandler.joinPaths(rootFolder, compositeFileName + '.json')`, and for a session `MapsWizardSubscriber.generateMaps()` (`lib/admin/server/subscribers/maps-wizard-subscriber.js`) sets `rootFolder` to the session output folder and forwards it as `handlerParams.rootFolder`:

```js
rootFolder = FileHandler.joinPaths(this.tilesetSessionsDir, 'output', safeSessionId);
TilesetImagePersister.ensureOutputImages(rootFolder, safeSessionId, this.tilesetSessionsDir);
handlerParams.rootFolder = rootFolder;
```

The `compositeFileNames` value `house-composite` therefore loads `<that folder>/house-composite.json`.
    Example: `house-composite.json` declares `inside` (firstgid 1, `inside.png`, 16x16) and `outside` (firstgid 1681, `outside.png`, 16x16); the interior ships its OWN floor connectors `stairs-up-return-point`, `stairs-up-change-points`, `stairs-down-return-point`, `stairs-down-change-points`, so you do NOT author interior stairs.

## C - Wire the tent-001 door (manual JSON edit of the session composite.json)

The analyzer UI cannot author a door: its layer-type fieldset (`fieldset.layer-type-fieldset` in the element row template of `theme/admin/templates/tileset-to-tilemap.html`) offers only below-player, collisions, over-player, collisions-over-player, base, path, and a free-text `custom` suffix, with no UI for the door property block, so the two door layers must be hand-added to `composite.json`.

Add both door layers to the `composite.json` `layers` array; in the reference the `*-return-point` layer comes BEFORE the `*-change-points` layer, so author them in that order to match.
    Example: in the reference `reldens-town-composite-with-associations.json` the `house-01-return-point` layer is listed before `house-01-change-points`.

Add a `tent-001-change-points` layer; the name must contain the substring `change-points` and start with the element id `tent-001` so it joins group `tent-001`.
    Example: layer recognition is by substring in `ElementLayerWriter.updateLayerChangePointsData()` (`@reldens/tile-map-generator` `lib/generator/element-layer-writer.js`): `let isChangePointsLayer = -1 !== layer.name.indexOf('change-points');`. For the group, `change-points` is not one of the `ElementLayerName` layer types, so `ElementsProvider.fetchElementLayerGroup()` falls back to `MapNaming.fuseGroupName()`, the first two dash segments -> `tent-001`. `data` must be exactly `27*45 = 1215` integers, all `0` except a single non-zero gid INSIDE the tent footprint (zero cells are skipped by `ElementLayerWriter.updateLayerData()`). The gid value is cosmetic; only non-zero matters. `compositeFileNames` MUST equal `house-composite` to bind the door to the interior. Properties mirror the reference `house-01-change-points` block: there is NO `subMapName` property in any reference change-points layer, so do not add one (with no `subMapName` the sub-map name falls back to the generated change-point key via `AssociatedMaps.generateSubMapName()`).

```json
{
  "name": "tent-001-change-points",
  "type": "tilelayer",
  "visible": true,
  "opacity": 1,
  "x": 0,
  "y": 0,
  "width": 27,
  "height": 45,
  "id": 9001,
  "data": [ /* 1215 entries (27*45); all 0 except one non-zero gid at the tent door cell, index = doorRow*27 + doorCol */ ],
  "properties": [
    { "name": "blockMapBorder",     "type": "bool",   "value": true },
    { "name": "compositeFileNames", "type": "string", "value": "house-composite" },
    { "name": "elementTitle",       "type": "string", "value": "Tent 1" },
    { "name": "entryPosition",      "type": "string", "value": "down-left" },
    { "name": "entryPositionSize",  "type": "int",    "value": 2 },
    { "name": "upperFloors",        "type": "int",    "value": 1 }
  ]
}
```

Add a paired `tent-001-return-point` layer (name must contain `return-point`) with a single `position` property and one non-zero cell where the player lands when leaving the interior.
    Example: in the reference the `house-01-return-point` cell sits one row SOUTH of the `house-01-change-points` cell, matching `position=down`. In `ElementLayerWriter.updateLayerWithReturnPointsData()` the marker must NOT be at the element's local index 0 (top-left of its cropped bounding box) or it is skipped, and `position` is read inline from the layer properties with `down` as the default:

```js
let returnPointPosition = sc.get(
    sc.fetchByProperty(layer?.properties, 'name', 'position'),
    'value',
    'down'
);
```

```json
{
  "name": "tent-001-return-point",
  "type": "tilelayer",
  "visible": true,
  "opacity": 1,
  "x": 0,
  "y": 0,
  "width": 27,
  "height": 45,
  "id": 9002,
  "data": [ /* 1215 entries (27*45); all 0 except one non-zero gid one row below the door cell, index = (doorRow+1)*27 + doorCol */ ],
  "properties": [
    { "name": "position", "type": "string", "value": "down" }
  ]
}
```

Optional multi-floor: add an `upperFloors` and/or `downFloors` int property to the change-points layer; each int>0 generates that many extra floors, ALL reusing `compositeFileNames` (`house-composite`).
    Example: the change-points block above sets `upperFloors=1`, matching reference `house-01`, which reuses the base composite with no per-floor override; `house-02` uses `upperFloors=2`. The reference `house-03`/`house-03-shadow` layers DO carry `downFloorCompositeFileNames`/`upperFloorCompositeFileNames` properties, but nothing under the `@reldens/tile-map-generator` `lib/` folder reads those names (in Reldens only `CompositeSampleFilesProvider` reads them, to copy the referenced composites), so floors always reuse `compositeFileNames` and only the `upperFloors`/`downFloors` int counts have effect (`AssociatedMaps.generate()`).

## D - Generate in the Maps Wizard

Hand off from the analyzer to the wizard for this session WITHOUT regenerating; use the per-row "Maps Wizard" button (it does NOT call generate), never "All to Maps Wizard"/"Selected to Maps Wizard" which regenerate and overwrite the manual edits.
    Example: the per-row `a.generated-file-wizard-btn` ("Maps Wizard") appears only when the session contains a `map-generator-config*.json` (`hasMapsConfig` in `SessionItemBuilder.build()`, `theme/admin/js/tileset-to-tilemap/session-item-builder.js`) and navigates to `/reldens-admin/maps-wizard?tilesetSessionId={sessionId}` with no generate call. By contrast `all-to-maps-wizard-btn` / `selected-to-maps-wizard-btn` go through `TilesetGenerator.mapsWizard()` -> `runMapsWizardFlow()`, which calls `runGenerate()` before navigating, overwriting your hand-edited `composite.json`. The wizard page prefills via `MapsWizardBindings.prefillFromUrlParams()` and GETs `/reldens-admin/tileset-analyzer/api/session-wizard-config?sessionId={sessionId}` (`theme/admin/js/maps-wizard/maps-wizard-bindings.js`).

Switch the strategy to associations - the session's saved strategy (`elements-composite-loader` in this example) makes radio #2 auto-select on prefill, so you must click radio #4 manually.
    Example: click `input#mapsWizardAction-4` (value `multiple-with-association-by-loader`, visible label "Generate MULTIPLE random maps with Layer Elements Composite Loader (with associations)") in `theme/admin/templates/maps-wizard.html`. When the session config holds a saved wizard configuration, the `session-wizard-config` route returns every saved strategy as `savedStrategies` (merged with the session config values by `TilesetAnalyzerSubscriber.overrideSavedStrategies()`) and `MapsWizardBindings.applyWizardConfig()` preloads them into `strategyStates`, so clicking radio #4 swaps `#generatorData` to the saved association config (`MapsWizardBindings.handleInputChange()` -> `MapsWizardUtils.applyStrategyState()` in `maps-wizard-utils.js`). Without a saved configuration, clicking radio #4 builds `#generatorData` from the option-4 inputs and their template defaults.

Open the strategy-4 configuration modal and point it at the SESSION's own composite, not the shipped example.
    Example: click `button.config-options-open-btn[data-config-modal="config-modal-4"]` ("Configuration Options") to open `div#config-modal-4`. After clicking radio #4 check `input#compositeElementsFile-4`: without a saved wizard configuration it keeps the template default `reldens-town-composite-with-associations.json` (with one, `overrideSavedStrategies()` already replaced it with the session config `compositeElementsFile`); make sure it reads `composite.json` (the session's own file). The edit only propagates into `#generatorData` because it fires the `.config-input` change listener (`MapsWizardBindings.bindInputChangeListeners()` -> `MapsWizardUtils.updateGeneratorDataFromInputs()`); without an input-change (or closing the modal) the textarea keeps the saved value. Set `textarea#mapsInformation-4` to a single town entry (the template default holds `town-001`..`town-004` and must be replaced) and `textarea#associationsProperties-4` to the in-order block; both are JSON-parsed config-inputs (`MapsWizardUtils.processInputValue()`), so invalid JSON is kept as a raw string and will NOT propagate as an object.

```
#compositeElementsFile-4  =  composite.json
```

```json
// textarea#mapsInformation-4
[ { "mapName": "reldens-town", "mapTitle": "Reldens Town" } ]
```

```json
// textarea#associationsProperties-4
{
  "generateElementsPath": false,
  "blockMapBorder": true,
  "freeSpaceTilesQuantity": 0,
  "variableTilesPercentage": 0,
  "placeElementsOrder": "inOrder",
  "orderElementsBySize": true,
  "randomizeQuantities": false,
  "applySurroundingPathTiles": false,
  "automaticallyExtrudeMaps": true
}
```

On radio-4 click the `textarea#generatorData` is filled with the FULL strategy-4 object (the saved one when the session has a saved wizard configuration); you only edit `compositeElementsFile` and `mapsInformation`, and the field is rebuilt as `extraProperties` + every common input + every option-4 input (`MapsWizardUtils.buildGeneratorData()`). The block below is an EXCERPT of the load-bearing keys, not the literal submitted payload.
    Example: the surface optimizes at `factor 1` (the `factor-common` input). The strategy-4 inputs have NO `tileSize` key (only the `elements-object-loader` strategy has a `tileSize` input); the surface `tileSize 32` follows from the `composite.json` tilesets being 32x32, because `MapDataMapper.fromOptimizedMap()` sets `tileSize` from the optimized map `tilewidth` and `RandomMapGenerator.createTiledMapObject()` writes it as the map `tilewidth`/`tileheight`. Each generated map is an independent Tiled map with its own optimized tileset: `AssociatedMaps.generate()` runs a new `RandomMapGenerator` per interior through `fromAssociation()`, so the 16x16 interior is optimized separately and stays 16. `collisionLayersForPaths` must include `change-points` so paths route around the door; matching is substring-based (`MapGridBuilder.createPathfindingGrid()`), so it matches the renamed surface layer `tent-0010-change-points`; the default `change-points,collisions,tree-base` comes from the `collisionLayersForPaths-common` input.

```json
{
  "factor": 1,
  "blockMapBorder": true,
  "freeSpaceTilesQuantity": 2,
  "variableTilesPercentage": 15,
  "collisionLayersForPaths": ["change-points", "collisions", "tree-base"],
  "compositeElementsFile": "composite.json",
  "mapsInformation": [ { "mapName": "reldens-town", "mapTitle": "Reldens Town" } ],
  "associationsProperties": {
    "generateElementsPath": false,
    "blockMapBorder": true,
    "freeSpaceTilesQuantity": 0,
    "variableTilesPercentage": 0,
    "placeElementsOrder": "inOrder",
    "orderElementsBySize": true,
    "randomizeQuantities": false,
    "applySurroundingPathTiles": false,
    "automaticallyExtrudeMaps": true
  }
}
```

Optional - persist this config back into the session so the analyzer remembers it; this OVERWRITES the saved `currentStrategy`.
    Example: click `button#saveWizardConfigBtn` ("Save configuration", un-hidden only when `tilesetSessionId` is present, by `MapsWizardBindings.prefillFromUrlParams()` calling `mapsWizardSaveConfig.showButton()`); `MapsWizardSaveConfig.saveWizardConfig()` (`theme/admin/js/maps-wizard/maps-wizard-save-config.js`) POSTs `{sessionId,currentStrategy,strategies}` to `/reldens-admin/maps-wizard/api/save-config`, and `MapsWizardSubscriber.saveWizardConfig()` writes `savedWizardConfig` into the session `map-generator-config.json`. `currentStrategy` is the selected option (`mapsWizardUtils.getSelectedOption()`), so saving after picking radio #4 changes the session's saved `currentStrategy` from `elements-composite-loader` to `multiple-with-association-by-loader`.

Submit Generate.
    Example: click the submit `input[type=submit].button-maps-wizard` (value "Generate"); hidden `input#mainAction`=`generate`, `input#tilesetSessionId`=`{sessionId}`. `MapsWizardGenerateGuard` (`theme/admin/js/maps-wizard/maps-wizard-generate-guard.js`, bound to form id `maps-wizard-form`) GETs `/reldens-admin/maps-wizard/api/rooms-exist?names=reldens-town`, shows a confirm, then submits (`checkRoomsAndConfirm()` -> `runConfirm()`). The server routes `mainAction=generate` -> `MapsWizardSubscriber.generateMaps()` -> `MapsWizardRunner.run()` -> `MultipleWithAssociationsByLoaderGenerator` (`lib/admin/server/subscribers/maps-wizard-runner.js`).

Verify the generated output: the run writes the town surface map plus one interior sub-map per wired door instance, plus one file per extra floor.
    Example: `generated/reldens-town.json` + `reldens-town.png` (surface), and for the tent door `generated/reldens-town-tent-001-n0.json` (interior) plus `reldens-town-tent-001-n0-upperFloor-n1.json` for the `upperFloors=1` floor. With no `subMapName` property on the change-points layer, `AssociatedMaps.generateSubMapName()` returns the generated change-point KEY, which is built by `ElementLayerWriter.provideElementKey()`:

```js
let elementKey = mapPrefix.toString();
let elementNameClean = elementData.name.replace('-change-points', '').replace('-return-point', '');
let isStairsElement = -1 !== elementData.name.indexOf('stairs');
if(!isStairsElement){
    return elementKey + '-' + elementNameClean + '-n' + elementNumber;
}
```

`elementData.name` is the original composite layer name (`tent-001-change-points`), so the cleaned element name is `tent-001`; only the output layer written on the map is renamed to the fused `tent-0010-change-points` (`ElementLayerName.build()`). `elementNumber` is the placement index from `ElementsPlacer.placeElementOnMap()` (`0` for the first tent while Randomize Quantities stays `No`, the default), so the key reads `reldens-town-tent-001-n0` and the sub-maps are always named `<map>-<element name>-n<N>` (for example `town-001-house-01-n0`). Floor suffixes come from `MapNaming.buildFloorSuffix()`. `AssociatedMaps.generate()` locates the door layer by the recorded fused name `targetLayerName` (`ElementLayerWriter.updateLayerChangePointsData()` records `targetLayerName: layer.name`), reads `compositeFileNames`, loads `house-composite.json` from the session folder, and generates the interior. If `generated/` shows only `reldens-town.*` and no `*-tent-001-n0.json`, the door tile is missing from the change-points layer footprint or `house-composite.json`/`inside.png` are not in the session folder.

## E - Import

On the post-generate selection page, select the town map; its interiors import automatically with it.
    Example: page `theme/admin/templates/maps-wizard-maps-selection.html`; tick `input[type=checkbox][name="selectedMaps[]"]` `id=maps-wizard-map-option-reldens-town`. The interior sub-maps appear under the "Associated maps generated" collapsible with NO checkbox of their own - they import with the parent (the page notes say "Generated sub-maps will be automatically imported").

Submit the import.
    Example: click `input[type=submit].button-maps-wizard` (value "Import Selected Maps") on the form whose id is `maps-wizard-form` (`maps-import-form` is a CSS class). Hidden fields: `mainAction`=`import`, `generatedMapsHandler`=`multiple-with-association-by-loader` (server-set to `selectedHandler` in `MapsWizardSubscriber.generateMaps()`), `importAssociationsForChangePoints`, `importAssociationsRecursively`, `automaticallyExtrudeMaps`, `verifyTilesetImage`, and `handlerParams` (the serialized original `generatorData` JSON, parsed back by `SelectedMapsImportRunner.mapGeneratedMapsDataForImport()` in `lib/admin/server/selected-maps-import-runner.js`). POSTs `/reldens-admin/maps-wizard`, where the `mainAction=import` branch delegates to `SelectedMapsImportRunner.run()`. The maps-wizard JS is not loaded on this page, but the globally loaded `reldens-admin-client-forms.js` (included by `theme/admin/templates/layout.html`) still intercepts the `confirmation-required` form: `AdminClientForms.handleFormSubmit()` prevents default and shows the confirm dialog, then `handleFormConfirm()` shows the maps-import overlay for the `maps-import-form` class and calls `form.submit()` programmatically; no API pre-check runs.

What import does: creates rooms, copies files, and wires change/return points.
    Example: the hidden `importAssociationsForChangePoints`/`importAssociationsRecursively` fields render as `0` on the selection page (strategy-4 `generatorData` lacks those keys, and `MapsWizardSubscriber.generateMaps()` renders `Number(mapData.importAssociationsForChangePoints || 0)`), but the import recomputes both as `true` from the handler in `SelectedMapsImportRunner.mapGeneratedMapsDataForImport()`:

```js
let handlerWithAssociations = 'multiple-with-association-by-loader' === data.generatedMapsHandler;
let importAssociations = handlerWithAssociations
    || 1 === Number(sc.get(data, 'importAssociationsForChangePoints', 0));
```

`importAssociationsRecursively` is computed the same way, so `RoomsAssociationsCreator.provideRoomByName()` (`lib/import/server/rooms-associations-creator.js`) auto-loads and creates any interior room. The importer writes one `rooms` row per map `{name, title, map_filename:<name>.json, scene_images, customData}` in `MapsImporter.createRoomByMapTitle()` (`lib/import/server/maps-importer.js`, where `roomImportData.applyTo(roomCreateData, roomCustomData, mapName, mapTitle)` fills in the import-specific values), plus `roomsChangePoints {room_id, tile_index, next_room_id}` and `roomsReturnPoints {room_id, direction, x, y, is_default, from_room_id}` from the `change-point-for-`/`return-point-for-` properties (parsed by `RoomsAssociationsCreator.fetchChangePointsFromLayer()` and `fetchReturnPointsFromLayer()`; the rows are created in `createRoomChangePoint()` and `saveReturnPoint()`). Map JSON + tilesets are copied to `<projectTheme>/assets/maps/` and `<dist>/assets/maps/` from `generate-data/generated` (`MapsImporter.copyFiles()`).

If a room with that name already exists, delete or rename it first - import hard-fails on collision.
    Example: `MapsImporter.loadValidMaps()` stops the import with errorCode `mapExists` if a `rooms` row already has the name, even though the generate guard only warns via `/maps-wizard/api/rooms-exist`.

Reboot the game server after import.
    Example: the selection page notes state "The Game Server requires a reboot in order to make the maps available on the game." - there is no hot-plug for new maps; refreshing the page instead regenerates a new random set.
