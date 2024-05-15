/**
 *
 * Reldens - RewardsMapper
 *
 */

const { ObjectsConst } = require('../../objects/constants');

class RewardsDropsMapper
{

    static mapDropsData(rewards)
    {
        let messageData = {
            [ObjectsConst.DROPS.KEY]: {}
        };
        for(let reward of rewards){
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
