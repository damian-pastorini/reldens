# Tile Ids and Annotations Pipeline

Companion to `tileset-to-map-generator-technical.md`. That document describes WHAT data moves between the tileset editor, `@reldens/tileset-to-tilemap`, `@reldens/tile-map-optimizer` and `@reldens/tile-map-generator`. This one describes the tile id spaces those values live in, and the invariants a tile option must satisfy to survive the whole chain and render the intended art.

Every wrong tile bug seen so far has been one of two things: a value used in the wrong id space, or a tile that was never carried into the packed tilesheet.

## The three tile id spaces

A tile id is only meaningful together with the tileset it indexes. There are three distinct spaces and they are not interchangeable.

**1. Source local id.** What the tileset editor stores in `session-editor-state.json`. Computed as `flatIndex = row * tilesetColumns + col`, zero based, relative to one source PNG. Example: `inside.png` has 48 columns, so local id 49 is row 1 column 1.

**2. Composite gid.** What `composite.json` and `map-generator-config.json` hold. The composite is a Tiled map that declares every source tileset as its own entry with a `firstgid`, assigned as a running sum of each tileset `tilecount`. Composite gid equals source local id plus that tileset firstgid. The composite never repacks pixels: it references the source PNGs unchanged, so these ids are stable when the selection changes.

**3. Optimized gid.** What the generated map under `generate-data/generated` holds. Before generating, `ElementsProvider.optimizeMap()` runs `TileMapOptimizer`, which builds a brand new compact tilesheet containing only the tiles it collected, and rewrites every layer value through an old gid to new gid map. A map that used tiles spread over a 1680 tile source sheet typically ends up with a 90 tile sheet.

The failure mode to watch for: a composite gid written into a generated map that was never translated into optimized space. The number stays valid, so nothing errors, and it silently points at unrelated art.

## What the optimizer collects, and the parking invariant

`TileMapOptimizer.parseJSON` collects exactly two sources:

- every gid that literally appears in a top level layer `data` array
- animation frame gids declared on tileset `tiles` entries

Nothing else. A tile referenced only by a tileset `tiles` property, only by a wangset, or only by an objectgroup object gid is not collected. It is absent from the packed sheet, and any annotation pointing at it cannot be resolved afterwards.

This is why the composite carries a layer named `tileset-ref`. It is a configuration only layer whose data parks one cell per annotated tile so the optimizer sees those gids and keeps them. It is consumed by the pipeline and never appears in a generated map.

**Invariant: any tile that is referenced by an annotation rather than by real map content MUST be parked in `tileset-ref`.**

Parking is produced by `CompositeTileAnnotationBuilder.collectAnnotatedFlatIds`, consumed in `CompositeBuilder.buildVariationLayers`. Adding a new tile option and forgetting to add it there produces exactly the symptom above: the option looks correct everywhere in the session and the config, and the generated map draws the wrong tile.

## Stage by stage

1. The tileset editor writes per tileset `tileOptions` in source local ids, plus optional root level `globalTileOptions` whose entries are `{tilesetKey, flatIndex}`.
2. `CompositeAnnotationResolver.resolve` merges per tileset options with the global ones and produces effective options per tileset. It only handles the props listed in its three vocabularies, so an option missing from those lists is dropped here.
3. `CompositeTileAnnotationBuilder.buildTileAnnotations` turns effective options into Tiled tile properties named `key`, and `collectAnnotatedFlatIds` parks their ids in `tileset-ref`.
4. `TileOptionsMerger.merge` converts the same options into composite gids for `map-generator-config.json`, applying the per tileset firstgid.
5. `MapsWizardConfigBuilder.applyTileOptions` copies an allow list of keys from that config into the generator data the wizard posts.
6. `ElementsProvider.optimizeMap` optimizes the composite, then `fetchPathTiles` reads the annotations back off the OPTIMIZED map, so the values it exposes are already in optimized space.
7. `MapDataMapper.fromProvider` merges posted config and provider values, provider last.
8. `RandomMapGenerator` consumes the result and writes the map.

## Precedence, and why it matters

`MapDataMapper.fromProvider` applies `fromElementsProvider` last, so provider values win. `removeEmptyGroundTiles` first deletes empty provider ground keys so a posted value can survive when the provider found nothing.

That fallback is a trap. Provider values are optimized gids and posted config values are composite gids. When an option is annotated, the provider wins and the ids are correct. When the annotation is missing, the raw composite gid silently survives into a map whose tileset is the packed sheet. Prefer making the option annotated over relying on the posted value.

## Option vocabularies

The three vocabularies live in one place, `npm-packages/tileset-to-tilemap/lib/constants.js`, and are consumed by both `TileOptionsMerger` and `CompositeAnnotationResolver`:

- `SCALAR_TILE_PROPS`: `groundTile`, `pathTile`, `borderTile`
- `LIST_TILE_PROPS`: `groundTiles`, `randomGroundTiles`
- `POSITIONAL_TILE_PROPS`: `surroundingTiles`, `corners`, `bordersTiles`, `borderCornersTiles`, `borderInnerCornersTiles`, `mapBorderWallsTiles`

Positional options are keyed either by relative coordinates (`-1,-1` through `1,1`) or by side and corner names (`top`, `left`, `top-left`), depending on the option. The coordinate to name conversion used for annotations is `TilesetConst.SPOT_SURROUNDING_POSITION_TO_NAME` and `SPOT_CORNER_POSITION_TO_NAME`.

## Annotation key prefixes

Annotations are Tiled tile properties named `key` whose value is:

- `groundTile` and `pathTile` for the scalars. Every entry of `groundTiles` is annotated as `groundTile`; `ElementsProvider.fetchPathTiles` collects the first into `groundTile`, the rest into `groundTiles`, then zeroes `groundTile` so the generator picks one at random per map.
- `border-<side>` and `border-<corner>` for `bordersTiles` merged with `borderCornersTiles`.
- `border-inner-corner-<corner>` for `borderInnerCornersTiles`. This branch must be tested BEFORE the generic `border-` branch in `fetchPathTiles`, otherwise the substring match swallows it.
- spot annotations are prefixed with the normalized spot name.

`mapBorderWallsTiles` has no annotation prefix. It does NOT travel as annotations at all: it becomes the `map-border-inner-walls` wangset, exactly like the spot walls become `{spotKey}-inner-walls`. The old `wall-<position>` annotations and the `MapBorderWallsMapper` that read them back by name were removed; if you find either name still referenced anywhere, it is dead.

## Map border, walls and openings

The border is drawn by `MapBorderGenerator.drawBorderLayer` from `bordersTiles`, which after the provider merge holds all eight keys, the four sides and the four outer corners.

Inner walls hang below the top border. `WallsGenerator.createLayerInnerWalls` places two tiles per matching column: the middle wall row directly below the border, then the top row below it, since `determineWallTiles` returns the pair middle first and `placeWallTiles` writes index 0 at `y + 1`. `InnerWalls.sequences` then caps each horizontal run.

This ordering looks inverted when read on its own, but it is the committed behaviour and it is what the real dungeon maps require. `WallsGenerator`, `InnerWalls` and the pattern classes are SHARED between the spot walls (used by the dungeon cave rooms) and the map border walls. Do not change the row order or the run caps to fix an appearance problem seen on a single map. `tests/test-data/dungeon-walls-expected.json` is the guard: if it fails after a walls change, the change is wrong. Never regenerate that expected file to make such a failure go away, because the spot wall validators only check pair membership and will not catch the inversion.

Because the generator names the row below the border `middle` and the row under it `top`, and caps runs with `sMR` on the left, a wall block picked in natural reading order reaches the generator rotated 180 degrees. That rotation is applied once, in `CompositeWangsetBuilder.remapWallsPositions()` against `MAP_BORDER_WALLS_SURROUNDING_POSITIONS` and `MAP_BORDER_WALLS_CORNER_POSITIONS`. The admin grid keeps natural `data-pos` values and no wangid table was duplicated.

One known limit of the current wall implementation, by design of the existing algorithm:

- the first and last columns are skipped, because the tile below the top border there is the left or right border tile and the placement gate requires an empty cell below

`MapBorderWallsDrawer` (`lib/generator/map-border-walls-drawer.js`) owns the border walls. A top border opening would be sealed by the wall drawn directly below it, so `openWallsForEntryPosition()` clears both wall rows over the opening columns, marks those grid positions walkable, and re-applies the inner walls patterns so the two new run ends get their end tiles.

Entry openings are cut by `createEntryPosition`, and the two tiles flanking the gap are stamped by `stampEntryPositionEnds` through `fetchOpeningEndTile`, which resolves two different vocabularies:

- `borderInnerCornersTiles` is rotated 180 degrees, the same as the wall band: a bottom opening takes the `top-*` pair, a top opening takes the `bottom-*` pair, and both flip left with right.
- the fallback outer corners flip only the side, because those are the map real corners: the left end of a bottom opening takes the tile the map already draws at its own bottom right corner.

When the map is auto grown, `redrawBorderForGrownMap` rebuilds the border ring and would reseal the gap, so `reapplyEntryPositionOpening` re-cuts it, re-stamps the ends and re-opens the walls. `PlacementRejectResolver.growMapBottom` still logs a critical telling you to set an explicit `mapSize` when using entry positions, because the change points recorded by the first pass stay on the pre grow row.

## Checklist for adding a new tile option

1. Add the key to the right list in `tileset-to-tilemap/lib/constants.js`. This alone wires `TileOptionsMerger` and `CompositeAnnotationResolver`.
2. Emit its annotation in `CompositeTileAnnotationBuilder.buildTileAnnotations`.
3. Park its ids in `CompositeTileAnnotationBuilder.collectAnnotatedFlatIds`, otherwise the optimizer drops the tiles.
4. Add the key to the `MapsWizardConfigBuilder.applyTileOptions` allow list.
5. Read the annotation back in `ElementsProvider.fetchPathTiles`, minding prefix ordering against existing substring matches.
6. Expose it on `MapDataMapper.fromElementsProvider` and declare plus assign it in `RandomMapGenerator`.
7. Consume it in the generator.
8. Add the editor UI: the grid in both the global panel and the per tileset row template in `theme/admin/templates/tileset-to-tilemap.html`, an entry in `positionOrders` in `tileset-tile-options-binder.js`, a clear rule in `tileset-tile-options-clearer.js`, and a marker in `canvas-markers.js`.

## Environment note

The reldens project resolves `@reldens/tileset-to-tilemap`, `@reldens/tile-map-generator` and `@reldens/tile-map-optimizer` from `reldens/node_modules`, which is linked to the sources under `npm-packages`, so edits there take effect immediately. The separate copy under `app/node_modules` can be stale and is not the one used by the admin. Check which copy is live before concluding that a change had no effect.
