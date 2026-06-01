class MapsElementsElementDuplicator
{
    static OFFSET_COL = 2;
    static OFFSET_ROW = 2;

    constructor(editor)
    {
        this.editor = editor;
    }

    duplicate(instanceId)
    {
        let collected = this.collectIdsAndFindSource(instanceId);
        if(!collected.source){
            return null;
        }
        let newName = ElementNameSuffix.nextSuffix(collected.ids, collected.source.elementKey);
        let copy = this.makeCopy(collected.source, newName);
        this.editor.mapElements.elements.push(copy);
        this.editor.markDirty();
        this.editor.requestRender();
        return copy;
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

    makeCopy(source, newName)
    {
        let copy = JSON.parse(JSON.stringify(source)); // HOFF
        copy.instanceId = newName;
        copy.index = ElementNameSuffix.parseSuffix(newName);
        copy.elementKey = source.elementKey;
        let deltaCol = MapsElementsElementDuplicator.OFFSET_COL;
        let deltaRow = MapsElementsElementDuplicator.OFFSET_ROW;
        let mapWidth = this.editor.mapJson.width;
        let totalCells = mapWidth * this.editor.mapJson.height;
        for(let elementLayer of copy.layers){
            elementLayer.name = newName+'-'+elementLayer.type;
            this.shiftAndStamp(elementLayer, deltaCol, deltaRow, mapWidth, totalCells);
        }
        copy.bounds.col += deltaCol;
        copy.bounds.row += deltaRow;
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
window.MapsElementsElementDuplicator = MapsElementsElementDuplicator;
