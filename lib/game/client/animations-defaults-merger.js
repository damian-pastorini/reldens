/**
 *
 * Reldens - AnimationsDefaultsMerger
 *
 */

const { GroupValueResolver } = require('../group-value-resolver');
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
            let groupValue = GroupValueResolver.resolve(objectData, 'asset_key');
            if('' === groupValue || !sc.hasOwn(animationsDefaults, groupValue)){
                continue;
            }
            objectsAnimationsData[key] = Object.assign({}, animationsDefaults[groupValue], objectData);
        }
        delete roomData.animationsDefaults;
        return roomData;
    }

}

module.exports.AnimationsDefaultsMerger = AnimationsDefaultsMerger;
