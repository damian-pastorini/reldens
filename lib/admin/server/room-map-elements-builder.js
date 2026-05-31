/**
 *
 * Reldens - RoomMapElementsBuilder
 *
 * Builds the {mapName}-room-map-elements.json sidecar that joins element shape and placement
 * for a generated map. Used at generation time and exposed via an endpoint as the legacy-map
 * fallback parser.
 *
 */

const { Logger, sc } = require('@reldens/utils');

class RoomMapElementsBuilder
{

    constructor()
    {
        /** @type {number} */
        this.schemaVersion = 1;
        /** @type {string} */
        this.defaultBordersLayer = 'borders';
        /** @type {string} */
        this.elementsFileSuffix = '-room-map-elements.json';
        /** @type {Array<string>} */
        this.skipLayerNames = ['ground', 'ground-variations', 'borders', 'change-points'];
        /** @type {Array<string>} */
        this.skipLayerPrefixes = ['spot-layer-'];
    }

    /**
     * @param {string} mapName
     * @returns {string}
     */
    elementsFileName(mapName)
    {
        return mapName+this.elementsFileSuffix;
    }

    /**
     * @param {Object} props
     * @param {Object} props.mapJson
     * @param {string} props.mapName
     * @param {string} [props.mapFileName]
     * @param {string} [props.tilesetSessionId]
     * @param {string} [props.compositeFile]
     * @param {string} [props.generatedBy]
     * @param {string} [props.generatedAt]
     * @returns {Object|null}
     */
    build(props)
    {
        let mapJson = sc.get(props, 'mapJson', null);
        if(!mapJson){
            Logger.error('RoomMapElementsBuilder.build called without mapJson.');
            return null;
        }
        let mapName = sc.get(props, 'mapName', '');
        let result = this.buildFromLayers(mapJson);
        result.schemaVersion = this.schemaVersion;
        result.mapName = mapName;
        result.mapFileName = sc.get(props, 'mapFileName', mapName+'.json');
        result.tilesetSessionId = sc.get(props, 'tilesetSessionId', '');
        result.compositeFile = sc.get(props, 'compositeFile', '');
        result.generatedBy = sc.get(props, 'generatedBy', '');
        result.generatedAt = sc.get(props, 'generatedAt', '');
        result.tileWidth = Number(sc.get(mapJson, 'tilewidth', 0));
        result.tileHeight = Number(sc.get(mapJson, 'tileheight', 0));
        result.mapWidth = Number(sc.get(mapJson, 'width', 0));
        result.mapHeight = Number(sc.get(mapJson, 'height', 0));
        delete result.warnings;
        return result;
    }

    /**
     * @param {Object} mapJson
     * @returns {Object}
     */
    buildFromLayers(mapJson)
    {
        let warnings = [];
        let groups = {};
        let bordersLayer = this.defaultBordersLayer;
        let layers = sc.isArray(mapJson?.layers) ? mapJson.layers : [];
        if(0 === layers.length){
            warnings.push('no-layers');
            return {elements: [], bordersLayer, warnings};
        }
        let mapWidth = Number(sc.get(mapJson, 'width', 0));
        for(let layer of layers){
            if('tilelayer' !== layer.type){
                continue;
            }
            if(this.defaultBordersLayer === layer.name){
                bordersLayer = layer.name;
            }
            if(this.shouldSkipLayer(layer.name)){
                continue;
            }
            let parsed = this.parseElementLayerName(layer.name);
            if(!parsed){
                continue;
            }
            this.appendToGroup(groups, parsed, layer, mapWidth);
        }
        let elements = [];
        for(let instanceId of Object.keys(groups)){
            let element = groups[instanceId];
            element.bounds = this.computeBounds(element.layers);
            elements.push(element);
        }
        if(0 === elements.length){
            warnings.push('no-elements-detected');
        }
        return {elements, bordersLayer, warnings};
    }

    /**
     * @param {Object} groups
     * @param {Object} parsed
     * @param {Object} layer
     * @param {number} mapWidth
     */
    appendToGroup(groups, parsed, layer, mapWidth)
    {
        let group = groups[parsed.instanceId];
        if(!group){
            group = {
                instanceId: parsed.instanceId,
                elementKey: parsed.base,
                index: parsed.index,
                layers: []
            };
            groups[parsed.instanceId] = group;
        }
        group.layers.push(this.buildElementLayer(layer, parsed.layerType, mapWidth));
    }

    /**
     * @param {string} layerName
     * @returns {boolean}
     */
    shouldSkipLayer(layerName)
    {
        if(!sc.isString(layerName)){
            return true;
        }
        if(0 === layerName.length){
            return true;
        }
        if(sc.inArray(layerName, this.skipLayerNames)){
            return true;
        }
        for(let prefix of this.skipLayerPrefixes){
            if(sc.startsWith(layerName, prefix)){
                return true;
            }
        }
        return false;
    }

    /**
     * @param {string} layerName
     * @returns {Object|null}
     */
    parseElementLayerName(layerName)
    {
        let parts = layerName.split('-');
        if(3 > parts.length){
            return null;
        }
        let indexAt = -1;
        for(let i = 0; i < parts.length; i++){
            if(/^\d+$/.test(parts[i])){
                indexAt = i;
                break;
            }
        }
        if(-1 === indexAt){
            return null;
        }
        if(parts.length - 1 === indexAt){
            return null;
        }
        return {
            instanceId: parts.slice(0, indexAt + 1).join('-'),
            base: parts.slice(0, indexAt).join('-'),
            index: Number(parts[indexAt]),
            layerType: parts.slice(indexAt + 1).join('-')
        };
    }

    /**
     * @param {Object} layer
     * @param {string} layerType
     * @param {number} mapWidth
     * @returns {Object}
     */
    buildElementLayer(layer, layerType, mapWidth)
    {
        let tiles = [];
        let data = sc.isArray(layer.data) ? layer.data : [];
        for(let i = 0; i < data.length; i++){
            let gid = Number(data[i]);
            if(0 === gid){
                continue;
            }
            tiles.push({
                col: i % mapWidth,
                row: Math.floor(i / mapWidth),
                gid
            });
        }
        return {name: layer.name, type: layerType, tiles};
    }

    /**
     * @param {Array<Object>} elementLayers
     * @returns {Object}
     */
    computeBounds(elementLayers)
    {
        let acc = {minCol: 0, minRow: 0, maxCol: 0, maxRow: 0, hasTiles: false};
        for(let layer of elementLayers){
            this.extendBoundsFromLayer(acc, layer);
        }
        if(!acc.hasTiles){
            return {col: 0, row: 0, width: 0, height: 0};
        }
        return {
            col: acc.minCol,
            row: acc.minRow,
            width: acc.maxCol - acc.minCol + 1,
            height: acc.maxRow - acc.minRow + 1
        };
    }

    /**
     * @param {Object} acc
     * @param {Object} layer
     */
    extendBoundsFromLayer(acc, layer)
    {
        for(let tile of layer.tiles){
            if(!acc.hasTiles){
                acc.minCol = tile.col;
                acc.maxCol = tile.col;
                acc.minRow = tile.row;
                acc.maxRow = tile.row;
                acc.hasTiles = true;
                continue;
            }
            if(acc.minCol > tile.col){
                acc.minCol = tile.col;
            }
            if(acc.minRow > tile.row){
                acc.minRow = tile.row;
            }
            if(acc.maxCol < tile.col){
                acc.maxCol = tile.col;
            }
            if(acc.maxRow < tile.row){
                acc.maxRow = tile.row;
            }
        }
    }
}

module.exports.RoomMapElementsBuilder = RoomMapElementsBuilder;
