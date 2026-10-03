class ElementMover
{
    constructor(editor)
    {
        this.editor = editor;
        this.dragState = null;
        this.tileIndex = new Map();
    }

    entries()
    {
        let entries = [];
        let mapSpots = this.editor.mapSpots;
        if(mapSpots && mapSpots.spots){
            for(let spot of mapSpots.spots){
                entries.push(spot);
            }
        }
        for(let element of this.editor.mapElements.elements){
            entries.push(element);
        }
        return entries;
    }

    isSpot(entry)
    {
        let mapSpots = this.editor.mapSpots;
        if(!mapSpots || !mapSpots.spots){
            return false;
        }
        return -1 !== mapSpots.spots.indexOf(entry);
    }

    collectMovedSpots()
    {
        let movedSpots = [];
        let mapSpots = this.editor.mapSpots;
        if(!mapSpots || !mapSpots.spots){
            return movedSpots;
        }
        for(let spot of mapSpots.spots){
            if(spot.moved){
                movedSpots.push(spot);
            }
        }
        return movedSpots;
    }

    buildTileIndex()
    {
        this.tileIndex.clear();
        for(let entry of this.entries()){
            this.indexEntryTiles(entry);
        }
    }

    indexEntryTiles(entry)
    {
        for(let layer of entry.layers){
            this.indexLayerTiles(layer.tiles, entry.instanceId);
        }
    }

    indexLayerTiles(tiles, instanceId)
    {
        for(let tile of tiles){
            this.tileIndex.set(this.tileKey(tile.col, tile.row), instanceId);
        }
    }

    tileKey(col, row)
    {
        return col+','+row;
    }

    findEntryAt(col, row)
    {
        let id = this.tileIndex.get(this.tileKey(col, row));
        if(!id){
            return null;
        }
        return this.findByInstance(id);
    }

    findByInstance(instanceId)
    {
        return this.entries().find((entry) => entry.instanceId === instanceId);
    }

    beginDrag(entry, anchorCol, anchorRow)
    {
        this.dragState = {
            instanceId: entry.instanceId,
            anchorCol,
            anchorRow,
            currentCol: anchorCol,
            currentRow: anchorRow,
            outOfBounds: false
        };
    }

    updateDrag(col, row)
    {
        if(!this.dragState){
            return;
        }
        this.dragState.currentCol = col;
        this.dragState.currentRow = row;
        this.dragState.outOfBounds = this.checkOutOfBounds();
    }

    checkOutOfBounds()
    {
        let entry = this.findByInstance(this.dragState.instanceId);
        if(!entry){
            return true;
        }
        return this.anyTileOutOfBounds(
            entry,
            this.dragState.currentCol - this.dragState.anchorCol,
            this.dragState.currentRow - this.dragState.anchorRow
        );
    }

    anyTileOutOfBounds(entry, deltaCol, deltaRow)
    {
        let bounds = entry.bounds;
        let mapJson = this.editor.mapJson;
        let newCol = bounds.col + deltaCol;
        let newRow = bounds.row + deltaRow;
        if(0 > newCol){
            return true;
        }
        if(0 > newRow){
            return true;
        }
        if(newCol + bounds.width > mapJson.width){
            return true;
        }
        return newRow + bounds.height > mapJson.height;
    }

    commitDrag()
    {
        if(!this.dragState || this.dragState.outOfBounds){
            this.dragState = null;
            return false;
        }
        let entry = this.findByInstance(this.dragState.instanceId);
        if(!entry){
            this.dragState = null;
            return false;
        }
        let deltaCol = this.dragState.currentCol - this.dragState.anchorCol;
        let deltaRow = this.dragState.currentRow - this.dragState.anchorRow;
        if(0 === deltaCol && 0 === deltaRow){
            this.dragState = null;
            return false;
        }
        this.translateEntry(entry, deltaCol, deltaRow);
        delete entry.zOrderOffset;
        if(this.isSpot(entry)){
            entry.moved = true;
        }
        this.dragState = null;
        this.editor.markDirty();
        this.editor.afterMutation();
        return true;
    }

    translateEntry(entry, deltaCol, deltaRow)
    {
        let mapWidth = this.editor.mapJson.width;
        for(let entryLayer of entry.layers){
            this.translateLayer(entryLayer, deltaCol, deltaRow, mapWidth);
        }
        entry.bounds.col += deltaCol;
        entry.bounds.row += deltaRow;
    }

    translateLayer(elementLayer, deltaCol, deltaRow, mapWidth)
    {
        let mapLayer = this.findContainingMapLayer(elementLayer, mapWidth);
        if(!mapLayer){
            return;
        }
        this.clearTilesFromMapLayer(elementLayer.tiles, mapLayer.data, mapWidth);
        this.stampTilesIntoMapLayer(elementLayer.tiles, mapLayer.data, mapWidth, deltaCol, deltaRow);
    }

    findContainingMapLayer(elementLayer, mapWidth)
    {
        let byName = this.editor.mapJson.layers.find((layer) => layer.name === elementLayer.name);
        if(byName){
            return byName;
        }
        if(0 === elementLayer.tiles.length){
            return null;
        }
        return this.findMapLayerContainingTile(elementLayer.tiles[0], mapWidth);
    }

    findMapLayerContainingTile(tile, mapWidth)
    {
        return this.editor.mapJson.layers.find(
            (layer) => 'tilelayer' === layer.type
                && layer.data[tile.row * mapWidth + tile.col] === tile.gid
        );
    }

    clearTilesFromMapLayer(tiles, layerData, mapWidth)
    {
        for(let tile of tiles){
            layerData[tile.row * mapWidth + tile.col] = 0;
        }
    }

    stampTilesIntoMapLayer(tiles, layerData, mapWidth, deltaCol, deltaRow)
    {
        for(let tile of tiles){
            tile.col += deltaCol;
            tile.row += deltaRow;
            layerData[tile.row * mapWidth + tile.col] = tile.gid;
        }
    }
}
window.ElementMover = ElementMover;
