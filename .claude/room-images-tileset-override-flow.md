# Room Images and Tileset Override System

## Overview

This document explains how the room scene images upload system works and how the `overrideSceneImagesWithMapFile` option automatically synchronizes scene images with the Tiled map file tilesets.

## Configuration

**Config Path:** `server/rooms/maps/overrideSceneImagesWithMapFile`
**Type:** Boolean
**Default:** `true`
**Location:** Database `config` table or environment variable

When enabled, the system uses the Tiled map file as the source of truth for scene images, automatically overriding the `scene_images` field with images listed in the map's tilesets.

## File Locations

### Source Code
- **Validator:** `lib/admin/server/room-map-tilesets-validator.js`
- **Subscriber:** `lib/admin/server/subscribers/rooms-entity-subscriber.js`
- **File Upload Renderer:** `lib/admin/server/rooms-file-upload-renderer.js`
- **Admin Plugin:** `lib/admin/server/plugin.js`

### Admin Interface
- **Tileset File Item Template:** `theme/admin/templates/fields/edit/tileset-file-item.html`
- **Tileset Alert Wrapper Template:** `theme/admin/templates/fields/edit/tileset-alert-wrapper.html`
- **Client JS:** `theme/admin/reldens-admin-client.js`
- **Client CSS:** `theme/admin/reldens-admin-client.css`
- **Router:** `npm-packages/reldens-cms/lib/admin-manager/router-contents.js`

## Database Schema

### Rooms Table
- `id` - Room identifier
- `map_filename` - Tiled map JSON file (e.g., `reldens-forest.json`)
- `scene_images` - Comma-separated list of tileset images (e.g., `reldens-forest.png,reldens-town.png`)

### Upload Configuration
Both fields are configured as upload fields:
- `map_filename` - Single file upload, bucket: `theme/assets/maps`
- `scene_images` - Multiple file upload, bucket: `theme/assets/images`

## System Flow

### 1. Initial Room Creation

**User Actions:**
1. Navigate to Admin → Rooms → Create New
2. Upload map JSON file to `map_filename` field
3. Upload tileset images to `scene_images` field
4. Click Save

**System Processing:**
1. **Upload Phase** - Files saved to respective buckets
2. **Validation Phase** - `validateUploadedFiles()` checks required fields
3. **Save Phase** - Entity created in database
4. **Post-Save Event** - `reldens.adminAfterEntitySave` fires
5. **Validator Execution** - `RoomMapTilesetsValidator.validate()` runs

**Validator Logic:**
```javascript
// Check if override is enabled
overrideEnabled = config.getWithoutLogs('server/rooms/maps/overrideSceneImagesWithMapFile', true)

// Read map file
mapData = readMapFile(bucket, mapFilename, roomId)

// Extract tileset images from map JSON
tilesetImages = extractTilesetImages(mapData.tilesets)
// Example: ['reldens-forest.png']

// Compare with current scene_images
if (tilesetImages !== currentSceneImages) {
    // Validate all images exist in scene_images bucket
    if (validateImagesExist(tilesetImages, sceneImagesBucket)) {
        // Override scene_images with tileset images
        roomsRepository.updateById(roomId, {scene_images: tilesetImages.join(',')})
    }
}
```

### 2. Room Editing

**User Actions:**
1. Navigate to Admin → Rooms → Edit Room
2. View existing files in both fields
3. Modify files or click Save without changes

**Edit Form Population:**

**Event:** `reldens.adminEditPropertiesPopulation`

**Flow:**
```javascript
// 1. Event emitted with room data
event = {
    driverResource,     // Entity configuration
    renderedEditProperties, // Form properties
    loadedEntity,       // Room from database
    entityId: 'rooms',
    entityData: loadedEntity
}

// 2. RoomsEntitySubscriber.populateEditFormTilesetImages() executes
if (overrideSceneImagesWithMapFile) {
    // Extract tileset images from map file
    tilesetImages = validator.extractTilesetImagesFromEntity(entityData, driverResource)

    // Inject into form properties
    renderedEditProperties.tilesetImages = tilesetImages
    renderedEditProperties.overrideSceneImagesEnabled = true
}

// 3. RoomsFileUploadRenderer processes scene_images field
// Event: reldens.adminBeforeFieldRender
if (propertyKey === 'scene_images' && tilesetImages.length > 0) {
    // Render each file with protection flag
    for each file:
        renderedFileItems.push(render tileset-file-item.html with {
            filename,
            isProtected: tilesetImages.includes(filename)
        })

    // Wrap files in alert container
    templateData.renderedFiles = render tileset-alert-wrapper.html
}

// 4. Template renders with tileset protection
{{^isProtected}}
    <button class="remove-upload-btn">X</button> -
{{/isProtected}}
{{filename}}
```

**Result:**
- Protected images (tilesets): NO remove button
- Non-protected images: Remove button shown
- Alert icon displays with info message

### 3. Saving Changes

**Scenario A: No Files Changed**
1. User clicks Save without uploading/removing files
2. Validation passes (existing files satisfy requirement)
3. Entity updated with form data
4. Post-save validator runs
5. If scene_images matches tilesets → No action
6. If mismatch → Override with tileset images

**Scenario B: Add New Image**
1. User uploads additional image to `scene_images`
2. `prepareUploadPatchData()` appends new file to existing files
3. Entity saved with: `existing_images.png,new_image.png`
4. Post-save validator runs
5. Validates tileset images exist
6. **Overrides** scene_images with ONLY tileset images (removes non-tileset images)

**Scenario C: Remove Non-Protected Image**
1. User clicks X button on non-protected image
2. Client adds filename to `removed_scene_images` hidden input
3. `prepareUploadPatchData()` filters removed files
4. Entity saved with filtered list
5. Post-save validator runs
6. Overrides with tileset images (removes non-tileset files)

**Scenario D: Attempt Remove Protected Image (Prevented)**
1. Protected image (tileset) has NO remove button
2. User cannot remove it through UI
3. Alert icon displays: "Images specified in the tileset can't be removed since the option overrideSceneImagesWithMapFile is active."

### 4. Map File Update

**User Updates Map File:**
1. User replaces `map_filename` with new Tiled map
2. New map references different tileset images
3. Entity saved
4. Post-save validator executes
5. Reads new map file tilesets
6. **Replaces** scene_images with new tileset images
7. Old images no longer referenced (user must manage cleanup)

## Technical Details

### Map File Structure

**Example: reldens-forest.json**
```json
{
    "tilesets": [
        {
            "columns": 14,
            "firstgid": 1,
            "image": "reldens-forest.png",
            "imageheight": 408,
            "imagewidth": 476,
            "name": "reldens-forest",
            "tilecount": 168
        }
    ]
}
```

**Extraction Logic:**
```javascript
extractTilesetImages(mapData) {
    let tilesets = mapData.tilesets || []
    let images = []

    for (let tileset of tilesets) {
        let tilesetImage = tileset.image  // 'reldens-forest.png' or '../images/reldens-forest.png'
        let imageFileName = tilesetImage.split('/').pop()  // Extract filename only

        if (!images.includes(imageFileName)) {
            images.push(imageFileName)
        }
    }

    return images  // ['reldens-forest.png']
}
```

### Validation Logic

**Array Comparison (validator):**
```javascript
arraysAreEqual(array1, array2) {
    if (array1.length !== array2.length) {
        return false
    }
    let sorted1 = [...array1].sort()
    let sorted2 = [...array2].sort()
    for (let i = 0; i < sorted1.length; i++) {
        if (sorted1[i] !== sorted2[i]) {
            return false
        }
    }
    return true
}
```

**Image Existence Validation (validator):**
```javascript
validateImagesExist(tilesetImages, sceneImagesBucket, roomId, mapFilename) {
    for (let imageFileName of tilesetImages) {
        let imageFilePath = FileHandler.joinPaths(sceneImagesBucket, imageFileName)

        if (!FileHandler.exists(imageFilePath)) {
            return false
        }
    }

    return true
}
```

### Client-Side Protection

**File Item Template (tileset-file-item.html):**
```html
<p class="upload-current-file" data-field="{{&fieldName}}" data-filename="{{&filename}}">
    {{^isProtected}}
        <button type="button" class="remove-upload-btn" data-field="{{&fieldName}}" data-filename="{{&filename}}" title="REMOVE">X</button> -
    {{/isProtected}}
    {{&filename}}
</p>
```

**Alert Wrapper Template (tileset-alert-wrapper.html):**
```html
<div class="tileset-alert-wrapper">
    <div class="upload-files-with-alert">
        {{{renderedFileItems}}}
    </div>
    <div class="tileset-alert-icon-container">
        <img src="/assets/admin/alert.png" class="tileset-alert-icon" alt="Info" title="Images specified in the tileset can't be removed since the option overrideSceneImagesWithMapFile is active.">
        <span class="tileset-info-message hidden">Images specified in the tileset can't be removed since the option overrideSceneImagesWithMapFile is active.</span>
    </div>
</div>
```

**JavaScript Toggle (reldens-admin-client.js):**
```javascript
document.querySelectorAll('.tileset-alert-icon').forEach(icon => {
    icon.addEventListener('click', () => {
        let message = icon.nextElementSibling
        if (message?.classList.contains('tileset-info-message')) {
            message.classList.toggle('hidden')
        }
    })
})
```

## Benefits

1. **Consistency:** Scene images always match map tilesets
2. **Automation:** No manual sync between map and images
3. **Single Source of Truth:** Tiled map file controls image references
4. **Developer Experience:** Edit maps in Tiled, changes auto-sync

## Limitations

1. **One-Way Sync:** Map → Database only (not bidirectional)
2. **Cleanup Required:** Removing tileset from map doesn't delete old image files
3. **Override Always Wins:** Manual changes to scene_images get overwritten on next save
4. **Requires Config:** Must enable `overrideSceneImagesWithMapFile` to activate

## Disabling the Feature

To disable tileset override and manage images manually:

**Option 1: Database Config**
```sql
UPDATE config
SET value = '0'
WHERE path = 'server/rooms/maps/overrideSceneImagesWithMapFile';
```

**Option 2: Environment Variable**
```bash
RELDENS_SERVER_ROOMS_MAPS_OVERRIDESCENEIMAGESWITHMAPFILE=0
```

**Result:**
- Post-save validation skipped
- All images show remove buttons
- Full manual control over scene_images field
- Map file and scene_images can diverge
