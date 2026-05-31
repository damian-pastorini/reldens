class MapsElementsMapResizer
{
    static ANCHOR_KEYS = [
        'top-left', 'top-center', 'top-right',
        'left', 'center', 'right',
        'bottom-left', 'bottom-center', 'bottom-right'
    ];

    constructor(editor)
    {
        this.editor = editor;
        this.anchor = '';
        this.removeHorizontal = 0;
        this.removeVertical = 0;
    }

    setInput(anchor, removeHorizontal, removeVertical)
    {
        this.anchor = anchor;
        this.removeHorizontal = Math.max(0, Number(removeHorizontal) || 0);
        this.removeVertical = Math.max(0, Number(removeVertical) || 0);
    }

    computeRemovals()
    {
        return {
            left: MapsElementsMapResizer.leftRemoved(this.anchor, this.removeHorizontal),
            top: MapsElementsMapResizer.topRemoved(this.anchor, this.removeVertical)
        };
    }

    static leftRemoved(anchor, total)
    {
        if(-1 !== anchor.indexOf('right')){
            return total;
        }
        if('center' === anchor || -1 !== anchor.indexOf('top-center') || -1 !== anchor.indexOf('bottom-center')){
            return Math.floor(total / 2);
        }
        return 0;
    }

    static topRemoved(anchor, total)
    {
        if(-1 !== anchor.indexOf('bottom')){
            return total;
        }
        if('center' === anchor || -1 !== anchor.indexOf('left') || -1 !== anchor.indexOf('right')){
            return Math.floor(total / 2);
        }
        return 0;
    }

    findOutOfBoundsElements()
    {
        let removals = this.computeRemovals();
        let newWidth = this.editor.mapJson.width - this.removeHorizontal;
        let newHeight = this.editor.mapJson.height - this.removeVertical;
        let offending = [];
        for(let element of this.editor.mapElements.elements){
            if(this.elementWouldEscape(element, removals, newWidth, newHeight)){
                offending.push(element.instanceId);
            }
        }
        return offending;
    }

    elementWouldEscape(element, removals, newWidth, newHeight)
    {
        return null !== MapsElementsElementMover.findMatch(
            element.layers,
            (layer) => MapsElementsMapResizer.layerWouldEscape(layer.tiles, removals, newWidth, newHeight)
        );
    }

    static layerWouldEscape(tiles, removals, newWidth, newHeight)
    {
        return null !== MapsElementsElementMover.findMatch(
            tiles,
            (tile) => MapsElementsMapResizer.tileEscapes(tile, removals, newWidth, newHeight)
        );
    }

    static tileEscapes(tile, removals, newWidth, newHeight)
    {
        let newCol = tile.col - removals.left;
        if(0 > newCol || newCol >= newWidth){
            return true;
        }
        return 0 > tile.row - removals.top || tile.row - removals.top >= newHeight;
    }

    apply()
    {
        let offending = this.findOutOfBoundsElements();
        if(0 < offending.length){
            return {success: false, offending};
        }
        let removals = this.computeRemovals();
        let newWidth = this.editor.mapJson.width - this.removeHorizontal;
        let newHeight = this.editor.mapJson.height - this.removeVertical;
        this.translateAllElements(removals);
        this.rebuildLayerData(newWidth, newHeight, removals);
        this.editor.mapJson.width = newWidth;
        this.editor.mapJson.height = newHeight;
        MapsElementsMapResizerBorders.restamp(this.editor, newWidth, newHeight);
        this.editor.markDirty();
        this.editor.requestRender();
        return {success: true};
    }

    translateAllElements(removals)
    {
        for(let element of this.editor.mapElements.elements){
            this.translateElementTiles(element, removals);
            element.bounds.col -= removals.left;
            element.bounds.row -= removals.top;
        }
    }

    translateElementTiles(element, removals)
    {
        for(let elementLayer of element.layers){
            MapsElementsMapResizer.shiftTiles(elementLayer.tiles, removals);
        }
    }

    static shiftTiles(tiles, removals)
    {
        for(let tile of tiles){
            tile.col -= removals.left;
            tile.row -= removals.top;
        }
    }

    rebuildLayerData(newWidth, newHeight, removals)
    {
        let oldWidth = this.editor.mapJson.width;
        let oldHeight = this.editor.mapJson.height;
        for(let mapLayer of this.editor.mapJson.layers){
            if('tilelayer' !== mapLayer.type){
                continue;
            }
            mapLayer.data = MapsElementsMapResizer.cropLayerData(mapLayer.data, oldWidth, oldHeight, newWidth, newHeight, removals);
            mapLayer.width = newWidth;
            mapLayer.height = newHeight;
        }
    }

    static cropLayerData(oldData, oldWidth, oldHeight, newWidth, newHeight, removals)
    {
        let newData = new Array(newWidth * newHeight).fill(0);
        for(let row = 0; row < newHeight; row++){
            MapsElementsMapResizer.copyRow(oldData, newData, row, oldWidth, newWidth, removals);
        }
        return newData;
    }

    static copyRow(oldData, newData, row, oldWidth, newWidth, removals)
    {
        let oldRow = row + removals.top;
        for(let col = 0; col < newWidth; col++){
            newData[row * newWidth + col] = oldData[oldRow * oldWidth + (col + removals.left)] || 0;
        }
    }
}
window.MapsElementsMapResizer = MapsElementsMapResizer;
