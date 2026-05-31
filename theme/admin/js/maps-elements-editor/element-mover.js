class MapsElementsElementMover
{
    constructor(editor)
    {
        this.editor = editor;
        this.dragState = null;
    }

    static findMatch(items, predicate)
    {
        for(let item of items){
            if(predicate(item)){
                return item;
            }
        }
        return null;
    }

    findElement(predicate)
    {
        return MapsElementsElementMover.findMatch(this.editor.mapElements.elements, predicate);
    }

    findElementAt(col, row)
    {
        return this.findElement((element) => this.elementHasTileAt(element, col, row));
    }

    findByInstance(instanceId)
    {
        return this.findElement((element) => element.instanceId === instanceId);
    }

    anyTileMatch(element, tilePredicate)
    {
        return null !== MapsElementsElementMover.findMatch(
            element.layers,
            (layer) => null !== MapsElementsElementMover.findMatch(layer.tiles, tilePredicate)
        );
    }

    elementHasTileAt(element, col, row)
    {
        return this.anyTileMatch(element, (tile) => tile.col === col && tile.row === row);
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
        return this.anyTileMatch(element, (tile) => this.outOfBoundsAt(tile.col + deltaCol, tile.row + deltaRow));
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
        return true;
    }

    cancelDrag()
    {
        this.dragState = null;
    }

    findMapLayer(name)
    {
        return MapsElementsElementMover.findMatch(this.editor.mapJson.layers, (mapLayer) => mapLayer.name === name);
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
        let mapLayer = this.findMapLayer(elementLayer.name);
        if(!mapLayer){
            return;
        }
        let newData = new Array(mapLayer.data.length).fill(0);
        for(let tile of elementLayer.tiles){
            tile.col += deltaCol;
            tile.row += deltaRow;
            newData[tile.row * mapWidth + tile.col] = tile.gid;
        }
        mapLayer.data = newData;
    }
}
window.MapsElementsElementMover = MapsElementsElementMover;
