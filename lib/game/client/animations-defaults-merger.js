/**
 *
 * Reldens - AnimationsDefaultsMerger
 *
 */

const { sc } = require('@reldens/utils');

/**
 * @typedef {Object} RoomData
 * @property {Object.<string, Object>} objectsAnimationsData
 * @property {Object.<string, Object>} [animationsDefaults]
 * @property {Object.<string, Object>} [preloadAssets]
 * @property {Object.<string, Object>} [preloadAssetsDefaults]
 */
class AnimationsDefaultsMerger
{

    /**
     * @param {RoomData} roomData
     * @returns {RoomData}
     */
    static mergeDefaults(roomData)
    {
        if(!sc.hasOwn(roomData, 'animationsDefaults')){
            return roomData;
        }
        if(!sc.hasOwn(roomData, 'objectsAnimationsData')){
            return roomData;
        }
        let animationsDefaults = roomData.animationsDefaults;
        let objectsAnimationsData = roomData.objectsAnimationsData;
        let objectKeys = Object.keys(objectsAnimationsData);
        for(let key of objectKeys){
            let objectData = objectsAnimationsData[key];
            if(!sc.hasOwn(objectData, 'asset_key')){
                continue;
            }
            objectData.key = key;
            let assetKey = objectData.asset_key;
            if(!sc.hasOwn(animationsDefaults, assetKey)){
                continue;
            }
            let defaults = animationsDefaults[assetKey];
            objectsAnimationsData[key] = Object.assign({}, defaults, objectData);
        }
        delete roomData.animationsDefaults;
        return roomData;
    }

}

module.exports.AnimationsDefaultsMerger = AnimationsDefaultsMerger;
