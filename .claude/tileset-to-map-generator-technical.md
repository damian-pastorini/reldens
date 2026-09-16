# Tileset-to-Tilemap to Tile-Map-Generator: Technical Data Flow

This document covers the internal data contract between the `@reldens/tileset-to-tilemap` package and the `@reldens/tile-map-generator` package. It describes what data the tileset analyzer produces, what format the map generator expects, and how the two are connected through the Maps Wizard.

For the tile id spaces those values live in (source local id, composite gid, optimized gid), the `tileset-ref` parking invariant that keeps annotated tiles alive through the optimizer, and the checklist for adding a new tile option, see `tile-ids-and-annotations-pipeline.md`.

---

## Packages and Responsibilities

**`@reldens/tileset-to-tilemap`** (`npm-packages/tileset-to-tilemap/`)
- Accepts uploaded tileset PNGs, detects elements via pixel analysis, allows user annotation of tile roles (ground, path, surroundings, corners, spots, etc.)
- Generates `composite.json`, `map-generator-config.json`, per-element JSON files, and `session-editor-state.json`

**`@reldens/tile-map-generator`** (`npm-packages/tile-map-generator/` and `src/node_modules/@reldens/tile-map-generator/`)
- Reads `composite.json` and `map-generator-config.json`, processes them into a map layout, and writes the output Tiled JSON and PNG tileset

---

## Session State: What Gets Saved Per Tileset

After the user assigns tile roles in the Map Tiles tab, the session state (`session-editor-state.json`) stores per-tileset:

```json
{
  "tileOptions": {
    "groundTile":        42,
    "groundTiles":       [42, 44, 46],
    "pathTile":          85,
    "borderTile":        100,
    "randomGroundTiles": [43, 44, 45],
    "surroundingTiles":  { "top-left": 10, "top-center": 11, "top-right": 12 },
    "corners":           { "top-left": 20, "top-right": 21, "bottom-left": 22, "bottom-right": 23 },
    "bordersTiles":      { "top": 30, "right": 31, "bottom": 32, "left": 33 },
    "borderCornersTiles":{ "top-left": 40, "top-right": 41, "bottom-left": 42, "bottom-right": 43 },
    "borderInnerCornersTiles": { "top-left": 44, "top-right": 45, "bottom-left": 46, "bottom-right": 47 },
    "mapBorderWallsTiles": { "-1,-1": 69, "-1,0": 70, "0,0": 118, "1,1": 167 }
  },
  "spots": [
    {
      "name": "mySpot",
      "spotTile":          50,
      "spotTileVariations":[51, 52],
      "surroundingTiles":  { "top-left": 60, "top-center": 61 },
      "corners":           { "top-left": 70 },
      "bordersTiles":      { "top": 80 },
      "borderCornersTiles":{ "top-left": 90 },
      "width": 5,
      "height": 5,
      "quantity": 3,
      "freeSpaceAround": 1,
      "isElement": false,
      "allowPathsInFreeSpace": false,
      "walkable": true,
      "depth": null
    }
  ]
}
```

The session spot has no `layerName`: the generator config `layerName` is derived server side from the spot name by `TilesetCompositeConfigBuilder.buildGroundSpotConfig()`.

All tile values are **flat indices**: `flatIndex = row * tilesetColumns + col` (0-based).

`globalTileOptions` (stored at session root level, not per-tileset) uses the same structure but each entry is `{ tilesetKey, flatIndex }` to identify tiles across multiple tilesets, where `tilesetKey` is the source tileset `filename`. Legacy entries using the positional `{ tilesetIndex, flatIndex }` are still resolved as a fallback (`Helpers.resolveEntryTilesetIndex`).

---

## composite.json: The Full Contract

`composite.json` is a standard Tiled-format map JSON. The map generator reads tile roles exclusively from two places inside it: the **tileset entry's `tiles` array** and **special layer names**.

### Tileset Entry

Each tileset in `composite.json` must include a `tiles` array where each entry annotates a tile ID with its semantic role:

```json
"tilesets": [
  {
    "columns": 16,
    "firstgid": 1,
    "image": "my-tileset.png",
    "imageheight": 256,
    "imagewidth": 512,
    "margin": 0,
    "name": "my-tileset",
    "spacing": 0,
    "tilecount": 128,
    "tileheight": 16,
    "tilewidth": 16,
    "tiles": [
      { "id": 42, "properties": [{ "name": "key", "type": "string", "value": "groundTile" }] },
      { "id": 85, "properties": [{ "name": "key", "type": "string", "value": "pathTile" }] },
      { "id": 10, "properties": [{ "name": "key", "type": "string", "value": "top-left" }] },
      { "id": 11, "properties": [{ "name": "key", "type": "string", "value": "top-center" }] },
      { "id": 20, "properties": [{ "name": "key", "type": "string", "value": "corner-top-left" }] },
      { "id": 30, "properties": [{ "name": "key", "type": "string", "value": "border-top" }] },
      { "id": 50, "properties": [
          { "name": "groundSpots", "type": "string", "value": "mySpot" },
          { "name": "key",         "type": "string", "value": "groundTile" }
      ]},
      { "id": 60, "properties": [{ "name": "key", "type": "string", "value": "mySpot-top-left" }] },
      { "id": 70, "properties": [{ "name": "key", "type": "string", "value": "mySpot-corner-top-left" }] }
    ]
  }
]
```

The `id` field is a 0-based tile ID within the tileset - it equals the flat index directly (`id = flatIndex`). The global tile ID for any tile is `firstgid + flatIndex`.

### Key Property Values

- `"groundTile"` - Base ground tile - source: `tileOptions.groundTile`
- `"pathTile"` - Walkable path tile - source: `tileOptions.pathTile`. IMPORTANT: a tile marked as a `path` layer type keeps only its POSITION; its own gid is discarded and replaced by this single configured `pathTile` gid when the map is populated. Composite build: `tileset-to-tilemap/lib/composite-builder.js` `replacePathLayerTiles` overwrites every non-zero cell of any `path` layer with `pathTileCompositeId`. Random generation: `tile-map-generator/lib/generator/main-path-generator.js` writes `pathTile` into each path cell. Consequence: to keep a tile's actual image in an element, add that tile to a non-path layer type as well; each layer type is emitted as its own map layer, so the same tile index can exist on both a `path` layer (replaced by pathTile) and another layer (keeps its gid).
- `"top-left"` through `"bottom-right"` (9 positions) - Surrounding tiles - source: `tileOptions.surroundingTiles[pos]`
- `"corner-top-left"` through `"corner-bottom-right"` - Corner transition tiles - source: `tileOptions.corners[pos]`, prepend `"corner-"`
- `"border-top"` through `"border-left"` - Border/edge tiles - source: `tileOptions.bordersTiles[pos]`, prepend `"border-"`
- `"{spotName}-{pos}"` - Spot surrounding tiles - source: `spot.surroundingTiles[pos]`, prefix with `spotName+"-"`
- `"{spotName}-corner-{pos}"` - Spot corner tiles - source: `spot.corners[pos]`, prefix with `spotName+"-corner-"`

The `groundSpots` property name (not `key`) marks a tile as the ground tile for a named spot. A single tile can carry both `groundSpots` and `key: "groundTile"` to serve both roles.

How `ElementsProvider.fetchPathTiles()` detects the role:
- `property.name === "key"` and `value === "groundTile"` - sets `this.groundTile = tileId`
- `property.name === "key"` and `value === "pathTile"` - sets `this.pathTile = tileId`
- `property.name === "key"` and value starts with `"border-inner-corner-"` - sets `this.borderInnerCornersTiles[...]`; this branch is tested BEFORE the generic `border-` one
- `property.name === "key"` and value contains `"border-"` - sets `this.bordersTiles[value.replace("border-", "")] = tileId`
- the spot key is resolved by `GroundSpotsMapper.matchGroundSpotKey(value)`, which strips the trailing position name (and a trailing `-corner`) instead of counting dash-separated parts, so spot names containing hyphens still match. An empty result means the value belongs to the map itself
- value that does NOT contain `"corner-"` - surrounding tile: `groundSpotsPropertiesMappers[spotKey].mapSurroundingByKey(value, tileId)` when a spot key was resolved, otherwise `this.propertiesMapper.mapSurroundingByKey(value, tileId)`
- value that contains `"corner-"` - corner tile: `groundSpotsPropertiesMappers[spotKey].mapCornersByKey(cleanKey, tileId)` when a spot key was resolved, and `this.propertiesMapper.mapCornersByKey(cleanKey, tileId)` in every case
- `property.name === "groundSpots"` - sets `this.groundSpots[spotName] = tileId` (comma-separated spot names supported)

### Special Layer Names

`ElementsProvider.splitByLayerName()` recognizes these reserved layer names:

- `"ground"` - skipped as a special layer; the ground tile is identified from the tileset `tiles` property instead
- `"ground-variations"` - all non-zero tile IDs in `data[]` become `this.randomGroundTiles`
- layer name contains both `"spot-layer-"` and `"ground-variations-"` - after stripping both substrings the remainder is the `tilesKey`; non-zero tile IDs become `this.elementsVariations[tilesKey]`

Recommended layer name format for spot variations: `"spot-layer-ground-variations-{spotName}"`. After removing `"spot-layer-"` and `"ground-variations-"` the result is `"{spotName}"`, which must match the `tilesKey` in the groundSpots config.

Any other layer name is treated as an element layer. The name must have at least 3 dash-separated parts: `"{elementName}-{index}-{layerType}"`. The element group key is resolved by `fetchElementLayerGroup` (`elements-provider.js:178`):

1. Names starting with `stairs-up-` or `stairs-down-` are pinned to the keys `stairs-up` / `stairs-down` (hardcoded stair keys used by `prePlaceStairs` and the associated maps floor logic).
2. Otherwise the key is `ElementLayerName.parse(layerName).instanceId`: the known layer-type suffix (`collisions-over-player`, `collisions`, `over-player`, `below-player`, `path`, `base`) is stripped and the remainder is `{elementName}-{index}`, so multi-segment names keep per-instance groups (`house-clean-005-collisions` -> `house-clean-005`).
3. Names not ending in a known layer type fall back to `MapNaming.fuseGroupName`, the first two dash-separated parts joined (`tree-001-custom-suffix` -> `tree-001`).

Every group becomes exactly ONE placeable element: its layers are cropped together to the union bounding box of their tiles, and that cropped stamp is placed as one unit. The group's `quantity`, `freeSpaceAround`, `allowPathsInFreeSpace`, and `mapCentered` are read from `layer.properties` of the group's property-carrying layer.

---

## map-generator-config.json: The mapData Contract

`map-generator-config.json` feeds the `mapData` object passed to the map generator. The file is read by `LayerElementsCompositeLoader` when `mapData` is not provided directly (in the Maps Wizard, `mapData` is pre-parsed from the form's `generatorData` field).

```json
{
  "compositeElementsFile": "composite.json",
  "generatorType": "elements-composite-loader",
  "mapsInformation": [
    { "mapName": "my-map", "mapTitle": "My Map" }
  ],
  "tileOptions": { },
  "groundSpots": {
    "mySpot": {
      "layerName": "mySpot",
      "tilesKey": "mySpot",
      "width": 5,
      "height": 5,
      "quantity": 3,
      "freeSpaceAround": 1,
      "walkable": true,
      "isElement": false,
      "allowPathsInFreeSpace": false,
      "variableTilesPercentage": 0,
      "depth": false
    }
  },
  "factor": 1,
  "mainPathSize": 3,
  "blockMapBorder": true,
  "freeSpaceTilesQuantity": 2,
  "freeTilesMultiplier": 2,
  "variableTilesPercentage": 15,
  "collisionLayersForPaths": ["collisions"]
}
```

Key fields the map generator reads from `mapData`:
- `compositeElementsFile` - filename of composite.json relative to `rootFolder`
- `groundSpots` - object keyed by spot name; each entry configures a generated spot area. `tilesKey` must match the spot name used in the composite's tile property annotations and the variation layer name
- `factor` - image resize factor for the optimized tileset (1 = no resize)
- Map dimension and generation options: `mainPathSize`, `blockMapBorder`, `freeSpaceTilesQuantity`, `freeTilesMultiplier`, `variableTilesPercentage`, `collisionLayersForPaths`, `minimumDistanceFromBorders`, `splitBordersInLayers`, etc.
- `placeRejectResolver` - how a rejected element placement is resolved: `"moveElements"` relocates already placed movable elements to open space, `"autoGrow"` (default) grows the map bottom to fit the element. Exposed in the Maps Wizard as the "Elements place rejection resolve method" select (`placeRejectResolver-common`). Placement candidates are validated by a strict feasibility safeguard so every still-pending element keeps a free window; elements are never silently dropped (see the package `.claude/generator-flow.md` Stage 3c2)

Key fields in each `groundSpots` entry:
- `walkable` - when `false`, the generator appends `-collisions` to the spot layer name before the per instance suffix (e.g. `lake_001-collisions-s0`). The Reldens game engine reads any layer containing `collisions` as a non-walkable collision zone. Set to `false` for any spot the player should not be able to walk through.
- `depth` - controls where the spot layer is inserted in the final layer stack:
  - `false` (boolean) and `isElement: false` -> spot goes into the invisible-spots group, placed before the ground layer and hidden under it
  - `false` (boolean) and `isElement: true` -> spot is placed as an element at default order (after static layers, before path)
  - `true` (boolean) -> insert at position 1 (just below the ground layer)
  - string (layer name, e.g. `"ground-variations"`) -> insert immediately after the named layer; the spot tiles appear above it; combined with `isElement: true` this makes the spot visually prominent on top of the named layer. A name matching no layer falls back to position 1 (`MapLayersComposer.calculateTargetIndex`)
- `isElement` - when `true`, the spot participates in the element placement pipeline and respects the `depth` reordering. When `false`, the spot is stamped by `SpotLayersBuilder.generateInvisibleSpots()` at a random free position before the ground layer; `generateInvisibleSpots` does NOT filter by `depth`, so a non-element spot with a truthy `depth` is still placed and then reordered by `reorderLayersBasedOnSpots`.

**Note**: `tileOptions` in this config is NOT read by the map generator. The tile role assignments (ground, path, surrounding, etc.) must be encoded in the composite.json `tiles` array as described above. `tileOptions` in `map-generator-config.json` is currently unused by the generator.

---

## roomData: Setting Room Fields on Import

`roomData` is an optional object read by the maps importer (`MapsImporter.import`, `maps-importer.js:113`) and applied to every room row it creates, right after the importer defaults and before the insert (`maps-importer.js:281`). It is handled by `RoomImportData` (`lib/import/server/room-import-data.js`).

Shape:

```json
{
  "roomData": {
    "allRooms": {
      "customData": {"enabled": true}
    },
    "rooms": {
      "reldens-new-age-town": {
        "server_url": "https://some-server-url",
        "room_class_key": "custom-room",
        "customData": {"allowGuest": true}
      }
    }
  }
}
```

- `allRooms` properties are applied to every imported room.
- `rooms` properties are applied per map, matched by map name first and by map title as fallback, and they override `allRooms`.
- Keys must be the REAL rooms fields: `name`, `title`, `map_filename`, `scene_images`, `room_class_key`, `server_url` (assigned directly, primitives only: string, number, boolean or date) and `customData`.
- `customData` keys are set one by one through `RoomCustomData`, so the column stays a valid JSON string and only the provided keys change. This is how `{"customData": {"enabled": true}}` overrides the importer default of `enabled: false` for imported rooms, making the room usable on the next restart.
- Any other key, or a non-primitive value for a direct field, is ignored with a warning; it is NOT folded into `customData`.

Where to put it:

- Maps Wizard: add `roomData` to the `generatorData` JSON in the wizard textarea. The raw JSON is carried to the maps selection step as `handlerParams` (`maps-wizard-subscriber.js:260`, hidden input in `maps-wizard-maps-selection.html:17`), parsed back by `SelectedMapsImportRunner` (`selected-maps-import-runner.js:108`) and read from `handlerParams.roomData` by the importer.
- Outside the wizard (CLI `bin/import.js` maps import): add `roomData` at the top level of the import JSON, which is passed straight to `MapsImporter.import(data)`. A top level `roomData` wins over `handlerParams.roomData`.

---

## Processing Pipeline: composite.json to Generated Map

**Step 1 - `LayerElementsCompositeLoader.load()`**
- reads composite.json from `rootFolder/compositeElementsFile`
- sets `mapData.rootFolder = rootFolder`
- sets `mapData.tileMapJSON` = parsed composite.json content

**Step 2 - `RandomMapGenerator.fromElementsProvider(mapData)`**
- creates `ElementsProvider(mapData)`, calls `splitElements()`

**Step 3 - `ElementsProvider.optimizeMap()`**
- creates `TileMapOptimizer({ originalJSON: tileMapJSON, rootFolder })`
- `parseJSON()` scans composite layers for used tile IDs; reads `tileset.image` filename into `tileSet.tmp_image`
- `createThumbsFromLayersData()` calls `findImageFile(tileSet)` which looks for `rootFolder/tmp_image`. The tileset PNG must exist at `output/{sessionId}/{tileset.filename}`
- writes optimized tileset PNG and JSON to `generatedFolder/optimized/` (`ElementsProvider.optimizedFolder`, `GeneratedFoldersConstants.OPTIMIZED_SUB_FOLDER`)
- returns `{ newImage, newMap, newJSON, newJSONResized }`
- NOTE: the intermediate `optimized-*` files are deleted right after generation (`removeOptimizedMapFilesAfterGeneration` defaults to `true` in `RandomMapGenerator`), and `FileOperations.cleanAutoGeneratedProcessMapFiles` also removes the `generated/optimized/` folder itself once it is empty

**Step 4 - `ElementsProvider.fetchPathTiles()`**
- reads `optimizedMap.tilesets[0].tiles[]` properties
- populates `groundTile`, `pathTile`, `randomGroundTiles`, `surroundingTiles`, `corners`, `bordersTiles`, `groundSpots`, `groundSpotsPropertiesMappers`

**Step 5 - `ElementsProvider.splitByLayerName()`**
- groups composite layers by element name
- reads `ground-variations` and `spot-layer-*` layers for tile variation data

**Step 6 - `MapDataMapper.fromProvider(props, mapName, elementsProvider)`**
- merges `mapData` props with all ElementsProvider outputs: `groundTile`, `pathTile`, `randomGroundTiles`, `surroundingTiles`, `corners`, `bordersTiles`, `groundSpotsPropertiesMappers`, `layerElements`, `elementsQuantity`, `elementsFreeSpaceAround`, and others

**Step 7 - `RandomMapGenerator.resetInstance(mergedOptions)`**
- generates map grid, places elements, draws paths, generates spots

### rootFolder and Image Resolution

`rootFolder` = `tilesetSessionsDir/output/{sessionId}`

`TileMapOptimizer.findImageFile()` resolves tileset images as `rootFolder / tileSet.tmp_image`, where `tmp_image` is extracted from the tileset's `image` field in composite.json (last path component after `/`). The tileset PNG must therefore exist at `output/{sessionId}/{tileset.filename}` - placed there by `TilesetFilesBuilder.buildTilesetFilesEntries()` during the generate step.

---

## What CompositeBuilder Currently Generates

`CompositeBuilder.createTilesetEntry()` produces a full tileset entry including a `tiles` array built by `CompositeTileAnnotationBuilder.buildTileAnnotations()`. All assigned tile roles are encoded into Tiled property format and written into composite.json.

`buildVariationLayers()` additionally emits:
- A `"ground-variations"` layer when any tileset has `randomGroundTiles`
- A `"tileset-ref"` layer listing all annotated tile IDs (used for optimization)
- A `"spot-layer-ground-variations-{spotName}"` layer per spot that has `spotTileVariations`

Wangsets for inner and outer spot walls are built by `CompositeWangsetBuilder.buildSpotWangsets()` and attached to the tileset entry as `entry.wangsets`. Every wangset carries one color named after the terrain and uses `type: 'mixed'`, because its wangids fill both edge and corner slots, which is what makes it usable as a terrain in the tiled map editor app.

The map border inner walls travel through this same wangset mechanism: `CompositeWangsetBuilder.buildMapBorderWallsWangset()` emits the wangset named `map-border-inner-walls` (`TilesetConst.MAP_BORDER_WALLS_WANGSET_NAME`) out of the `mapBorderWallsTiles` grid, and `TilesShortcuts.fromPropertiesMappersList` picks it up by name, so the generator needs no border specific mapper. The grid is fed twice through `remapWallsPositions()`: once against `TilesetConst.MAP_BORDER_WALLS_SURROUNDING_POSITIONS` for the surrounding wangids, and once against `TilesetConst.MAP_BORDER_WALLS_CORNER_POSITIONS`, which turns the `0,-1` and `0,1` cells into the `top-right` and `top-left` corner names the wall run ends need (`TilesetConst.SPOT_CORNER_WANGIDS` is keyed by grid key as well as by corner name, so both spellings resolve).

The wall slot names belong to the generator, not to the tileset. `WallsGenerator.determineWallTiles()` writes `sMC` on the row directly below the top border and `sTC` on the row under it, and `InnerWalls.sequences()` caps each horizontal run with `sMR` on its left end and `sML` on its right end, plus `cTR` and `cTL` on the second row. So the wall block's own top row must reach the generator as the `middle-*` slots, its second row as the `top-center` slot and the `top-left` and `top-right` corners, and the columns are mirrored. That whole shift is expressed once, in `CompositeWangsetBuilder.remapWallsPositions()` against the two `MAP_BORDER_WALLS_*_POSITIONS` tables; the `mapBorderWallsTiles` grid in `theme/admin/templates/tileset-to-tilemap.html` keeps plain `data-pos` values (`-1,-1` NW through `1,1` SE) so the tiles are picked in their natural reading order in the admin. `tests/test-data/reldens-dungeon-composite.json` shows the same convention on the working `cave-inner-walls` wangset, and `tests/test-data/house-composite.json` with `tests/test-data/map-border-walls-expected.json` prove it end to end for the border.

The generated map also carries terrain sets, controlled by the maps wizard common option `Include Spots As Terrains` (`includeSpotsAsTerrains`, default Yes). Only the spots actually placed in that map become terrains, so a spot with `quantity: 0` or one that failed placement is never written, and tiles outside the map tileset are dropped. The generator collects the tile positions per spot in `SpotGenerator.appendSpotTerrains()` and writes them into `tilesets[0].wangsets` through `SpotTerrainsBuilder`, using the same position and wangid table its `WangsetMapper` reads, so a generated map can be fed back as a composite and its spots are recognized again. The optimizer already remaps terrain set tile ids, so optimized maps keep them.

`TilesetCompositeConfigBuilder.buildGroundSpotConfig()` outputs well-formed groundSpots entries including `layerName`, `tilesKey`, `width`, `height`, `quantity`, `freeSpaceAround`, `walkable`, `isElement`, `allowPathsInFreeSpace`, `splitBordersInLayers`, `borderInnerWalls`, `borderOuterWalls`, `borderOuterWallsIncreaseLayerSize`, and `depth`. When `borderOuterWalls` or `borderInnerWalls` is true, `splitBordersInLayers` is forced true automatically (required for wall layers to be included in generator output). `depth` defaults to `true` when the key is absent from the session data; the UI allows an empty value, `true`, or a layer name string - coercion from the text input converts `""` and `"false"` to `null`, `"true"` to boolean `true`, and any other string is kept as-is.

---

## Tile Animations: Editor to Generated Map

Animated tiles are configured per tileset in the editor Animations panel and stored in the session state next to
`tileOptions` and `spots`:

```json
{
  "animationsDefaultDuration": 200,
  "skipTileAnimations": false,
  "tileAnimations": [
    {
      "name": "water-flow",
      "baseTile": 242,
      "defaultDuration": null,
      "frames": [
        { "tile": 242, "duration": null },
        { "tile": 244, "duration": 300 }
      ]
    }
  ]
}
```

`baseTile` and `frames[].tile` are **flat indices** (`flatIndex = row * tilesetColumns + col`, 0-based, tileset
local), the same values used by every other tile option, and they must be stored as numbers (they are validated
with `sc.isInt`, anything else is dropped).

Duration precedence per emitted frame: frame `duration`, then the animation `defaultDuration`, then the tileset
`animationsDefaultDuration`, then the package constant `TilesetConst.ANIMATIONS_DEFAULT_DURATION` (200). The
resolution is falsy driven, so `null`, `0` and empty values fall through to the next level, and every emitted frame
ends with an explicit numeric duration.

Frame order is user controlled by drag and drop, implemented in `theme/admin/js/tileset-to-tilemap/tileset-animation-frames-reorder.js`
(`TilesetAnimationFramesReorder`, instantiated in the `TilesetAnimationsBinder` constructor and wired in
`bindTileset()` through `bindList()`). It delegates `dragstart`, `dragover`, `drop` and `dragend` on
`.tileset-animations-list`, the same delegation the click and input handlers use, and the frame cells carry
`draggable="true"` from the `.tileset-animation-frame-template` while the duration input carries `draggable="false"`
so dragging inside the number field does not start a frame drag. A drop is only accepted when the target frame
belongs to the same animation (it compares `data-animation-index`), so frames cannot be moved across animations.
The move splices the frame object out and back in at the target index, which carries its per frame `duration` along,
then `refreshPanel()` re-renders the list so every `data-frame-index` is re-derived and the remove buttons and
duration inputs stay aligned. Nothing else was needed for persistence: the order lives in `animation.frames`, which
`tileset-serializer.js` already writes.

After every move the reorder sets `animation.baseTile = animation.frames[0].tile`, so the first frame is always the
main frame. Dropping a frame into the first position makes it the base tile, and dragging the current base out of
the first position promotes whatever lands there, which matches what `resolveBaseTile()` already does when the base
tile frame is removed with right click. This also means `buildFrames()` never has to prepend the base tile after a
reorder, so the emitted frame count stays the same as the list shown in the editor. Changing the base tile changes
which map cells play the animation, since the base tile is the tile actually painted on the map.

`skipTileAnimations` is the "Skip tile animations" checkbox of the Animations panel (`.tileset-animations-skip`,
bound in `tileset-animations-binder.js`, rendered by `tileset-animations.js`, persisted by `tileset-serializer.js`
and loaded by `state-builder.js`). Checked, `TileAnimationsBuilder.build()` returns nothing for that tileset, so the
composite carries no `animation` key and the optimizer does not force the frame tiles into the packed sheet. The
animations data survives in the session, so the switch is reversible and works as an A/B for anything suspected to
come from the animated tiles. It does not change the merge: merging preserves the animations and the resulting
merged tileset starts unchecked.

`TileAnimationsBuilder.build()` (`tileset-to-tilemap/lib/tile-animations-builder.js`) emits an animation ONLY when
its `baseTile` belongs to the tiles the tileset actually uses: the annotated flat ids (tile options plus every spot
tile, surrounding, corner and wall) union every tile of every element layer. An animation on an unused base tile is
dropped so the optimizer is not forced to pack tiles nothing references. Frames are not filtered: a used base tile
pulls its frames into the optimized sheet even when they are not painted anywhere.

The output goes into the composite tileset entry `tiles` array, merged by tile id with the role annotations by
`CompositeTileAnnotationBuilder.mergeDuplicateTileAnnotations()`. A tile can therefore carry `properties` and
`animation` at once, and an animated tile with no role is emitted with only the `animation` key (empty
`properties` arrays are removed):

```json
{ "id": 242, "animation": [{ "duration": 200, "tileid": 242 }, { "duration": 300, "tileid": 244 }] }
```

When the first configured frame is not the base tile, the base tile is prepended as frame 1, because Tiled expects
the animated tile to be the first frame of its own animation.

Merged tilesets: `TilesetsMerge.run()` remaps the animations through `TileAnimationsBuilder.remapForMerge()` using
each placement `rowOffset` and `colOffset` against the merged column count. The result is session shaped (not
Tiled shaped) with every frame duration baked to an explicit number and `defaultDuration` reset to `null`, and it
is stored in the merged tileset state as `tileAnimations` plus `animationsDefaultDuration`, so a merged tileset
behaves like an uploaded one.

Downstream both packages already carry animations without any change:
- `TileMapOptimizer.parseJSON()` force-adds the animated base tile gid and every frame gid to the used tiles, so
  frame-only tiles are never stripped from the packed image; `createNewJSON()` remaps the entry `id` and each
  `frame.tileid` to their new packed positions and copies the durations verbatim.
- `MapDataMapper` assigns `result.tiles = optimizedTileset.tiles` and `RandomMapGenerator` emits that array in the
  tileset entry of the final map JSON, so the animations arrive in the generated map with optimized tileset local
  ids.

---

## Maps Wizard Server-Side Flow

**`POST /admin/maps-wizard`**
- body: `{ mainAction, mapsWizardAction, tilesetSessionId, generatorData }`

**`MapsWizardSubscriber.generateMaps()`**
1. parses `generatorData` JSON into `mapData`
2. builds `rootFolder = tilesetSessionsDir/output/{safeSessionId}` when a session id was posted (otherwise `themeManager.projectGenerateDataPath`) and puts it, plus `generatedFolder = themeManager.projectGeneratedDataPath`, into `handlerParams`
3. hands `selectedHandler` + `handlerParams` to `MapsWizardRunner.run()` (`lib/admin/server/subscribers/maps-wizard-runner.js`), which for the `elements-composite-loader` strategy:
4. creates `LayerElementsCompositeLoader(handlerParams)` and calls `loader.load()` - reads `rootFolder/composite.json`, validates schema
5. creates `new RandomMapGenerator()`
6. calls `generator.fromElementsProvider(loader.mapData)`
7. calls `generator.generate()` - writes output to `generate-data/generated/`

**`GET /tileset-analyzer/api/session-wizard-config?sessionId=X`**
1. reads `output/{sessionId}/map-generator-config.json`
2. calls `MapsWizardConfigBuilder.buildPartialGeneratorData(config)`
3. returns `{ strategy, partialData: { compositeElementsFile, ... } }` to pre-fill the Maps Wizard form

`mapData` passed to the loader comes from the form's `generatorData` textarea (pre-filled from the API above, then edited by the user). It does not contain tileset image paths - only the `compositeElementsFile` filename and generation parameters. The tileset image is resolved at runtime from `rootFolder`.

## Missing Composite Resolution at Generation Time

`MapsWizardSubscriber.generateMaps()` checks the composite before handing anything to the runner (`lib/admin/server/subscribers/maps-wizard-subscriber.js:233-238`):

```javascript
let compositeElementsFile = sc.get(mapData, 'compositeElementsFile', '');
if(compositeElementsFile
    && !this.compositeSampleFilesProvider.ensureCompositeFile(rootFolder, compositeElementsFile)
){
    return this.mapsWizardRedirect(res, 'mapsWizardMissingCompositeFileError', safeSessionId);
}
```

`CompositeSampleFilesProvider.ensureCompositeFile()` (`lib/admin/server/composite-sample-files-provider.js`) reads the composite from the session folder when it is already there, and only copies the tileset images it references that are still missing. When the composite itself is missing it resolves the sample from the installed package at `projectRoot/node_modules/@reldens/tile-map-generator/examples/layer-elements-composite/`, then copies BOTH the composite JSON and every tileset image that JSON references into the session folder, so the next run reuses the copied files instead of resolving again. In both cases it then recurses over the composites named by the `compositeFileNames`, `downFloorCompositeFileNames` and `upperFloorCompositeFileNames` layer properties, so the associated maps composites are provided too.

This is why each wizard strategy keeps its own sample payload. Pointing every strategy at the same `composite.json` destroys the per strategy data. The four strategies and the loader each one routes to:

- `elements-object-loader` uses `LayerElementsObjectLoader`
- `elements-composite-loader` uses `LayerElementsCompositeLoader` and needs `compositeElementsFile`
- `multiple-by-loader` needs `mapNames`
- `multiple-with-association-by-loader` needs `mapsInformation` plus `associationsProperties`

### The result code is a client side message key

`mapsWizardRedirect` puts the code in the `result` query parameter. `AdminClient` renders it at `theme/admin/js/reldens-admin-client.js:128` with `this.errorMessages[result] || result`, so any code with no entry in the `errorMessages` map is shown to the user as the raw identifier. `mapsWizardMissingCompositeFileError` and its sibling codes (`mapsWizardMissingActionError`, `mapsWizardMissingDataError`, `mapsWizardWrongJsonDataError`, `mapsWizardMissingHandlerError`, `mapsWizardGeneratorError`, `mapsWizardSelectedHandlerError`, `mapsWizardMapsNotGeneratedError`, `mapsWizardMissingElementsFilesError`) all have entries now.

## Maps Wizard Cards and the Elements Editor

### Card layout and the aspect ratio

The wizard options list is a flex row defined by `.wizard-options-container` in `theme/admin/css/container-maps-wizard.css`. Each generated map is one `.wizard-map-option-container` card, and the card clamps its preview canvas so several maps fit side by side.

That clamp is the reason the elements editor used to distort the map: the editor mounts a much larger canvas into a card sized for a thumbnail. The fix is the `.is-editing` state on the card, which sets `flex: 0 0 100%` and `order: -1` so the editing card takes the full row and jumps to the front, and lifts the clamp with `max-width: none` on the canvas.

Important detail for anyone changing this: the clamp selector is nested four classes deep (`.maps-wizard .wizard-options-container .wizard-map-option-container .map-canvas-container canvas`), so its specificity is 0,4,1. An override written in `container-maps-elements-editor.css` at 0,2,1 is inert no matter the source order. The override has to live inside the same nested block in `container-maps-wizard.css`.

`EditorUi.dispose()` (`theme/admin/js/maps-elements-editor/editor-ui.js:97`) also clears the inline `width` and `height` it set in `applyZoom()` (line 193) before returning the canvas to its original parent. Without that the zoomed inline sizes stay on the element and the thumbnail stays broken after the editor closes.

### Why the preview modal died after closing the editor

Opening the editor replaces the card canvas, and the replacement is a clone. Cloning a node copies attributes but NOT event listeners, so the cloned canvas lost both its `click` listener and its `data-toggle="modal"` attribute, and clicking the preview after closing the editor did nothing.

`AdminMapElementsEditorLauncher` handles this explicitly:

- `openEditor()` stores the canvas on the button as `button.editorCanvas` and calls `toggleEditingCard(button, true)`
- `closeEditor()` calls `reattachExternalListeners(button.editorCanvas)`, which re-sets `data-toggle` and re-binds the click handler that calls `adminFunctions.openElementModal(canvas)`, then nulls the reference and calls `toggleEditingCard(button, false)`

### Tileset editor hover readout

`TilesetCanvasTileReadout` (`theme/admin/js/tileset-to-tilemap/canvas-tile-readout.js`) shows the tile under the cursor as column, row and flat index while hovering the tileset canvas, which is what makes picking spot tile indexes possible without counting tiles by hand.

It does not compute the tile itself. It reuses `app.interaction.tileEditor.getTileFromEvent(event, canvas, tileset)`, the same resolution the click handler uses, so the readout can never disagree with what a click would select. It is wired from `tileset-row-binder.js` on `mousemove` and `mouseleave`, and its container sits above `.canvas-scroll-area` with a fixed height in `component-canvas-panel.css` so showing and clearing the text never shifts the layout.

