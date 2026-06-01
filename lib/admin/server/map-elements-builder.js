/**
 *
 * Reldens - MapElementsBuilder
 *
 * Thin wrapper around the tile-map-generator's ElementsFromLayersLoader.
 * Adds Reldens-side metadata (schemaVersion, mapName, mapFileName, tilesetSessionId,
 * compositeFile, generatedBy, generatedAt, tile dims, map dims) and owns the persistence
 * filename convention used by the maps element editor.
 *
 */

const { ElementsFromLayersLoader } = require('@reldens/tile-map-generator');
const { Logger, sc } = require('@reldens/utils');

class MapElementsBuilder
{

    constructor()
    {
        /** @type {number} */
        this.schemaVersion = 1;
        /** @type {string} */
        this.elementsFileSuffix = '-room-map-elements.json';
        /** @type {ElementsFromLayersLoader} */
        this.layersLoader = new ElementsFromLayersLoader();
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
            Logger.error('MapElementsBuilder.build called without mapJson.');
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
        return this.layersLoader.load(mapJson);
    }

    /**
     * @param {string} mapName
     * @returns {string}
     */
    elementsFileName(mapName)
    {
        return mapName+this.elementsFileSuffix;
    }
}

module.exports.MapElementsBuilder = MapElementsBuilder;
