class ElementZOrderSorter
{
    constructor(editor)
    {
        this.editor = editor;
    }

    sort()
    {
        if(!this.editor.mapJson || !this.editor.mapElements){
            return;
        }
        let maps = this.buildElementMaps();
        if(0 === maps.names.size){
            return;
        }
        let elementLayersSorted = this.collectAndSortElementLayers(maps.names, maps.layerToBottomRow);
        this.applyOrder(maps.names, elementLayersSorted);
        this.editor.mapElements.elements.sort((a, b) => this.elementSortKey(a) - this.elementSortKey(b));
    }

    elementBottomRow(element)
    {
        return element.bounds.row + element.bounds.height;
    }

    elementSortKey(element)
    {
        if(!element.zOrderOffset){
            return this.elementBottomRow(element);
        }
        return this.elementBottomRow(element) + element.zOrderOffset;
    }

    buildElementMaps()
    {
        let names = new Set();
        let layerToBottomRow = new Map();
        for(let element of this.editor.mapElements.elements){
            this.indexOneElementLayers(element, names, layerToBottomRow);
        }
        return {names, layerToBottomRow};
    }

    indexOneElementLayers(element, names, layerToBottomRow)
    {
        let sortKey = this.elementSortKey(element);
        for(let layer of element.layers){
            names.add(layer.name);
            layerToBottomRow.set(layer.name, sortKey);
        }
    }

    collectAndSortElementLayers(elementLayerNames, layerToBottomRow)
    {
        let result = [];
        for(let layer of this.editor.mapJson.layers){
            if(!elementLayerNames.has(layer.name)){
                continue;
            }
            result.push({layer, bottomRow: layerToBottomRow.get(layer.name) ?? 0});
        }
        result.sort((a, b) => a.bottomRow - b.bottomRow);
        return result;
    }

    applyOrder(elementLayerNames, elementLayersSorted)
    {
        let layers = this.editor.mapJson.layers;
        let elementIndex = 0;
        for(let i = 0; i < layers.length; i++){
            if(!elementLayerNames.has(layers[i].name)){
                continue;
            }
            layers[i] = elementLayersSorted[elementIndex].layer;
            elementIndex++;
        }
    }

    moveElement(instanceId, direction)
    {
        let elements = this.editor.mapElements.elements;
        let element = this.editor.mover.findByInstance(instanceId);
        let myIndex = element ? elements.indexOf(element) : -1;
        if(0 > myIndex){
            return false;
        }
        let neighborIndex = myIndex + (0 < direction ? 1 : -1);
        if(0 > neighborIndex || neighborIndex >= elements.length){
            return false;
        }
        this.swapSortKeys(element, elements[neighborIndex]);
        elements.splice(neighborIndex, 0, elements.splice(myIndex, 1)[0]);
        this.sort();
        return true;
    }

    swapSortKeys(elementA, elementB)
    {
        let keyA = this.elementSortKey(elementA);
        let keyB = this.elementSortKey(elementB);
        elementA.zOrderOffset = keyB - this.elementBottomRow(elementA);
        elementB.zOrderOffset = keyA - this.elementBottomRow(elementB);
    }
}
window.ElementZOrderSorter = ElementZOrderSorter;
