# Worked Example: Turn the tent into an enterable door (TOWN session 2026-05-25-07-03-32-reldens-town -> house-composite interior)

This walks one fixed scenario through the admin panel: the surface is the real Tileset Analyzer session `2026-05-25-07-03-32-reldens-town` (27x45 at 32x32, element `tent-001` plus trees and ground spots, no door wiring yet) and the interior is the shipped example `house-composite.json` (40x26 at 16x16). We turn `tent-001` into a door by hand-adding `tent-001-change-points` + `tent-001-return-point` layers modeled on the reference `reldens-town-composite-with-associations.json`, leaving the trees decorative.

## A - Build / load the town session

Open the Tileset Analyzer admin page.
    Example: navigate to `/reldens-admin/tileset-analyzer/` (route registered in `lib/admin/server/subscribers/tileset-analyzer-subscriber.js:15,128-136`; sidebar link is pushed into the "Wizards" group at `:39-48`).

The saved sessions list loads automatically on page init; the Generated Files button only shows/hides that already-populated list.
    Example: `TilesetSessionManager.load()` runs at page init and fetches `/reldens-admin/tileset-analyzer/sessions` to populate `ul.generated-files-list` (`theme/admin/js/tileset-to-tilemap/session-manager.js:9-24`). Clicking `button.generated-files-toggle-btn` ("Generated Files", `tileset-to-tilemap.html:149`) only toggles the `hidden` class on `.generated-files-list` and `.generated-files-search`; it issues no fetch (`tileset-event-bindings.js:37-40`).

Load the town session from its row.
    Example: in row `li[data-session-id="2026-05-25-07-03-32-reldens-town"]` click `button.generated-file-load-btn` ("Load"); it confirms, then GETs `/reldens-admin/tileset-analyzer/sessions/2026-05-25-07-03-32-reldens-town/load` and auto-fills `#session-name-input` to `reldens-town` (`session-manager.js:222-247`).

Optional - regenerate `composite.json` + `map-generator-config.json` in place (only if you changed elements; skip when reusing the existing files).
    Example: keep `input#override-files-checkbox` CHECKED and `#session-name-input`=`reldens-town`, then click `button.generate-btn` ("Generate All"). It POSTs `/reldens-admin/tileset-analyzer/generate` and rewrites `output/2026-05-25-07-03-32-reldens-town/composite.json` (`tileset-generator.js:50-52,153,190-195`; override reuse at `:139-144`). Do NOT use the per-tileset `button.tileset-generate-btn` - it forces a NEW timestamped session id (`tileset-generator.js:112-122,156-167,134-137`).

Confirm the loaded composite size and that `tent-001` exists.
    Example: `composite.json` is `width 27, height 45` (`composite.json:1521,3`) and every tileset declares 32x32 (e.g. `composite.json:1489-1490`); the top-level `tilewidth: 32` (`composite.json:1519`) and `tileheight: 32` (`composite.json:1039`) match. `tent-001` emits layers `tent-001-collisions`, `tent-001-over-player`, `tent-001-collisions-over-player`, `tent-001-path` (`composite.json:12,43,57,71`) and the group carries a `quantity` property (`composite.json:21,23`), so it is placed and the door layers will ride along.

## B - Bring in the interior files

Copy the interior composite and BOTH its tileset images into the SAME session output folder (the wizard's `rootFolder`); the wizard's upload field writes elsewhere, so this is a manual file copy.
    Example: copy `house-composite.json`, `inside.png`, and `outside.png` from `D:/dap/work/reldens/npm-packages/tile-map-generator/examples/layer-elements-composite/` into `D:/dap/work/reldens/reldens-claude-branches/maps-elements-edition/app/generate-data/tileset-sessions/output/2026-05-25-07-03-32-reldens-town/`. Both PNGs are required: `house-composite.json` declares the `inside` tileset (firstgid 1, `inside.png`) and the `outside` tileset (firstgid 1681, `outside.png`) (firstgid values at `house-composite.json:1949,2378`; image refs at `:1950,2379`); omitting `outside.png` leaves the outside tileset image missing.

```bash
cp "D:/dap/work/reldens/npm-packages/tile-map-generator/examples/layer-elements-composite/house-composite.json" \
   "D:/dap/work/reldens/npm-packages/tile-map-generator/examples/layer-elements-composite/inside.png" \
   "D:/dap/work/reldens/npm-packages/tile-map-generator/examples/layer-elements-composite/outside.png" \
   "D:/dap/work/reldens/reldens-claude-branches/maps-elements-edition/app/generate-data/tileset-sessions/output/2026-05-25-07-03-32-reldens-town/"
```

Why this folder: `AssociatedMaps.loadTileMapJSON` resolves the interior as `FileHandler.joinPaths(rootFolder, compositeFileName + '.json')`, and `rootFolder` = `<projectGenerateDataPath>/tileset-sessions/output/<sessionId>` (`associated-maps.js:186-196`, joinPaths at `:188-189`; the session-branch `rootFolder` is set at `maps-wizard-subscriber.js:210` and forwarded as `handlerParams.rootFolder` at `:212`). The `compositeFileNames` value `house-composite` therefore loads `<that folder>/house-composite.json`.
    Example: `house-composite.json` declares `inside` (firstgid 1, `inside.png`, 16x16) and `outside` (firstgid 1681, `outside.png`, 16x16) (`house-composite.json:1949-1957,2377-2388`); the interior ships its OWN floor connectors `stairs-up-return-point` (`:256`), `stairs-up-change-points` (`:373`), `stairs-down-return-point` (`:484`), `stairs-down-change-points` (`:601`), so you do NOT author interior stairs.

## C - Wire the tent-001 door (manual JSON edit of the session composite.json)

The analyzer UI cannot author a door: its layer-type fieldset offers only below-player, collisions, over-player, collisions-over-player, base, path, and a free-text `custom` suffix, with no UI for the door property block (`tileset-to-tilemap.html:449-458`), so the two door layers must be hand-added to `composite.json`.

Add both door layers to the `composite.json` `layers` array; in the reference the `*-return-point` layer comes BEFORE the `*-change-points` layer, so author them in that order to match.
    Example: in the reference, `house-01-return-point` is at `reldens-town-composite-with-associations.json:858` and `house-01-change-points` is at `:903`.

Add a `tent-001-change-points` layer; the name must contain the substring `change-points` and start with the element id `tent-001` so it fuses to group `tent-001`.
    Example: layer recognition is by substring `layer.name.indexOf('change-points') !== -1` (`element-layer-writer.js:134`); the group fuse uses only the first two dash segments -> `tent-001` (`map-naming.js:14-17`; `elements-provider.js:143-147`). `data` must be exactly `27*45 = 1215` integers, all `0` except a single non-zero gid INSIDE the tent footprint (zero cells are skipped - `element-layer-writer.js:59-61`). The gid value is cosmetic; only non-zero matters (`element-layer-writer.js:63`; `associated-maps.js:53-56`). `compositeFileNames` MUST equal `house-composite` to bind the door to the interior. Properties mirror the reference `house-01-change-points` block (`reldens-town-composite-with-associations.json:905-935`): there is NO `subMapName` property in any reference change-points layer, so do not add one (the sub-map name falls back to the fused group via `associated-maps.js:198-203`).

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
    Example: in the reference the return cell sits one row SOUTH of the door cell, matching `position=down` (`reldens-town-composite-with-associations.json:858-865`). The marker must NOT be at the element's local index 0 (top-left of its cropped bounding box) or it is skipped (`element-layer-writer.js:182-183`). `position` is read by `provideReturnPositionKeyFromLayer`, default `down` (`element-layer-writer.js:200,218-230`).

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
    Example: the change-points block above sets `upperFloors=1`, matching reference `house-01`, which reuses the base composite with no per-floor override (`reldens-town-composite-with-associations.json:932-934`); `house-02` uses `upperFloors=2` (`:1248-1250`). The reference `house-03`/`house-03-shadow` layers DO carry `downFloorCompositeFileNames`/`upperFloorCompositeFileNames` properties (`:1549,1574,1634,1659`), but a grep of `D:/dap/work/reldens/npm-packages/tile-map-generator/lib` returns ZERO matches for those names, so the current generator never reads them - floors always reuse `compositeFileNames` and only the `upperFloors`/`downFloors` int counts have effect (`associated-maps.js:74-75`).

## D - Generate in the Maps Wizard

Hand off from the analyzer to the wizard for this session WITHOUT regenerating; use the per-row "Maps Wizard" button (it does NOT call generate), never "All to Maps Wizard"/"Selected to Maps Wizard" which regenerate and overwrite the manual edits.
    Example: the per-row `a.generated-file-wizard-btn` ("Maps Wizard") appears only when the session contains `map-generator-config.json` (`session-item-builder.js:35`, `hasMapsConfig`) and navigates to `/reldens-admin/maps-wizard?tilesetSessionId=2026-05-25-07-03-32-reldens-town` with no generate call (`session-item-builder.js:44-57`). By contrast `all-to-maps-wizard-btn` / `selected-to-maps-wizard-btn` call `runGenerate` before navigating (`tileset-generator.js:57-64,95-110`), overwriting your hand-edited `composite.json`. The wizard page prefills via `prefillFromUrlParams()` and GETs `/reldens-admin/tileset-analyzer/api/session-wizard-config?sessionId=2026-05-25-07-03-32-reldens-town` (`maps-wizard-bindings.js:236-262`).

Switch the strategy to associations - the saved `currentStrategy` is `elements-composite-loader`, so radio #2 auto-selects on prefill and you must click radio #4 manually.
    Example: click `input#mapsWizardAction-4` (value `multiple-with-association-by-loader`, visible label "Generate MULTIPLE random maps with Layer Elements Composite Loader (with associations)") (`maps-wizard.html:54-66`). All four saved strategies are preloaded into `strategyStates` from the saved config (`map-generator-config.json:158-162`), so clicking radio #4 swaps `#generatorData` to the association config (`maps-wizard-bindings.js:264-286`; `maps-wizard-utils.js:37-49`).

Open the strategy-4 configuration modal and point it at the SESSION's own composite, not the shipped example.
    Example: click `button.config-options-open-btn[data-config-modal="config-modal-4"]` ("Configuration Options") to open `div#config-modal-4` (`maps-wizard.html:64,477`). After clicking radio #4 the field `input#compositeElementsFile-4` is repopulated to the saved `reldens-town-composite-with-associations.json` (`maps-wizard.html:487-488`; `map-generator-config.json:162`); edit it to `composite.json` (the session's own file - `map-generator-config.json:3`). The edit only propagates into `#generatorData` because it fires the `.config-input` change listener (`maps-wizard-bindings.js:35-54` -> `maps-wizard-utils.js:144-157`); without an input-change (or closing the modal) the textarea keeps the saved value. Set `textarea#mapsInformation-4` to a single town entry (the saved value holds `town-001`..`town-004` and must be replaced) and `textarea#associationsProperties-4` to the in-order block; both are JSON-parsed config-inputs (`maps-wizard-utils.js:68-74`), so invalid JSON is kept as a raw string and will NOT propagate as an object.

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

On radio-4 click the `textarea#generatorData` is filled with the FULL saved strategy-4 object (~70 keys from `map-generator-config.json:162`); you only edit `compositeElementsFile` and `mapsInformation`, and the field is rebuilt as `extraProperties` + every common input + every option-4 input (`maps-wizard-utils.js:136-142`). The block below is an EXCERPT of the load-bearing keys, not the literal submitted payload.
    Example: the surface optimizes at `factor 1` per the saved strategy-4 string (`map-generator-config.json:162`), which has NO `tileSize` key; the surface `tileSize 32` follows from the `composite.json` tilesets being 32x32 (`composite.json:1489-1490,1519`), not from the saved config (`tileSize: 32` appears only in the `elements-object-loader` string at `map-generator-config.json:159`). Each generated map is an independent Tiled map with its own merged tileset, so the 16x16 interior is optimized separately and stays 16 (`associated-maps.js:67-76`; `random-map-generator.js:146,285-286,302-303`; `data-mapper.js:34,84-96`). `collisionLayersForPaths` must include `change-points` so paths route around the door; matching is substring-based, so it matches the renamed surface layer `tent-0010-change-points` (`map-grid-builder.js:176-198`; the saved default `["change-points","collisions","tree-base"]` is in the strategy-4 string at `map-generator-config.json:162`).

```json
{
  "factor": 1,
  "blockMapBorder": true,
  "freeSpaceTilesQuantity": 2,
  "variableTilesPercentage": 15,
  "collisionLayersForPaths": ["change-points", "collisions", "tree-base"],
  "groundTile": 4535,
  "pathTile": 5006,
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
    Example: click `button#saveWizardConfigBtn` ("Save configuration", un-hidden only when `tilesetSessionId` is present - `maps-wizard.html:316`, `maps-wizard-bindings.js:247-249`); it POSTs `{sessionId,currentStrategy,strategies}` to `/reldens-admin/maps-wizard/api/save-config`, writing `savedWizardConfig` into `map-generator-config.json` (`maps-wizard-save-config.js:45,59-63`; `maps-wizard-subscriber.js:144-177`). `currentStrategy` is set to the selected option (`maps-wizard-save-config.js:51`), so saving after picking radio #4 changes the session's saved `currentStrategy` from `elements-composite-loader` to `multiple-with-association-by-loader`.

Submit Generate.
    Example: click the submit `input[type=submit].button-maps-wizard` (value "Generate"); hidden `input#mainAction`=`generate`, `input#tilesetSessionId`=`2026-05-25-07-03-32-reldens-town` (`maps-wizard.html:10-11,317`). The guard (on form id `maps-wizard-form`) GETs `/reldens-admin/maps-wizard/api/rooms-exist?names=reldens-town`, shows a confirm, then submits (`maps-wizard-generate-guard.js:37-55,105-112,148-156`). The server routes `mainAction=generate` -> `generateMaps` -> `MapsWizardRunner` -> `MultipleWithAssociationsByLoaderGenerator` (`maps-wizard-subscriber.js:136-138,187,215-216`).

Verify the generated output: the run writes the town surface map plus one interior sub-map per wired door instance, plus one file per extra floor.
    Example: `generated/reldens-town.json` + `reldens-town.png` (surface), and for the tent door `generated/reldens-town-tent-0010-n0.json` (interior) plus `reldens-town-tent-0010-n0-upperFloor-n1.json` for the `upperFloors=1` floor. The interior name is `mapName + '-' + fuseGroupName(layerName) + '-n' + elementNumber`, where the instance number `0` fuses into the second segment so the group reads `tent-0010` (`associated-maps.js:198-203`; `map-naming.js:14-17` for `fuseGroupName`, `:19-21` for `buildFloorSuffix`). `AssociatedMaps.generate` locates the door layer by the recorded fused name `targetLayerName` (`element-layer-writer.js:158` records `targetLayerName: layer.name`; matched at `associated-maps.js:48-49`), reads `compositeFileNames`, loads `house-composite.json` from the session folder, and generates the interior (`associated-maps.js:54-93`). If `generated/` shows only `reldens-town.*` and no `*-tent-0010-n0.json`, the door tile is missing from the change-points layer footprint or `house-composite.json`/`inside.png` are not in the session folder.

## E - Import

On the post-generate selection page, select the town map; its interiors import automatically with it.
    Example: page `maps-wizard-maps-selection.html`; tick `input[type=checkbox][name="selectedMaps[]"]` `id=maps-wizard-map-option-reldens-town` (`:35`). The interior sub-maps appear under the "Associated maps generated" collapsible with NO checkbox of their own - they import with the parent ("Generated sub-maps will be automatically imported", `maps-wizard-maps-selection.html:29,61-95`).

Submit the import.
    Example: click `input[type=submit].button-maps-wizard` (value "Import Selected Maps", `:20`) on the form whose id is `maps-wizard-form` (`maps-import-form` is a CSS class, `:4,6`). Hidden fields: `mainAction`=`import` (`:10`), `generatedMapsHandler`=`multiple-with-association-by-loader` (`:12`, server-set to `selectedHandler` at `maps-wizard-subscriber.js:228`), `importAssociationsForChangePoints` (`:13`), `importAssociationsRecursively` (`:14`), `automaticallyExtrudeMaps` (`:15`), `verifyTilesetImage` (`:16`), and `handlerParams` (`:17`, the serialized original `generatorData` JSON parsed at `maps-wizard-subscriber.js:383`). POSTs `/reldens-admin/maps-wizard`, routed to `importSelectedMaps()` (`maps-wizard-subscriber.js:139-141,337-353`). The maps-wizard JS is not loaded on this page, but the globally loaded `reldens-admin-client-forms.js` (`layout.html:23`) still intercepts the `confirmation-required` form (`maps-wizard-maps-selection.html:4`): it prevents default, shows the confirm dialog plus the maps-import overlay, then calls `form.submit()` programmatically (`reldens-admin-client-forms.js:82-103,86`); no API pre-check runs.

What import does: creates rooms, copies files, and wires change/return points.
    Example: the hidden `importAssociationsForChangePoints`/`importAssociationsRecursively` fields render as `0` on the selection page (strategy-4 `generatorData` lacks those keys - `maps-wizard-subscriber.js:229-230`), but the import recomputes both as `true` from the handler `importAssociations = 'multiple-with-association-by-loader' === data.generatedMapsHandler` (`maps-wizard-subscriber.js:377-380`), so `RoomsAssociationsCreator.provideRoomByName` auto-loads and recursively creates any interior room (`rooms-associations-creator.js:341-353`). It writes one `rooms` row per map `{name, title, map_filename:<name>.json, scene_images}` (`maps-importer.js:261-281`) plus `roomsChangePoints {room_id, tile_index, next_room_id}` and `roomsReturnPoints {room_id, direction, x, y, is_default, from_room_id}` from the `change-point-for-`/`return-point-for-` properties (parsed at `rooms-associations-creator.js:100-137,237-295`; the roomsReturnPoints rows are created in `saveReturnPoint` at `:306-335`, fields at `:317-325`). Map JSON + tilesets are copied to `<projectTheme>/assets/maps/` and `<dist>/assets/maps/` from `generate-data/generated` (`maps-importer.js:354-372`).

If a room with that name already exists, delete or rename it first - import hard-fails on collision.
    Example: `MapsImporter.loadValidMaps()` throws errorCode `mapExists` if a `rooms` row already has the name (`maps-importer.js:156-169`), even though the generate guard only warns via `/maps-wizard/api/rooms-exist`.

Reboot the game server after import.
    Example: the selection page states "The Game Server requires a reboot in order to make the maps available on the game." - there is no hot-plug for new maps; refreshing the page instead regenerates a new random set (`maps-wizard-maps-selection.html:27-28`).
