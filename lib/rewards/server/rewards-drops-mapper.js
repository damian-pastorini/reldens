/**
 *
 * Reldens - RewardsDropsMapper
 *
 * Maps reward objects to client-ready drop message data format for network transmission.
 *
 */

const { ObjectsConst } = require('../../objects/constants');
const { Logger } = require('@reldens/utils');

class RewardsDropsMapper
{

    /**
     * @param {Array<Object>} rewards
     * @returns {Object}
     */
    static mapDropsData(rewards)
    {
        let messageData = {
            [ObjectsConst.DROPS.KEY]: {}
        };
        for(let reward of rewards){
            if(!reward.randomObjectId){
                Logger.debug('Reward does not have an object ID.', reward);
                continue;
            }
            messageData[ObjectsConst.DROPS.KEY][reward.randomObjectId + reward.tileIndex] = {
                [ObjectsConst.DROPS.TYPE]: reward.animationData.assetType,
                [ObjectsConst.DROPS.ASSET_KEY]: reward.animationData.assetKey,
                [ObjectsConst.DROPS.FILE]: reward.animationData.file,
                [ObjectsConst.DROPS.PARAMS]: reward.animationData.extraParams,
                x: reward.objectPosition.x,
                y: reward.objectPosition.y
            };
        }
        return messageData;
    }

}

module.exports.RewardsDropsMapper = RewardsDropsMapper;
