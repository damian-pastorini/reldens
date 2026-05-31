class MapsElementsElementDeleter
{
    constructor(editor)
    {
        this.editor = editor;
    }

    delete(instanceId)
    {
        let index = this.findElementIndex(instanceId);
        if(-1 === index){
            return false;
        }
        let element = this.editor.mapElements.elements[index];
        this.clearTilesFromMap(element);
        this.editor.mapElements.elements.splice(index, 1);
        this.editor.markDirty();
        this.editor.requestRender();
        return true;
    }

    findElementIndex(instanceId)
    {
        let elements = this.editor.mapElements.elements;
        for(let i = 0; i < elements.length; i++){
            if(elements[i].instanceId === instanceId){
                return i;
            }
        }
        return -1;
    }

    clearTilesFromMap(element)
    {
        for(let elementLayer of element.layers){
            this.clearLayerTiles(elementLayer);
        }
    }

    clearLayerTiles(elementLayer)
    {
        let mapLayer = this.findMapLayer(elementLayer.name);
        if(!mapLayer){
            return;
        }
        let mapWidth = this.editor.mapJson.width;
        for(let tile of elementLayer.tiles){
            mapLayer.data[tile.row * mapWidth + tile.col] = 0;
        }
    }

    findMapLayer(name)
    {
        let layers = this.editor.mapJson.layers;
        for(let i = 0; i < layers.length; i++){
            if(layers[i].name === name){
                return layers[i];
            }
        }
        return null;
    }
}
window.MapsElementsElementDeleter = MapsElementsElementDeleter;
