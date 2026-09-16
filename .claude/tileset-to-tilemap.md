# Tileset to Tiled Map - Usage Guide

The tileset-to-tilemap tool converts game tileset PNG images into Tiled-compatible JSON map files for use with the Reldens platform. Access it from the admin panel at `/tileset-analyzer/` (under the admin root path, linked from the "Wizards" sidebar group).

## Step 1 - Upload and Analyze

Select one or more tileset PNG files using the file input. For each file a parameter fieldset appears with:
- **Tile Width / Height**: dimensions of each tile in pixels (presets: 16, 32, 48, 64)
- **Spacing**: pixel gap between tiles
- **Margin**: pixel offset from image edge to first tile
- **Background Color**: hex color treated as transparent background (e.g. `#000000`)
- **Resize**: optional scale factor applied before analysis
- **Lock icon**: locks width/height together so changing one changes the other
The **Resize All** control applies the same resize to every selected file at once.
Click **Analyze** to upload. Progress streams in real time. The tool runs pixel-level cluster detection on each tileset, then optionally sends cropped clusters to AI for naming and layer assignment.

## Step 2 - Review Section

After analysis the upload section hides and the review section appears. The top bar (sticky) contains:
- **Session Name**: optional suffix appended to the auto-generated session ID timestamp
- **Override session** checkbox (checked by default): when checked, saving rewrites the current session on disk; when unchecked every save creates a new timestamped session
- **Save Session**: saves the full current state; prompts for confirmation
- **Generate All**: generates output files for all elements in every tileset
- **Generate Selected**: generates output files only for elements marked with the bulk-select checkbox

## Step 3 - Canvas and Legend

Each uploaded tileset gets its own row containing a canvas panel and a legend panel.

### Canvas
The canvas shows the tileset image with overlays:
- **Tile grid**: faint lines showing tile boundaries
- **Filtered tiles**: gray dashed overlay on tiles excluded by variance threshold (mostly empty or near-solid tiles)
- **Element overlays**: each detected element gets a unique color; clusters use a dashed border
- **Tile option markers**: small labeled squares in the corner of assigned tiles - Ground (G), Path (P), Border (B), Random (R), Spot Tile (ST), animation base (A) and animation frame (AF). Tiles of a positional group (surrounding, corners, borders, border inner corners, map border walls, inner/outer walls) are labeled with their position (NW, N, NE, W, C, E, SW, S, SE, TL, TR, BL, BR, T, R, B, L) and are only drawn while that group is expanded

**Canvas interactions:**
- Left-click a tile: adds it to the active element under the active layer type; removes it if already there; moves it if it belongs to a different layer
- Left-drag: bulk-applies using the mode set by the first tile clicked (add / remove / move)
- Right-click: removes the tile from the element regardless of layer
- Right-drag: continues removing while dragging
- Shift+click: selects the element that owns the clicked tile
- Click on empty canvas with no selection: selects the element owning that tile
- Ctrl+scroll: zooms the canvas (0.25x to 4x); tile coordinate mapping stays correct at any zoom
- **View Selected / View All**: toggle to show only the selected element or all elements
- **Highlight All / Hide Others**: toggle to dim non-selected elements
- **Reset Zoom**: resets canvas zoom to 1x

### Legend
The legend lists every detected element, cluster, and spot in a single unified list. Controls:
- **Search box**: filters by name as you type
- **Show Elements / Show Clusters / Show Spots** checkboxes: toggle visibility of each group
- **Add Element**: creates a blank element you can populate by clicking tiles on canvas
- **Bulk select-all** checkbox: checks or unchecks all items (elements, clusters, and spots) at once
- **Toggle Lock**: toggles the `approved` flag on all bulk-selected elements/clusters
- **Convert All**: converts all bulk-selected clusters to elements
- **Detect AI / Name AI** (bulk, AI-dependent): runs AI detection or naming on all bulk-selected items
- **Delete** (trash icon): removes all bulk-selected unlocked items (elements, clusters, and spots); locked items are kept and shown in the confirmation count

> **Note**: The elements list is a single unified list containing all three map object types - elements, clusters, and spots. Bulk operations (select-all, delete, lock) apply across all three types together.

Each element/cluster row shows:
- **Header (click)**: selects/deselects the element; expands the detail section; scrolls canvas to its tiles
- **Name input**: kebab-case name validated as `^[a-z]+(?:-[a-z]+)*-\d+(?:-\d+)*$` (`SharedUtils.NAME_VALID_REGEX`); invalid or duplicated names block Generate
- **Lock button**: green closed padlock = locked (protected from bulk AI ops); open padlock = unlockable
- **Delete button**: removes the element after confirmation
- **Split into tiles** (clusters only): splits the cluster into individual single-tile elements
- **Convert to element** (clusters only): converts cluster to an approved element in-place
- **Detect Elements** (per cluster, AI): sends cluster tiles to AI, replaces with sub-elements
- **Detect Layers** (per element, AI): sends element tiles to AI, assigns correct layer types
- **Name** (per element, AI): sends element to AI and updates its name
- **Quantity**: how many times the element appears in the generated composite map
- **Free space around**: tile padding around the element in the generated map
- **Allow paths in free space**: whether path tiles can be placed in the element's padding
- **Layer type radios**: sets the layer type for NEW tiles added by clicking the canvas (below-player, collisions, over-player, collisions-over-player, base, path, or custom with a free-text suffix)

Each spot row shows:
- **Header (click)**: expands/collapses the spot's detail section
- **Name input**: identifier for the spot
- **Lock button**: locks the spot against bulk-delete
- **Delete button**: removes the spot after confirmation

## Step 4 - Element Types

**Cluster** (`type: cluster`, `approved: false`): a group of tiles detected by pixel connectivity that may contain multiple objects. Shown with dashed border. Bulk AI operations (Detect All, Name All) process clusters. Use **Split**, **Convert**, or **Detect AI** to resolve clusters into clean elements.

**Element** (`type: element`, `approved: true`): a named game object with one or more layers. Locked elements are skipped by bulk AI operations.

## Step 5 - Tile Options and Spot Config

Each tileset has a **Tile Options** section (accessible from the Map Tiles tab in the legend panel) for assigning specific tiles to map-generator roles. Assigned tiles are highlighted on the canvas with a semi-transparent colored fill so you can see at a glance what is already assigned. A **Global Map Tiles** panel (shown above the tilesets when more than one tileset is loaded) applies the same options across all tilesets; those assignments are also highlighted on every canvas.
The options are split in collapsible groups:
- **Ground Tiles**: Row 1 - **Ground** (`groundTiles`, multi-value, expands as tiles are added); Row 2 - **Variations** (`randomGroundTiles`, multi-value) additional ground variants placed randomly
- **Path Tiles**: 3x3 grid with the eight surrounding positions (`surroundingTiles`, NW/N/NE/W/E/SW/S/SE) and the walkable **Path** tile (`pathTile`) in the center cell
- **Path Corner Tiles**: 2x2 corner transitions (`corners`)
- **Border Tiles**: 3x3 grid combining the four sides (`bordersTiles`, T/R/B/L), the four map-edge corners (`borderCornersTiles`, NW/NE/SW/SE) and, in the center cell, the single **Border** fallback tile (`borderTile`), a non-directional last-resort fill used for the map edge when no directional side tile is assigned
- **Border opening end tiles**: 2x2 set (`borderInnerCornersTiles`) used on the two tiles flanking a border entry opening
- **Map Border Walls Tiles**: 3x3 grid (`mapBorderWallsTiles`) for the inner wall band hanging below the map border
To assign a tile click the option cell then click the desired tile on the canvas. Single-value options stay in picking mode after assignment so you can immediately see the result; multi-value options add one tile per click. Click the active option cell again to deactivate, or click **Cancel** in the status bar. Only one option can be active at a time - activating a new one deactivates the previous automatically.
The canvas renders a colored marker badge in the corner of each assigned tile alongside the highlight fill (G, P, B, R for the scalar and list options; the position name for the positional grids).

**Spots** are named locations on the map. Each spot has:
- **Depth** (text input): controls where this spot's layer is inserted in the final layer stack. Valid values:
  - empty or the literal text `false` (stored as `null`) - no reorder; for non-element spots this means the spot is placed in the invisible-spots group (under the ground layer, invisible to the player)
  - `true` - insert below the ground layer (integer depth = 1)
  - any layer name string (e.g. `ground-variations`, `path`) - insert this spot's layer immediately after the named layer; the spot tiles will be visible above that layer. A name that matches no layer in the generated map falls back to position 1
- **Name**: identifier for the spot
- **Is Element** checkbox: treat spot as a placed element, with free space and paths support, instead of an invisible-spot underlay
- **Width / Height**: dimensions in tiles (default 5x5)
- **Quantity**: how many instances to place on the map
- **Mark %**: percentage of spot tiles to mark (0-100)
- **Variable Tiles %**: percentage of tiles replaced with random variations
- **Walkable**: whether players can walk on this spot. When **unchecked** (walkable = false), the generator appends `-collisions` to the spot's layer name, which the Reldens game engine reads as a non-walkable collision zone. To make a spot act as an obstacle (e.g. a lake or wall), uncheck Walkable.
- **Spot Tile**: the single tile placed at the spot center (its own row)
- **Spot Tile Variations**: random tiles placed as ground within the spot (its own row, multi-value)
- **Surrounding / Corner tiles**: same positional sets as global options but scoped to this spot
- **Inner Walls / Inner Walls Corner tiles**: wall tiles placed at the inside border of the spot
- **Outer Walls / Outer Walls Corner tiles**: wall tiles placed 1 tile outside the spot boundary
- **Split Borders in Layers**: must be checked for inner/outer wall layers to appear in output; forced on automatically when either wall option is enabled
- **Border Inner Walls**: enables the inner wall ring
- **Border Outer Walls**: enables the outer wall ring (also forces Border Inner Walls on)
- **Border Outer Walls Size**: extra tile padding added around the outer wall layer (default 4; does not change wall thickness)

### Required configuration to make a spot visible with collisions

To have a spot appear visually on the map AND block player movement:
1. Check **Is Element**
2. Set **Depth** to a layer name the spot should appear above (e.g. `ground-variations`)
3. Uncheck **Walkable**
4. Assign **Spot Tile Variations** (tiles to fill the spot area)

Without step 2 the spot layer stays below the ground layer and the player never sees it. Without step 3 no collision layer is emitted and players walk through the spot freely.

Click a spot header to expand/collapse its detail section. When a spot is expanded its assigned tiles are highlighted on the canvas with an orange fill so you can see which tiles belong to it.

**Wall tile position keys** use `row,col` notation (`-1`=north, `0`=same, `1`=south / `-1`=west, `1`=east):

Inner Walls - placed AT the spot perimeter (5×5 example):
```
         col0       col1       col2       col3       col4
row0:  [-1,-1]    [-1, 0]    [-1, 0]    [-1, 0]    [-1, 1]
row1:  [ 0,-1]      S          S          S         [ 0, 1]
row2:  [ 0,-1]      S          S          S         [ 0, 1]
row3:  [ 0,-1]      S          S          S         [ 0, 1]
row4:  [ 1,-1]    [ 1, 0]    [ 1, 0]    [ 1, 0]    [ 1, 1]
```
`[ 0, 0]` = solid fill tile (used when surrounded by wall on all 4 sides).

Outer Walls - placed 1 tile OUTSIDE the spot boundary:
```
          col-1      col0      col1      col2      col3      col4      col5
row -1: [-1,-1]   [-1, 0]   [-1, 0]   [-1, 0]   [-1, 0]   [-1, 0]   [-1, 1]
row  0: [ 0,-1]      S         S         S         S         S        [ 0, 1]
...
row  5: [ 1,-1]   [ 1, 0]   [ 1, 0]   [ 1, 0]   [ 1, 0]   [ 1, 0]   [ 1, 1]
```

Corner tiles (`top-left`, `top-right`, `bottom-left`, `bottom-right`) are concave corners - only used when the wall bends inward (L-shaped or irregular spots). A plain rectangle never uses them.

## Step 6 - Per-Tileset Generate Controls

Each tileset row has its own generate controls:
- **Remove** (trash icon): removes this tileset from the session
- **Save** (per tileset): saves only this tileset's state into the session config
- **Generate** (per tileset): generates output files for all elements in this tileset
- **Generate Selected** (per tileset): generates output for only bulk-selected elements
- **Map Generator Configuration toggle**: shows/hides the Map File Name, Map Title and Maps Wizard Strategy inputs (plus the association properties editor when a multi-map strategy is selected)
- **Animations toggle**: shows/hides the Tile animations panel
- **Merge** checkbox and **Merge Configuration toggle**: include this tileset in a merge and configure the merge options

## Step 7 - AI Controls (visible when AI is enabled)

At the top of each tileset's controls row:
- **Provider select**: chooses the AI provider (Claude, Gemini, or Ollama models)
- **Detect Elements**: runs AI sub-element detection on every unlocked cluster one by one
- **Detect Layers**: runs AI layer assignment on every unlocked non-cluster element
- **Name All**: runs AI naming on every unlocked non-cluster element in a single batch

## Step 8 - Generate Output

Click **Generate All** (or per-tileset **Generate**) to produce all output files. In Reldens the session storage folder is `generate-data/tileset-sessions/`, so the files are written to `generate-data/tileset-sessions/output/{sessionId}/`:
- `session-editor-state.json`: full state snapshot used by the Load button
- `elements-config.json`: human-readable element configuration
- `{tileset-name}.png`: copy of the tileset PNG, named after the kebab-case map name when one is set (single copy; this is the file `composite.json` references)
- `ai-buffer/{imageId}`: per-session source copies named by upload id (the imageId is `{epoch}-{original-name}` and already includes the file extension); used as the AI routes' fallback image source, not part of the map output
- `elements/{tileset-name}-{element-name}.json`: per-element Tiled-format JSON map
- `cropped-elements/{timestamp}/{tileset-name}-{element-name}.png`: per-element crops (only the newest timestamp folder is kept)
- `composite.json`: all elements combined on one map (`composite-{W}x{H}.json` per tile size when the session mixes tile sizes)
- `map-generator-config.json`: Reldens map generator configuration including tile options and spots (suffixed the same way per tile size)

The annotated tileset image is optional (it is only produced when `generateAnnotatedImages` is set in the global tile options) and it is written outside the session folder, to `generate-data/generated/annotated-map-images/{tileset-name}-annotated.png`.

## Step 9 - Sessions

The **Generated Files** section below the editor lists all saved sessions, newest first. For each session:
- Click the session row to expand and see all output and input files
- **Maps Wizard**: opens the Maps Wizard for this session (shown when the session has a `map-generator-config*.json`)
- **Load**: loads the session state into the editor, replacing matching tilesets
- **Append**: loads the session tilesets on top of the current ones instead of replacing them
- **Delete** (trash icon): removes the session folder and all its files
- **Download** links: individual file downloads from output and input folders
- A **Download all as ZIP** link (in the results section shown after a generate) downloads the entire output folder as a single ZIP file
Sessions are auto-saved after upload completes. Use **Save Session** to explicitly save with a name. The **Override session** checkbox controls whether saving rewrites the existing session or creates a new one.

## Step 10 - Start New Session

Click **Start New Session** (top-right of upload section) to reload the page and return to a fresh upload form. Existing sessions remain in the sessions list.
