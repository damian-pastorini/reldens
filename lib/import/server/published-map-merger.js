/**
 *
 * Reldens - PublishedMapMerger
 *
 * Merges a map's per-instance element layers into shared layers right before the map is published to
 * the runtime game folders (assets/maps and dist/maps). Driven by the server/rooms/maps/autoMergeLayersByKeys
 * config: when no keys are configured the merge is skipped and the already-copied map stays as-is. The
 * source map under generate-data/generated is never modified; the merge runs on a clone of the map.
 *
 */

const { ElementsToLayersBuilder } = require('@reldens/tile-map-generator');
const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

/**
 * @typedef {import('../../config/client/config-manager').ConfigManager} ConfigManager
 */
class PublishedMapMerger
{

    /**
     * @param {ConfigManager} config
     */
    constructor(config)
    {
        /** @type {ConfigManager} */
        this.config = config;
        /** @type {Array<string>} */
        this.defaultMergeLayerKeys = [
            'collisions-over-player',
            'collisions',
            'over-player',
            'below-player',
            'path',
            'base',
            'spot'
        ];
    }

    /**
     * @returns {Array<string>}
     */
    mergeKeys()
    {
        let configKeys = this.config.getWithoutLogs('server/rooms/maps/autoMergeLayersByKeys', this.defaultMergeLayerKeys);
        if(sc.isArray(configKeys)){
            return configKeys.map(key => key.trim()).filter(key => '' !== key);
        }
        if(!sc.isString(configKeys)){
            return [];
        }
        return configKeys.split(',').map(key => key.trim()).filter(key => '' !== key);
    }

    /**
     * @param {Object} mapJson
     * @param {Object} mapElements
     * @param {string} assetsPath
     * @param {string} distPath
     * @returns {boolean}
     */
    mergeAndPublish(mapJson, mapElements, assetsPath, distPath)
    {
        let keys = this.mergeKeys();
        if(0 === keys.length){
            return true;
        }
        if(!mapJson){
            return true;
        }
        if(!mapElements || !sc.isArray(mapElements.elements)){
            return true;
        }
        let content = sc.toJsonString(
            new ElementsToLayersBuilder({autoMergeLayersByKeys: keys}).apply(sc.deepJsonClone(mapJson), mapElements)
        );
        if(!FileHandler.writeFile(assetsPath, content)){
            return false;
        }
        return FileHandler.writeFile(distPath, content);
    }

}

module.exports.PublishedMapMerger = PublishedMapMerger;
