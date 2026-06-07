class ElementDuplicator
{
    constructor(editor)
    {
        this.editor = editor;
        this.offsetCol = 2;
        this.offsetRow = 2;
        this.placingState = null;
    }

    isPlacing()
    {
        return null !== this.placingState;
    }

    startPlacing(instanceId)
    {
        let collected = this.collectIdsAndFindSource(instanceId);
        if(!collected.source){
            return false;
        }
        let initialCol = collected.source.bounds.col + this.offsetCol;
        let initialRow = collected.source.bounds.row + this.offsetRow;
        this.placingState = {
            source: collected.source,
            existingIds: collected.ids,
            ghostCol: initialCol,
            ghostRow: initialRow,
            outOfBounds: this.anyTileOutOfBounds(collected.source, initialCol, initialRow)
        };
        return true;
    }

    updatePlacing(col, row)
    {
        if(!this.placingState){
            return;
        }
        this.placingState.ghostCol = col;
        this.placingState.ghostRow = row;
        this.placingState.outOfBounds = this.anyTileOutOfBounds(this.placingState.source, col, row);
    }

    confirmPlacing()
    {
        if(!this.placingState || this.placingState.outOfBounds){
            return false;
        }
        let newName = ElementNameSuffix.nextFusedSuffix(
            this.placingState.existingIds,
            this.placingState.source.elementKey
        );
        let copy = this.makeCopy(
            this.placingState.source,
            newName,
            this.placingState.ghostCol,
            this.placingState.ghostRow
        );
        this.editor.mapElements.elements.push(copy);
        this.placingState = null;
        this.editor.markDirty();
        this.editor.afterMutation();
        return true;
    }

    cancelPlacing()
    {
        if(!this.placingState){
            return false;
        }
        this.placingState = null;
        this.editor.requestRender();
        return true;
    }

    collectIdsAndFindSource(instanceId)
    {
        let ids = [];
        let source = null;
        for(let element of this.editor.mapElements.elements){
            ids.push(element.instanceId);
            if(element.instanceId === instanceId){
                source = element;
            }
        }
        return {ids, source};
    }

    anyTileOutOfBounds(source, ghostCol, ghostRow)
    {
        let bounds = source.bounds;
        let mapJson = this.editor.mapJson;
        if(0 > ghostCol){
            return true;
        }
        if(0 > ghostRow){
            return true;
        }
        if(ghostCol + bounds.width > mapJson.width){
            return true;
        }
        return ghostRow + bounds.height > mapJson.height;
    }

    makeCopy(source, newName, targetCol, targetRow)
    {
        let copy = JSON.parse(JSON.stringify(source)); // HOFF
        copy.instanceId = newName;
        copy.elementKey = source.elementKey;
        let deltaCol = targetCol - source.bounds.col;
        let deltaRow = targetRow - source.bounds.row;
        let mapWidth = this.editor.mapJson.width;
        let totalCells = mapWidth * this.editor.mapJson.height;
        for(let elementLayer of copy.layers){
            elementLayer.name = newName+'-'+elementLayer.type;
            this.shiftAndStamp(elementLayer, deltaCol, deltaRow, mapWidth, totalCells);
        }
        copy.bounds.col = targetCol;
        copy.bounds.row = targetRow;
        return copy;
    }

    shiftAndStamp(elementLayer, deltaCol, deltaRow, mapWidth, totalCells)
    {
        let data = new Array(totalCells).fill(0);
        for(let tile of elementLayer.tiles){
            tile.col += deltaCol;
            tile.row += deltaRow;
            data[tile.row * mapWidth + tile.col] = tile.gid;
        }
        this.editor.mapJson.layers.push({
            name: elementLayer.name,
            type: 'tilelayer',
            width: mapWidth,
            height: totalCells / mapWidth,
            visible: true,
            opacity: 1,
            x: 0,
            y: 0,
            data
        });
    }
}
window.ElementDuplicator = ElementDuplicator;
