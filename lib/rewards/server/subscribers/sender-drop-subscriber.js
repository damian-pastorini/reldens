const { RewardsConst } = require('../../constants');

class SenderDropSubscriber
{

    static sendDropsToClient(rewards, client)
    {
        let messageData = {
            [RewardsConst.REWARDS_CONST]: {}
        };
        for (let reward of rewards) {
            messageData[RewardsConst.REWARDS_CONST][reward.randomRewardId + reward.tileIndex] =
                {
                    [RewardsConst.REWARDS_TYPE]: reward.animationData.assetType,
                    [RewardsConst.REWARDS_ASSET_KEY]: reward.animationData.assetKey,
                    [RewardsConst.REWARDS_FILE]: reward.animationData.file,
                    [RewardsConst.REWARDS_PARAMS]: reward.animationData.extraParams,
                    x: reward.rewardPosition.x,
                    y: reward.rewardPosition.y
                };
        }
        // @TODO - BETA - Add new event here for the data.
        client.broadcast('*', messageData);
    }
}

module.exports.SenderDropSubscriber = SenderDropSubscriber;