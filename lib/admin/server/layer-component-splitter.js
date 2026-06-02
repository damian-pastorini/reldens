/**
 *
 * Reldens - LayerComponentSplitter
 *
 * Splits Tiled tilelayer entries into per-connected-component layers so the records emitter
 * can produce one element record per placed instance even when the generator stamped multiple
 * placements of the same element into a single shared layer (e.g., 'tree-001-base' with 5
 * placements). Element layers are grouped by source instanceId; connected components are
 * found in the UNION of all layers for that instance (so base/collisions/etc. components
 * line up spatially); each component yields one renamed layer per source layer with a
 * globally unique counter per elementKey base, so the records loader produces distinct
 * instanceIds across the whole map.
 *
 */

class LayerComponentSplitter
{

    splitMapLayers(layers, mapWidth, mapHeight)
    {
        let result = [];
        let elementGroups = {};
        this.partitionLayers(layers, result, elementGroups);
        let baseCounters = {};
        for(let groupKey of Object.keys(elementGroups)){
            this.splitGroup(result, elementGroups[groupKey], mapWidth, mapHeight, baseCounters);
        }
        return result;
    }

    partitionLayers(layers, passThroughResult, elementGroups)
    {
        for(let layer of layers){
            if('tilelayer' !== layer.type){
                passThroughResult.push(layer);
                continue;
            }
            let parsed = this.parseElementLayerName(layer.name);
            if(!parsed){
                passThroughResult.push(layer);
                continue;
            }
            this.attachLayerToGroup(elementGroups, parsed, layer);
        }
    }

    attachLayerToGroup(elementGroups, parsed, layer)
    {
        if(!elementGroups[parsed.instanceId]){
            elementGroups[parsed.instanceId] = {layers: [], parsedNames: []};
        }
        elementGroups[parsed.instanceId].layers.push(layer);
        elementGroups[parsed.instanceId].parsedNames.push(parsed);
    }

    splitGroup(result, group, mapWidth, mapHeight, baseCounters)
    {
        let totalCells = mapWidth * mapHeight;
        let unionData = this.buildUnionData(group.layers, totalCells);
        let components = this.findConnectedComponents(unionData, mapWidth, mapHeight);
        if(2 > components.length){
            this.appendAllLayers(result, group.layers);
            return;
        }
        this.appendSplitInstances(result, group, components, totalCells, baseCounters);
    }

    appendAllLayers(result, layers)
    {
        for(let layer of layers){
            result.push(layer);
        }
    }

    appendSplitInstances(result, group, components, totalCells, baseCounters)
    {
        let baseKey = group.parsedNames[0].base;
        if(!baseCounters[baseKey]){
            baseCounters[baseKey] = 1;
        }
        for(let i = 0; i < components.length; i++){
            let globalIndex = baseCounters[baseKey];
            baseCounters[baseKey]++;
            this.appendInstanceLayers(result, group, components[i], totalCells, globalIndex);
        }
    }

    appendInstanceLayers(result, group, component, totalCells, globalIndex)
    {
        let cellIndices = new Set();
        for(let cell of component){
            cellIndices.add(cell.cellIndex);
        }
        for(let li = 0; li < group.layers.length; li++){
            let layer = group.layers[li];
            let parsed = group.parsedNames[li];
            let perInstance = Object.assign({}, layer);
            perInstance.name = parsed.base+'-'+globalIndex+'-'+parsed.layerType;
            perInstance.data = this.buildLayerDataFromIndices(layer.data, cellIndices, totalCells);
            result.push(perInstance);
        }
    }

    buildUnionData(layers, totalCells)
    {
        let data = new Array(totalCells).fill(0);
        for(let layer of layers){
            this.markLayerCells(data, layer.data, totalCells);
        }
        return data;
    }

    markLayerCells(unionData, layerData, totalCells)
    {
        for(let i = 0; i < totalCells; i++){
            if(0 !== layerData[i]){
                unionData[i] = 1;
            }
        }
    }

    findConnectedComponents(data, mapWidth, mapHeight)
    {
        let visited = new Array(data.length).fill(false);
        let components = [];
        for(let i = 0; i < data.length; i++){
            if(0 === data[i]){
                continue;
            }
            if(visited[i]){
                continue;
            }
            components.push(this.floodFillComponent(data, mapWidth, mapHeight, i, visited));
        }
        return components;
    }

    floodFillComponent(data, mapWidth, mapHeight, startCellIndex, visited)
    {
        let stack = [startCellIndex];
        let component = [];
        let maxIterations = data.length * 5;
        for(let i = 0; i < maxIterations; i++){
            if(0 === stack.length){
                break;
            }
            let cellIndex = stack.pop();
            if(visited[cellIndex]){
                continue;
            }
            if(0 === data[cellIndex]){
                continue;
            }
            visited[cellIndex] = true;
            component.push({cellIndex, gid: data[cellIndex]});
            this.pushNeighbors(stack, cellIndex, mapWidth, mapHeight);
        }
        return component;
    }

    pushNeighbors(stack, cellIndex, mapWidth, mapHeight)
    {
        let col = cellIndex % mapWidth;
        let row = Math.floor(cellIndex / mapWidth);
        if(0 < col){
            stack.push(cellIndex - 1);
        }
        if(col < mapWidth - 1){
            stack.push(cellIndex + 1);
        }
        if(0 < row){
            stack.push(cellIndex - mapWidth);
        }
        if(row < mapHeight - 1){
            stack.push(cellIndex + mapWidth);
        }
    }

    buildLayerDataFromIndices(sourceData, cellIndices, totalCells)
    {
        let data = new Array(totalCells).fill(0);
        for(let cellIndex of cellIndices){
            data[cellIndex] = sourceData[cellIndex];
        }
        return data;
    }

    parseElementLayerName(layerName)
    {
        let parts = layerName.split('-');
        if(3 > parts.length){
            return null;
        }
        let numericIndex = -1;
        for(let i = 0; i < parts.length; i++){
            if(/^\d+$/.test(parts[i])){
                numericIndex = i;
                break;
            }
        }
        if(-1 === numericIndex){
            return null;
        }
        if(parts.length - 1 === numericIndex){
            return null;
        }
        return {
            instanceId: parts.slice(0, numericIndex + 1).join('-'),
            base: parts.slice(0, numericIndex).join('-'),
            index: Number(parts[numericIndex]),
            layerType: parts.slice(numericIndex + 1).join('-')
        };
    }

}

module.exports.LayerComponentSplitter = LayerComponentSplitter;
