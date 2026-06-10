class MapResizerCrop
{
    static tileEscapes(tile, removals, newWidth, newHeight)
    {
        let newCol = tile.col - removals.left;
        if(0 > newCol || newCol >= newWidth){
            return true;
        }
        return 0 > tile.row - removals.top || tile.row - removals.top >= newHeight;
    }

    static cropRecord(editor, removals, newWidth, newHeight)
    {
        let keptElements = [];
        let removedLayerNames = [];
        for(let element of editor.mapElements.elements){
            let keptLayers = MapResizerCrop.cropElementLayers(
                element,
                removals,
                newWidth,
                newHeight,
                removedLayerNames
            );
            if(0 === keptLayers.length){
                continue;
            }
            element.layers = keptLayers;
            MapResizerCrop.recomputeElementBounds(element);
            keptElements.push(element);
        }
        editor.mapElements.elements = keptElements;
        return removedLayerNames;
    }

    static cropElementLayers(element, removals, newWidth, newHeight, removedLayerNames)
    {
        let keptLayers = [];
        for(let elementLayer of element.layers){
            let keptTiles = MapResizerCrop.cropLayerTiles(elementLayer.tiles, removals, newWidth, newHeight);
            if(0 === keptTiles.length){
                removedLayerNames.push(elementLayer.name);
                continue;
            }
            elementLayer.tiles = keptTiles;
            keptLayers.push(elementLayer);
        }
        return keptLayers;
    }

    static cropLayerTiles(tiles, removals, newWidth, newHeight)
    {
        let keptTiles = [];
        for(let tile of tiles){
            if(MapResizerCrop.tileEscapes(tile, removals, newWidth, newHeight)){
                continue;
            }
            tile.col -= removals.left;
            tile.row -= removals.top;
            keptTiles.push(tile);
        }
        return keptTiles;
    }

    static recomputeElementBounds(element)
    {
        let limits = {minCol: null, maxCol: null, minRow: null, maxRow: null};
        for(let elementLayer of element.layers){
            MapResizerCrop.expandLimitsForTiles(limits, elementLayer.tiles);
        }
        element.bounds.col = limits.minCol;
        element.bounds.row = limits.minRow;
        element.bounds.width = limits.maxCol - limits.minCol + 1;
        element.bounds.height = limits.maxRow - limits.minRow + 1;
    }

    static expandLimitsForTiles(limits, tiles)
    {
        for(let tile of tiles){
            limits.minCol = null === limits.minCol || tile.col < limits.minCol ? tile.col : limits.minCol;
            limits.maxCol = null === limits.maxCol || tile.col > limits.maxCol ? tile.col : limits.maxCol;
            limits.minRow = null === limits.minRow || tile.row < limits.minRow ? tile.row : limits.minRow;
            limits.maxRow = null === limits.maxRow || tile.row > limits.maxRow ? tile.row : limits.maxRow;
        }
    }

    static pruneRemovedElementLayers(editor, removedLayerNames)
    {
        if(0 === removedLayerNames.length){
            return;
        }
        let keptMapLayers = [];
        for(let mapLayer of editor.mapJson.layers){
            if(-1 !== removedLayerNames.indexOf(mapLayer.name)){
                continue;
            }
            keptMapLayers.push(mapLayer);
        }
        editor.mapJson.layers = keptMapLayers;
    }
}
window.MapResizerCrop = MapResizerCrop;
