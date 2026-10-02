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
        AnimationsDefaultsMerger.mergeGroupDefaults(roomData, 'preloadAssets', 'preloadAssetsDefaults', 'asset_type');
        AnimationsDefaultsMerger.mergeGroupDefaults(
            roomData,
            'objectsAnimationsData',
            'animationsDefaults',
            'asset_key'
        );
        return roomData;
    }

    /**
     * @param {RoomData} roomData
     * @param {string} dataKey
     * @param {string} defaultsKey
     * @param {string} groupingField
     */
    static mergeGroupDefaults(roomData, dataKey, defaultsKey, groupingField)
    {
        if(!sc.hasOwn(roomData, defaultsKey)){
            return;
        }
        if(!sc.hasOwn(roomData, dataKey)){
            return;
        }
        let groupDefaults = roomData[defaultsKey];
        let groupData = roomData[dataKey];
        let itemKeys = Object.keys(groupData);
        for(let key of itemKeys){
            let itemData = groupData[key];
            let groupValue = GroupValueResolver.resolve(itemData, groupingField);
            if('' === groupValue || !sc.hasOwn(groupDefaults, groupValue)){
                continue;
            }
            groupData[key] = Object.assign({}, groupDefaults[groupValue], itemData);
        }
        delete roomData[defaultsKey];
    }

}

module.exports.AnimationsDefaultsMerger = AnimationsDefaultsMerger;
