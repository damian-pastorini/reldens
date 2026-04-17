# Tileset to Tiled Map - Usage Guide

The tileset-to-tilemap tool converts game tileset PNG images into Tiled-compatible JSON map files for use with the Reldens platform. Access it from the admin panel at `/tileset-to-tilemap`.

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
- **Tile option markers**: small labeled squares in the corner of tiles assigned as Ground (G), Path (P), Border (B), Random (R), Surrounding (S), Corner (C), Border Tiles (T), Border Corner (K), or Spot Tile (ST)

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
The legend lists every detected element and cluster. Controls:
- **Search box**: filters by name as you type
- **Show Elements / Show Clusters** checkboxes: toggle visibility of each group
- **Add Element**: creates a blank element you can populate by clicking tiles on canvas
- **Bulk select-all** checkbox: checks or unchecks all elements at once
- **Toggle Lock**: toggles the `approved` flag on all bulk-selected elements
- **Convert All**: converts all bulk-selected clusters to elements
- **Detect AI / Name AI** (bulk, AI-dependent): runs AI detection or naming on all bulk-selected items

Each element row shows:
- **Header (click)**: selects/deselects the element; expands the detail section; scrolls canvas to its tiles
- **Name input**: kebab-case name validated as `[a-z]+-(\d+)+`; invalid names block Generate
- **Lock button**: green closed padlock = locked (protected from bulk AI ops); open padlock = unlockable
- **Delete button**: removes the element immediately
- **Split into tiles** (clusters only): splits the cluster into individual single-tile elements
- **Convert to element** (clusters only): converts cluster to an approved element in-place
- **Detect Elements** (per cluster, AI): sends cluster tiles to AI, replaces with sub-elements
- **Detect Layers** (per element, AI): sends element tiles to AI, assigns correct layer types
- **Name** (per element, AI): sends element to AI and updates its name
- **Quantity**: how many times the element appears in the generated composite map
- **Free space around**: tile padding around the element in the generated map
- **Allow paths in free space**: whether path tiles can be placed in the element's padding
- **Layer type radios**: sets the layer type for NEW tiles added by clicking the canvas (below-player, collisions, over-player, collisions-over-player)

## Step 4 - Element Types

**Cluster** (`type: cluster`, `approved: false`): a group of tiles detected by pixel connectivity that may contain multiple objects. Shown with dashed border. Bulk AI operations (Detect All, Name All) process clusters. Use **Split**, **Convert**, or **Detect AI** to resolve clusters into clean elements.

**Element** (`type: element`, `approved: true`): a named game object with one or more layers. Locked elements are skipped by bulk AI operations.

## Step 5 - Tile Options and Spot Config

Each tileset has a **Tile Options** section (accessible from the Map Tiles tab in the legend panel) for assigning specific tiles to map-generator roles. Assigned tiles are highlighted on the canvas with a semi-transparent colored fill so you can see at a glance what is already assigned. A **Global Map Tiles** panel (shown above the tilesets when more than one tileset is loaded) applies the same options across all tilesets; those assignments are also highlighted on every canvas.
**Ground and Path group** (three separate rows):
- Row 1 - **Ground** / **Path**: the base ground tile and the walkable path tile
- Row 2 - **Border**: a single fallback tile used on the outer edge of the generated map (not directional, just a last-resort fill)
- Row 3 - **Variations**: additional ground variants placed randomly (multi-value, expands as tiles are added)
**Positional groups** (each in its own card):
- **Path Surrounding Tiles**: 3x3 directional grid placed around path elements (N/NE/E/SE/S/SW/W/NW)
- **Path Corner Tiles**: 2x2 corner transitions
- **Path Border Tiles**: 4-direction cross grid (Top/Right/Bottom/Left)
- **Path Border Corner Tiles**: 2x2 map-edge corner set
To assign a tile click the option cell then click the desired tile on the canvas. Single-value options stay in picking mode after assignment so you can immediately see the result; multi-value options add one tile per click. Click the active option cell again to deactivate, or click **Cancel** in the status bar. Only one option can be active at a time - activating a new one deactivates the previous automatically.
The canvas renders a colored marker badge (G, P, B, R, S, C, T, K) in the corner of each assigned tile alongside the highlight fill.

**Spots** are named locations on the map. Each spot has:
- **Name**: identifier for the spot
- **Is Element** checkbox: treat spot as a placed element
- **Width / Height**: dimensions in tiles (default 5x5)
- **Spot Tile**: the single tile placed at the spot center (its own row)
- **Spot Tile Variations**: random tiles placed as ground within the spot (its own row, multi-value)
- **Surrounding / Corner / Border / Border Corner tiles**: same positional sets as global options but scoped to this spot
Click a spot header to expand/collapse its detail section. When a spot is expanded its assigned tiles are highlighted on the canvas with an orange fill so you can see which tiles belong to it.

## Step 6 - Per-Tileset Generate Controls

Each tileset row has its own generate controls:
- **Remove**: removes this tileset from the session
- **Save** (per tileset): saves only this tileset's state into the session config
- **Generate** (per tileset): generates output files for all elements in this tileset
- **Generate Selected** (per tileset): generates output for only bulk-selected elements
- **Map Generator Configuration toggle**: shows/hides the Map File Name and Map Title inputs

## Step 7 - AI Controls (visible when AI is enabled)

At the top of each tileset's controls row:
- **Provider select**: chooses the AI provider (Claude, Gemini, or Ollama models)
- **Detect Elements**: runs AI sub-element detection on every unlocked cluster one by one
- **Detect Layers**: runs AI layer assignment on every unlocked non-cluster element
- **Name All**: runs AI naming on every unlocked non-cluster element in a single batch

## Step 8 - Generate Output

Click **Generate All** (or per-tileset **Generate**) to produce all output files. Files are written to `generated-tile-map-elements/output/{sessionId}/`:
- `session-editor-state.json`: full state snapshot used by the Load button
- `elements-config.json`: human-readable element configuration
- `{tileset-name}.png`: copy of the original tileset PNG
- `{tileset-name}-{element-name}.json`: per-element Tiled-format JSON map
- `{tileset-name}-annotated.png`: tileset image with colored overlays showing detected elements
- `composite.json`: all elements combined on one map
- `map-generator-config.json`: Reldens map generator configuration including tile options and spots

## Step 9 - Sessions

The **Generated Files** section below the editor lists all saved sessions, newest first. For each session:
- Click the session row to expand and see all output and input files
- **Load**: loads the session state into the editor, replacing matching tilesets
- **Delete**: removes the session folder and all its files
- **Download** links: individual file downloads from output and input folders
- **Download all as ZIP**: downloads the entire output folder as a single ZIP file
Sessions are auto-saved after upload completes. Use **Save Session** to explicitly save with a name. The **Override session** checkbox controls whether saving rewrites the existing session or creates a new one.

## Step 10 - Start New Session

Click **Start New Session** (top-right of upload section) to reload the page and return to a fresh upload form. Existing sessions remain in the sessions list.
