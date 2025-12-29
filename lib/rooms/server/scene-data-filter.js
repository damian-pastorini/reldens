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
 * @typedef {Object} OptimizedAnimationsResult
 * @property {Object<string, Object>} objectsAnimationsData
 * @property {Object<string, Object>} animationsDefaults
 *
 * @typedef {Object} GroupedAnimationItem
 * @property {string} key
 * @property {AnimationData} data
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
            return this.buildCompleteData(roomData);
        }
        if(this.customProcessor && sc.isFunction(this.customProcessor.process)){
            return this.customProcessor.process({
                roomData: roomData,
                filter: this
            });
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
            filteredData.preloadAssets = this.filterPreloadAssets(roomData.preloadAssets);
        }
        if(sc.hasOwn(roomData, 'objectsAnimationsData')){
            let optimized = this.optimizeAnimationsData(roomData.objectsAnimationsData);
            filteredData.objectsAnimationsData = optimized.objectsAnimationsData;
            filteredData.animationsDefaults = optimized.animationsDefaults;
        }
        return filteredData;
    }

    /**
     * @param {Object<string, AssetData>} preloadAssets
     * @returns {Object<string, AssetData>}
     */
    filterPreloadAssets(preloadAssets)
    {
        if(!sc.isObject(preloadAssets)){
            return {};
        }
        let filtered = {};
        let assetKeys = Object.keys(preloadAssets);
        for(let key of assetKeys){
            let asset = preloadAssets[key];
            if('spritesheet' !== asset.asset_type){
                continue;
            }
            filtered[key] = {
                asset_type: asset.asset_type,
                asset_key: asset.asset_key,
                asset_file: asset.asset_file,
                extra_params: asset.extra_params
            };
        }
        return filtered;
    }

    /**
     * @param {Object<string, AnimationData>} objectsAnimationsData
     * @returns {OptimizedAnimationsResult}
     */
    optimizeAnimationsData(objectsAnimationsData)
    {
        if(!sc.isObject(objectsAnimationsData)){
            return {objectsAnimationsData: {}, animationsDefaults: {}};
        }
        let objectKeys = Object.keys(objectsAnimationsData);
        let groupedByAssetKey = {};
        for(let key of objectKeys){
            let animData = objectsAnimationsData[key];
            let assetKey = sc.get(animData, 'asset_key', '');
            if('' === assetKey){
                let keyValue = sc.get(animData, 'key', '');
                if('' === keyValue){
                    continue;
                }
                animData.asset_key = keyValue;
                assetKey = keyValue;
            }
            if(!sc.hasOwn(groupedByAssetKey, assetKey)){
                groupedByAssetKey[assetKey] = [];
            }
            groupedByAssetKey[assetKey].push({key: key, data: animData});
        }
        let defaults = {};
        let optimizedObjects = {};
        let assetKeys = Object.keys(groupedByAssetKey);
        for(let assetKey of assetKeys){
            let group = groupedByAssetKey[assetKey];
            if(0 === group.length){
                continue;
            }
            if(1 === group.length){
                optimizedObjects[group[0].key] = group[0].data;
                continue;
            }
            let identicalProps = this.detectIdenticalProperties(group);
            defaults[assetKey] = identicalProps;
            for(let item of group){
                let uniqueProps = {};
                let propKeys = Object.keys(item.data);
                for(let prop of propKeys){
                    if('asset_key' === prop){
                        uniqueProps[prop] = item.data[prop];
                        continue;
                    }
                    if(sc.hasOwn(identicalProps, prop)){
                        continue;
                    }
                    uniqueProps[prop] = item.data[prop];
                }
                optimizedObjects[item.key] = uniqueProps;
            }
        }
        return {objectsAnimationsData: optimizedObjects, animationsDefaults: defaults};
    }

    /**
     * @param {Array<GroupedAnimationItem>} group
     * @returns {Object}
     */
    detectIdenticalProperties(group)
    {
        if(0 === group.length){
            return {};
        }
        let firstItem = group[0].data;
        let identicalProps = {};
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
                identicalProps[prop] = referenceValue;
            }
        }
        return identicalProps;
    }

    /**
     * @param {string|number|boolean|Object} value1
     * @param {string|number|boolean|Object} value2
     * @returns {boolean}
     */
    valuesAreDifferent(value1, value2)
    {
        if(sc.isObject(value1) && sc.isObject(value2)){
            return JSON.stringify(value1) !== JSON.stringify(value2);
        }
        return value1 !== value2;
    }

}

module.exports.SceneDataFilter = SceneDataFilter;
