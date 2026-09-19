class MapLayersNormalizer
{
    explode(mapJson, mapElements)
    {
        if(!mapJson || !mapElements || !mapElements.elements){
            return;
        }
        let mapWidth = mapJson.width;
        let totalCells = mapWidth * mapJson.height;
        for(let element of mapElements.elements){
            this.explodeOneElement(element, mapJson, mapWidth, totalCells);
        }
        this.pruneEmptyTilelayers(mapJson);
    }

    explodeOneElement(element, mapJson, mapWidth, totalCells)
    {
        for(let elementLayer of element.layers){
            this.explodeOneElementLayer(elementLayer, mapJson, mapWidth, totalCells);
        }
    }

    explodeOneElementLayer(elementLayer, mapJson, mapWidth, totalCells)
    {
        if(this.findLayerByName(mapJson.layers, elementLayer.name)){
            return;
        }
        if(0 === elementLayer.tiles.length){
            return;
        }
        let mergedLayer = this.findMergedLayerForTiles(mapJson.layers, elementLayer.tiles, mapWidth);
        if(!mergedLayer){
            return;
        }
        let dedicatedData = this.extractTilesIntoNewData(mergedLayer.data, elementLayer.tiles, mapWidth, totalCells);
        let dedicatedLayer = this.cloneAsDedicatedLayer(mergedLayer, elementLayer.name, dedicatedData);
        let insertIdx = mapJson.layers.indexOf(mergedLayer) + 1;
        mapJson.layers.splice(insertIdx, 0, dedicatedLayer);
    }

    findLayerByName(layers, name)
    {
        for(let layer of layers){
            if(layer.name === name){
                return layer;
            }
        }
        return null;
    }

    findMergedLayerForTiles(layers, tiles, mapWidth)
    {
        let firstTile = tiles[0];
        let cellIndex = firstTile.row * mapWidth + firstTile.col;
        for(let layer of layers){
            if('tilelayer' !== layer.type){
                continue;
            }
            if(layer.data[cellIndex] === firstTile.gid){
                return layer;
            }
        }
        return null;
    }

    extractTilesIntoNewData(sourceData, tiles, mapWidth, totalCells)
    {
        let dedicatedData = new Array(totalCells).fill(0);
        for(let tile of tiles){
            let cellIndex = tile.row * mapWidth + tile.col;
            dedicatedData[cellIndex] = sourceData[cellIndex];
            sourceData[cellIndex] = 0;
        }
        return dedicatedData;
    }

    cloneAsDedicatedLayer(mergedLayer, newName, dedicatedData)
    {
        return {
            name: newName,
            type: 'tilelayer',
            width: mergedLayer.width,
            height: mergedLayer.height,
            visible: true,
            opacity: 1,
            x: 0,
            y: 0,
            data: dedicatedData
        };
    }

    pruneEmptyTilelayers(mapJson)
    {
        let result = [];
        for(let layer of mapJson.layers){
            if(this.shouldKeepLayer(layer)){
                result.push(layer);
            }
        }
        mapJson.layers = result;
    }

    shouldKeepLayer(layer)
    {
        if('tilelayer' !== layer.type){
            return true;
        }
        for(let gid of layer.data){
            if(0 !== gid){
                return true;
            }
        }
        return false;
    }
}
window.MapLayersNormalizer = MapLayersNormalizer;
