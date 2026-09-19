/**
 *
 * Reldens - CollisionOverlapSplitter
 *
 * Post-merge transform for published room maps. Any collision-layer tile sitting on a cell that is covered by
 * an element "base" layer (a walkable surface, like a bridge deck) is moved out of the collision layer into a
 * sibling layer whose name replaces "collisions" with "overlap", inserted immediately above the original layer.
 * Runtime collision detection is a layer-name substring test on "collisions", so the moved tiles stay visible
 * but stop blocking movement, keeping the base surface walkable while the visual is preserved below the base.
 *
 */

const { sc } = require('@reldens/utils');

class CollisionOverlapSplitter
{

    /**
     * @param {Object} mapJson
     * @param {Object} mapElements
     * @returns {Object}
     */
    apply(mapJson, mapElements)
    {
        if(!mapJson || !sc.isArray(mapJson.layers)){
            return mapJson;
        }
        let baseCells = this.collectBaseCells(mapElements, mapJson.width);
        if(0 === baseCells.size){
            return mapJson;
        }
        this.splitCollisionLayers(mapJson, baseCells);
        return mapJson;
    }

    collectBaseCells(mapElements, mapWidth)
    {
        let baseCells = new Set();
        if(!mapElements || !sc.isArray(mapElements.elements)){
            return baseCells;
        }
        for(let element of mapElements.elements){
            this.collectElementBaseCells(element, mapWidth, baseCells);
        }
        return baseCells;
    }

    collectElementBaseCells(element, mapWidth, baseCells)
    {
        if(!element || !sc.isArray(element.layers)){
            return;
        }
        for(let elementLayer of element.layers){
            this.collectLayerBaseCells(elementLayer, mapWidth, baseCells);
        }
    }

    collectLayerBaseCells(elementLayer, mapWidth, baseCells)
    {
        if(!elementLayer || 'base' !== elementLayer.type || !sc.isArray(elementLayer.tiles)){
            return;
        }
        for(let tile of elementLayer.tiles){
            baseCells.add(tile.row * mapWidth + tile.col);
        }
    }

    splitCollisionLayers(mapJson, baseCells)
    {
        let result = [];
        for(let layer of mapJson.layers){
            result.push(layer);
            let overlapLayer = this.buildOverlapLayer(layer, baseCells);
            if(overlapLayer){
                result.push(overlapLayer);
            }
        }
        mapJson.layers = result;
    }

    buildOverlapLayer(layer, baseCells)
    {
        if(!this.isCollisionTileLayer(layer)){
            return false;
        }
        let overlapData = this.extractOverlapData(layer, baseCells);
        if(!overlapData){
            return false;
        }
        return {
            name: layer.name.replaceAll('collisions', 'overlap'),
            type: 'tilelayer',
            width: layer.width,
            height: layer.height,
            visible: true,
            opacity: 1,
            x: 0,
            y: 0,
            data: overlapData
        };
    }

    isCollisionTileLayer(layer)
    {
        if(!layer || 'tilelayer' !== layer.type || !layer.name || !sc.isArray(layer.data)){
            return false;
        }
        return -1 !== layer.name.indexOf('collisions');
    }

    extractOverlapData(layer, baseCells)
    {
        let overlapData = new Array(layer.data.length).fill(0);
        let moved = false;
        for(let cellIndex = 0; cellIndex < layer.data.length; cellIndex++){
            if(this.moveOverlapTile(layer, overlapData, cellIndex, baseCells)){
                moved = true;
            }
        }
        if(!moved){
            return false;
        }
        return overlapData;
    }

    moveOverlapTile(layer, overlapData, cellIndex, baseCells)
    {
        if(0 === layer.data[cellIndex] || !baseCells.has(cellIndex)){
            return false;
        }
        overlapData[cellIndex] = layer.data[cellIndex];
        layer.data[cellIndex] = 0;
        return true;
    }

}

module.exports.CollisionOverlapSplitter = CollisionOverlapSplitter;
