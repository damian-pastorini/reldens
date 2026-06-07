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
    }

    buildElementMaps()
    {
        let names = new Set();
        let layerToBottomRow = new Map();
        let layerToInstance = new Map();
        for(let element of this.editor.mapElements.elements){
            this.indexOneElementLayers(element, names, layerToBottomRow, layerToInstance);
        }
        return {names, layerToBottomRow, layerToInstance};
    }

    indexOneElementLayers(element, names, layerToBottomRow, layerToInstance)
    {
        let bottomRow = element.bounds.row + element.bounds.height;
        for(let layer of element.layers){
            names.add(layer.name);
            layerToBottomRow.set(layer.name, bottomRow);
            layerToInstance.set(layer.name, element.instanceId);
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
        let element = this.editor.mover.findByInstance(instanceId);
        if(!element){
            return false;
        }
        let blocks = this.partitionLayersByOwner();
        let myBlockIdx = this.findMyBlockIndex(blocks, instanceId);
        if(0 > myBlockIdx){
            return false;
        }
        let neighborIdx = this.findNeighborElementBlockIndex(blocks, myBlockIdx, direction);
        if(0 > neighborIdx || neighborIdx >= blocks.length){
            return false;
        }
        this.swapBlocksPosition(blocks, myBlockIdx, neighborIdx, direction);
        this.editor.mapJson.layers = this.flattenBlocks(blocks);
        return true;
    }

    findMyBlockIndex(blocks, instanceId)
    {
        for(let i = 0; i < blocks.length; i++){
            if(blocks[i].instanceId === instanceId){
                return i;
            }
        }
        return -1;
    }

    findNeighborElementBlockIndex(blocks, myBlockIdx, direction)
    {
        let step = 0 < direction ? 1 : -1;
        let probe = myBlockIdx + step;
        for(let safety = 0; safety < blocks.length; safety++){
            if(0 > probe || probe >= blocks.length){
                return -1;
            }
            if(blocks[probe].instanceId){
                return probe;
            }
            probe = probe + step;
        }
        return -1;
    }

    swapBlocksPosition(blocks, myBlockIdx, neighborIdx, direction)
    {
        let myBlock = blocks.splice(myBlockIdx, 1)[0];
        let adjustedNeighborIdx = neighborIdx > myBlockIdx ? neighborIdx - 1 : neighborIdx;
        let insertIdx = 0 < direction ? adjustedNeighborIdx + 1 : adjustedNeighborIdx;
        blocks.splice(insertIdx, 0, myBlock);
    }

    partitionLayersByOwner()
    {
        let layerToInstance = this.buildElementMaps().layerToInstance;
        let blocks = [];
        let currentBlock = null;
        for(let layer of this.editor.mapJson.layers){
            let inst = layerToInstance.get(layer.name) ?? null;
            if(!currentBlock || currentBlock.instanceId !== inst){
                currentBlock = {instanceId: inst, layers: []};
                blocks.push(currentBlock);
            }
            currentBlock.layers.push(layer);
        }
        return blocks;
    }

    flattenBlocks(blocks)
    {
        let result = [];
        for(let block of blocks){
            this.appendBlockLayers(block, result);
        }
        return result;
    }

    appendBlockLayers(block, result)
    {
        for(let layer of block.layers){
            result.push(layer);
        }
    }
}
window.ElementZOrderSorter = ElementZOrderSorter;
