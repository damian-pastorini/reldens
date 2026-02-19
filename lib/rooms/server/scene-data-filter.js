/**
 *
 * Reldens - SceneDataFilter
 *
 */

const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../config/server/manager').ConfigManager} ConfigManager
 *
 * @typedef {Object} SceneDataFilterProps
 * @property {ConfigManager} config
 *
 * @typedef {Object} AssetData
 * @property {string} asset_type
 * @property {string} asset_key
 * @property {string} asset_file
 * @property {Object} extra_params
 *
 * @typedef {Object} AnimationData
 * @property {string} key
 * @property {string} asset_key
 * @property {number} [start]
 * @property {number} [end]
 * @property {number} [frameRate]
 * @property {number} [repeat]
 * @property {boolean} [yoyo]
 *
 * @typedef {Object} OptimizedResult
 * @property {Object<string, Object>} data
 * @property {Object<string, Object>} defaults
 *
 * @typedef {Object} GroupedItem
 * @property {string} key
 * @property {Object} data
 */
class SceneDataFilter
{

    /**
     * @param {SceneDataFilterProps} props
     */
    constructor(props)
    {
        /** @type {ConfigManager|false} */
        this.config = false;
        /** @type {boolean} */
        this.sendAll = false;
        /** @type {Object|false} */
        this.customProcessor = false;
        this.initialize(props);
    }

    /**
     * @param {SceneDataFilterProps} props
     * @returns {boolean|void}
     */
    initialize(props)
    {
        if(!sc.isObject(props)){
            Logger.error('Props undefined in SceneDataFilter.');
            return false;
        }
        this.config = sc.get(props, 'config', false);
        if(!this.config){
            Logger.error('Config undefined in SceneDataFilter.');
            return false;
        }
        this.sendAll = this.config.getWithoutLogs('server/rooms/data/sendAll', false);
        this.customProcessor = this.config.getWithoutLogs('server/customClasses/sceneDataProcessor', false);
    }

    /**
     * @param {Object} roomData
     * @returns {Object}
     */
    filterRoomData(roomData)
    {
        if(!sc.isObject(roomData)){
            return {};
        }
        if(this.sendAll){
            return Object.assign({}, roomData);
        }
        if(this.customProcessor && sc.isFunction(this.customProcessor.process)){
            return this.customProcessor.process({roomData: roomData, filter: this});
        }
        return this.buildFilteredData(roomData);
    }

    /**
     * @param {Object} roomData
     * @returns {Object}
     */
    buildCompleteData(roomData)
    {
        return Object.assign({}, roomData);
    }

    /**
     * @param {Object} roomData
     * @returns {Object}
     */
    buildFilteredData(roomData)
    {
        let filteredData = Object.assign({}, roomData);
        if(sc.hasOwn(roomData, 'preloadAssets')){
            let optimized = this.optimizeData(roomData.preloadAssets, 'asset_type', 'spritesheet');
            filteredData.preloadAssets = optimized.data;
            filteredData.preloadAssetsDefaults = optimized.defaults;
        }
        if(sc.hasOwn(roomData, 'objectsAnimationsData')){
            let optimized = this.optimizeData(roomData.objectsAnimationsData, 'asset_key', false);
            filteredData.objectsAnimationsData = optimized.data;
            filteredData.animationsDefaults = optimized.defaults;
        }
        return filteredData;
    }

    /**
     * @param {Object<string, Object>} dataCollection
     * @param {string} groupingField
     * @param {string|boolean} filterValue
     * @returns {OptimizedResult}
     */
    optimizeData(dataCollection, groupingField, filterValue)
    {
        if(!sc.isObject(dataCollection)){
            return {data: {}, defaults: {}};
        }
        let grouped = {};
        let dataKeys = Object.keys(dataCollection);
        for(let key of dataKeys){
            let item = dataCollection[key];
            if(false !== filterValue){
                if(filterValue !== sc.get(item, groupingField, '')){
                    continue;
                }
            }
            let groupValue = sc.get(item, groupingField, '');
            if('' === groupValue){
                groupValue = sc.get(item, 'key', '');
            }
            if('' === groupValue){
                continue;
            }
            if(!sc.hasOwn(grouped, groupValue)){
                grouped[groupValue] = [];
            }
            grouped[groupValue].push({key: key, data: item});
        }
        let defaults = {};
        let optimizedData = {};
        let groupKeys = Object.keys(grouped);
        for(let groupKey of groupKeys){
            let group = grouped[groupKey];
            if(0 === group.length){
                continue;
            }
            if(1 === group.length){
                optimizedData[group[0].key] = group[0].data;
                continue;
            }
            let identical = this.detectIdenticalProperties(group);
            if(sc.hasOwn(identical, groupingField)){
                delete identical[groupingField];
            }
            if(sc.hasOwn(identical, 'key')){
                delete identical['key'];
            }
            if(0 < Object.keys(identical).length){
                defaults[groupKey] = identical;
            }
            for(let item of group){
                let unique = {};
                let propKeys = Object.keys(item.data);
                for(let prop of propKeys){
                    if(sc.hasOwn(identical, prop)){
                        continue;
                    }
                    unique[prop] = item.data[prop];
                }
                optimizedData[item.key] = unique;
            }
        }
        return {data: optimizedData, defaults: defaults};
    }

    /**
     * @param {Array<GroupedItem>} group
     * @returns {Object}
     */
    detectIdenticalProperties(group)
    {
        if(0 === group.length){
            return {};
        }
        let firstItem = group[0].data;
        let identical = {};
        let propKeys = Object.keys(firstItem);
        for(let prop of propKeys){
            let isIdentical = true;
            let referenceValue = firstItem[prop];
            for(let item of group){
                if(!sc.hasOwn(item.data, prop)){
                    isIdentical = false;
                    break;
                }
                if(this.valuesAreDifferent(referenceValue, item.data[prop])){
                    isIdentical = false;
                    break;
                }
            }
            if(isIdentical){
                identical[prop] = referenceValue;
            }
        }
        return identical;
    }

    /**
     * @param {string|number|boolean|Object} value1
     * @param {string|number|boolean|Object} value2
     * @returns {boolean}
     */
    valuesAreDifferent(value1, value2)
    {
        if(sc.isObject(value1) && sc.isObject(value2)){
            return sc.toJsonString(value1) !== sc.toJsonString(value2);
        }
        return value1 !== value2;
    }

}

module.exports.SceneDataFilter = SceneDataFilter;
