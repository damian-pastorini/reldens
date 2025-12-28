/**
 *
 * Reldens - AnimationsDefaultsMerger
 *
 */

const { sc } = require('@reldens/utils');

class AnimationsDefaultsMerger
{

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
            objectData.key = key;
            if(!sc.hasOwn(objectData, 'asset_key')){
                continue;
            }
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
