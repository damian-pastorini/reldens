# Tileset-to-Tilemap to Tile-Map-Generator: Technical Data Flow

This document covers the internal data contract between the `@reldens/tileset-to-tilemap` package and the `@reldens/tile-map-generator` package. It describes what data the tileset analyzer produces, what format the map generator expects, and how the two are connected through the Maps Wizard.

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
    "pathTile":          85,
    "borderTile":        100,
    "randomGroundTiles": [43, 44, 45],
    "surroundingTiles":  { "top-left": 10, "top-center": 11, "top-right": 12 },
    "corners":           { "top-left": 20, "top-right": 21, "bottom-left": 22, "bottom-right": 23 },
    "bordersTiles":      { "top": 30, "right": 31, "bottom": 32, "left": 33 },
    "borderCornersTiles":{ "top-left": 40, "top-right": 41, "bottom-left": 42, "bottom-right": 43 }
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
      "layerName": "my-spot-layer"
    }
  ]
}
```

All tile values are **flat indices**: `flatIndex = row * tilesetColumns + col` (0-based).

`globalTileOptions` (stored at session root level, not per-tileset) uses the same structure but each entry is `{ tilesetIndex, flatIndex }` to identify tiles across multiple tilesets.

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
- `"pathTile"` - Walkable path tile - source: `tileOptions.pathTile`
- `"top-left"` through `"bottom-right"` (9 positions) - Surrounding tiles - source: `tileOptions.surroundingTiles[pos]`
- `"corner-top-left"` through `"corner-bottom-right"` - Corner transition tiles - source: `tileOptions.corners[pos]`, prepend `"corner-"`
- `"border-top"` through `"border-left"` - Border/edge tiles - source: `tileOptions.bordersTiles[pos]`, prepend `"border-"`
- `"{spotName}-{pos}"` - Spot surrounding tiles - source: `spot.surroundingTiles[pos]`, prefix with `spotName+"-"`
- `"{spotName}-corner-{pos}"` - Spot corner tiles - source: `spot.corners[pos]`, prefix with `spotName+"-corner-"`

The `groundSpots` property name (not `key`) marks a tile as the ground tile for a named spot. A single tile can carry both `groundSpots` and `key: "groundTile"` to serve both roles.

How `ElementsProvider.fetchPathTiles()` detects the role:
- `property.name === "key"` and `value === "groundTile"` - sets `this.groundTile = tileId`
- `property.name === "key"` and `value === "pathTile"` - sets `this.pathTile = tileId`
- `property.name === "key"` and value starts with `"border-"` - sets `this.bordersTiles[value.replace("border-", "")] = tileId`
- `property.name === "key"` and value starts with `"corner-"` in isolation (2-part split) - calls `this.propertiesMapper.mapCornersByKey(cleanKey, tileId)`
- `property.name === "key"` and value splits to 3 parts and is not a corner - spot surrounding: calls `this.groundSpotsPropertiesMappers[spotKey].mapSurroundingByKey(value, tileId)`
- `property.name === "key"` and value splits to 4 parts and is a corner - spot corner: calls `this.groundSpotsPropertiesMappers[spotKey].mapCornersByKey(cleanKey, tileId)`
- `property.name === "groundSpots"` - sets `this.groundSpots[spotName] = tileId` (comma-separated spot names supported)

### Special Layer Names

`ElementsProvider.splitByLayerName()` recognizes these reserved layer names:

- `"ground"` - skipped as a special layer; the ground tile is identified from the tileset `tiles` property instead
- `"ground-variations"` - all non-zero tile IDs in `data[]` become `this.randomGroundTiles`
- layer name contains both `"spot-layer-"` and `"ground-variations-"` - after stripping both substrings the remainder is the `tilesKey`; non-zero tile IDs become `this.elementsVariations[tilesKey]`

Recommended layer name format for spot variations: `"spot-layer-ground-variations-{spotName}"`. After removing `"spot-layer-"` and `"ground-variations-"` the result is `"{spotName}"`, which must match the `tilesKey` in the groundSpots config.

Any other layer name is treated as an element layer. The name must have at least 3 dash-separated parts: `"{elementName}-{index}-{layerType}"`. The element group key is the first two parts joined, e.g. `"tree-001"`. The group's `quantity`, `freeSpaceAround`, `allowPathsInFreeSpace`, and `mapCentered` are read from `layer.properties` on the first layer of each group.

---

## map-generator-config.json: The mapData Contract

`map-generator-config.json` feeds the `mapData` object passed to the map generator. The file is read by `LayerElementsCompositeLoader` when `mapData` is not provided directly (in the Maps Wizard, `mapData` is pre-parsed from the form's `generatorData` field).

```json
{
  "compositeElementsFile": "composite.json",
  "generatorType": "composite",
  "mapsInformation": [
    { "mapName": "my-map", "mapTitle": "My Map" }
  ],
  "tileOptions": { },
  "groundSpots": {
    "mySpot": {
      "layerName": "my-spot-layer",
      "tilesKey": "mySpot",
      "width": 5,
      "height": 5,
      "quantity": 3,
      "freeSpaceAround": 1,
      "walkable": true,
      "isElement": false,
      "allowPathsInFreeSpace": false,
      "variableTilesPercentage": 0
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

**Note**: `tileOptions` in this config is NOT read by the map generator. The tile role assignments (ground, path, surrounding, etc.) must be encoded in the composite.json `tiles` array as described above. `tileOptions` in `map-generator-config.json` is currently unused by the generator.

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
- writes optimized tileset PNG to `rootFolder/generated/`
- returns `{ newJSON, newJSONResized }`

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

## What CompositeBuilder Currently Generates (Missing Data)

`CompositeBuilder.createTilesetEntry()` produces a tileset entry with no `tiles` array. As a result:

- `ElementsProvider.fetchPathTiles()` finds no tile properties - `groundTile = 0`, `pathTile = 0`, `surroundingTiles = {}`, `corners = {}`, `bordersTiles = {}`, `groundSpots = {}`
- The map generator has no ground tile, no path tile, and no surrounding/corner data
- Spots in `mapData.groundSpots` are structurally incomplete: `TilesetCompositeConfigBuilder.buildTilesetData()` merges spot names but does not output `tilesKey`, `layerName`, `walkable`, or any generation parameters

The `tileOptions` data and `spots` array exist in the session state and are partially forwarded to `map-generator-config.json`, but neither the tile property annotations in composite.json nor the special ground/variation layers are generated.

Everything required to generate a functional map is present in the session state - it is just never written into composite.json in the format the map generator can read.

---

## Fix Scope: CompositeBuilder and TilesetCompositeConfigBuilder

To make the Maps Wizard functional, two classes in `npm-packages/tileset-to-tilemap/lib/` need changes:

### CompositeBuilder

`createTilesetEntry(tileset, firstgid)` must receive `tileOptions` and `spots` and produce:
- A `tiles[]` array encoding each assigned tile's role via Tiled property format (see key values above)
- Spot tile - `groundSpots` property + `key: "groundTile"`
- Spot surrounding and corner tiles - spot-prefixed key values

`buildCompositeJSON(tilesets)` must also emit:
- A `"ground-variations"` layer if any tileset has `randomGroundTiles`
- A `"spot-layer-ground-variations-{spotName}"` layer per spot that has `spotTileVariations`

### TilesetCompositeConfigBuilder

`buildTilesetData(sizeTilesets, ...)` currently merges spots by name only. It must output well-formed `groundSpots` entries:

```json
{
  "mySpot": {
    "layerName": "spot.layerName or 'ground-spot-{spotName}'",
    "tilesKey": "spot.name",
    "width": "spot.width",
    "height": "spot.height",
    "quantity": "spot.quantity",
    "freeSpaceAround": "spot.freeSpaceAround",
    "walkable": "spot.walkable",
    "isElement": "spot.isElement",
    "allowPathsInFreeSpace": "spot.allowPathsInFreeSpace",
    "variableTilesPercentage": "spot.variableTilesPercentage or 0"
  }
}
```

---

## Maps Wizard Server-Side Flow

**`POST /admin/maps-wizard`**
- body: `{ mainAction, mapsWizardAction, tilesetSessionId, generatorData }`

**`MapsWizardSubscriber.generateMaps()`**
1. parses `generatorData` JSON into `mapData`
2. builds `rootFolder = tilesetSessionsDir/output/{safeSessionId}`
3. creates `LayerElementsCompositeLoader({ mapData, rootFolder })`
4. calls `loader.load()` - reads `rootFolder/composite.json`, validates schema
5. creates `new RandomMapGenerator()`
6. calls `generator.fromElementsProvider(loader.mapData)`
7. calls `generator.generate()` - writes output to `rootFolder/generated/`

**`GET /tileset-analyzer/api/session-wizard-config?sessionId=X`**
1. reads `output/{sessionId}/map-generator-config.json`
2. calls `MapsWizardConfigBuilder.buildPartialGeneratorData(config)`
3. returns `{ strategy, partialData: { compositeElementsFile, ... } }` to pre-fill the Maps Wizard form

`mapData` passed to the loader comes from the form's `generatorData` textarea (pre-filled from the API above, then edited by the user). It does not contain tileset image paths - only the `compositeElementsFile` filename and generation parameters. The tileset image is resolved at runtime from `rootFolder`.
