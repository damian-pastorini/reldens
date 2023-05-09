/**
 *
 * Reldens - RewardsMapper
 *
 */

const { RewardsConst } = require('../constants');

class RewardsDropsMapper
{

    static mapDropsData(rewards)
    {
        let messageData = {
            [RewardsConst.REWARDS]: {}
        };
        // @TODO - BETA - If possible move into a map method inside the reward model.
        for(let reward of rewards){
            messageData[RewardsConst.REWARDS][reward.randomRewardId + reward.tileIndex] = {
                [RewardsConst.REWARDS_TYPE]: reward.animationData.assetType,
                [RewardsConst.REWARDS_ASSET_KEY]: reward.animationData.assetKey,
                [RewardsConst.REWARDS_FILE]: reward.animationData.file,
                [RewardsConst.REWARDS_PARAMS]: reward.animationData.extraParams,
                x: reward.rewardPosition.x,
                y: reward.rewardPosition.y
            };
        }
        return messageData;
    }

}

module.exports.RewardsDropsMapper = RewardsDropsMapper;
