class ElementDeleter
{
    constructor(editor)
    {
        this.editor = editor;
    }

    delete(instanceId)
    {
        let elements = this.editor.mapElements.elements;
        let index = elements.findIndex((element) => element.instanceId === instanceId);
        if(-1 === index){
            return false;
        }
        this.clearTilesFromMap(elements[index]);
        elements.splice(index, 1);
        this.editor.markDirty();
        this.editor.afterMutation();
        return true;
    }

    clearTilesFromMap(element)
    {
        for(let elementLayer of element.layers){
            this.clearLayerTilesAndPruneIfEmpty(elementLayer);
        }
    }

    clearLayerTilesAndPruneIfEmpty(elementLayer)
    {
        let mapWidth = this.editor.mapJson.width;
        let layerIndex = this.findContainingMapLayerIndex(elementLayer, mapWidth);
        if(-1 === layerIndex){
            return;
        }
        let layers = this.editor.mapJson.layers;
        for(let tile of elementLayer.tiles){
            layers[layerIndex].data[tile.row * mapWidth + tile.col] = 0;
        }
        if(layers[layerIndex].data.some((value) => 0 !== value)){
            return;
        }
        layers.splice(layerIndex, 1);
    }

    findContainingMapLayerIndex(elementLayer, mapWidth)
    {
        let layers = this.editor.mapJson.layers;
        let byName = layers.findIndex((layer) => layer.name === elementLayer.name);
        if(-1 !== byName){
            return byName;
        }
        if(0 === elementLayer.tiles.length){
            return -1;
        }
        return this.findMapLayerIndexContainingTile(elementLayer.tiles[0], mapWidth);
    }

    findMapLayerIndexContainingTile(tile, mapWidth)
    {
        return this.editor.mapJson.layers.findIndex(
            (layer) => 'tilelayer' === layer.type
                && layer.data[tile.row * mapWidth + tile.col] === tile.gid
        );
    }
}
window.ElementDeleter = ElementDeleter;
