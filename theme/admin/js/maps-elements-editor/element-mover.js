class ElementMover
{
    constructor(editor)
    {
        this.editor = editor;
        this.dragState = null;
        this.tileIndex = new Map();
    }

    buildTileIndex()
    {
        this.tileIndex.clear();
        for(let element of this.editor.mapElements.elements){
            this.indexElementTiles(element);
        }
    }

    indexElementTiles(element)
    {
        for(let layer of element.layers){
            this.indexLayerTiles(layer.tiles, element.instanceId);
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

    findElementAt(col, row)
    {
        let id = this.tileIndex.get(this.tileKey(col, row));
        if(!id){
            return null;
        }
        return this.findByInstance(id);
    }

    findByInstance(instanceId)
    {
        return this.editor.mapElements.elements.find((element) => element.instanceId === instanceId);
    }

    beginDrag(element, anchorCol, anchorRow)
    {
        this.dragState = {
            instanceId: element.instanceId,
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
        let element = this.findByInstance(this.dragState.instanceId);
        if(!element){
            return true;
        }
        return this.anyTileOutOfBounds(
            element,
            this.dragState.currentCol - this.dragState.anchorCol,
            this.dragState.currentRow - this.dragState.anchorRow
        );
    }

    anyTileOutOfBounds(element, deltaCol, deltaRow)
    {
        let bounds = element.bounds;
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

    outOfBoundsAt(newCol, newRow)
    {
        return 0 > newCol
            || 0 > newRow
            || newCol >= this.editor.mapJson.width
            || newRow >= this.editor.mapJson.height;
    }

    commitDrag()
    {
        if(!this.dragState || this.dragState.outOfBounds){
            this.dragState = null;
            return false;
        }
        let element = this.findByInstance(this.dragState.instanceId);
        if(!element){
            this.dragState = null;
            return false;
        }
        let deltaCol = this.dragState.currentCol - this.dragState.anchorCol;
        let deltaRow = this.dragState.currentRow - this.dragState.anchorRow;
        if(0 === deltaCol && 0 === deltaRow){
            this.dragState = null;
            return false;
        }
        this.translateElement(element, deltaCol, deltaRow);
        this.dragState = null;
        this.editor.markDirty();
        this.editor.afterMutation();
        return true;
    }

    translateElement(element, deltaCol, deltaRow)
    {
        let mapWidth = this.editor.mapJson.width;
        for(let elementLayer of element.layers){
            this.translateLayer(elementLayer, deltaCol, deltaRow, mapWidth);
        }
        element.bounds.col += deltaCol;
        element.bounds.row += deltaRow;
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
