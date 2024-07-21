/**
 *
 * Reldens - RewardsDropsProcessor
 *
 */

const { WorldDropHandler } = require('./world-drop-handler');
const { RewardsDropsMapper } = require('./rewards-drops-mapper');
const { RewardDropValidator } = require('./validator/reward-drop-validator');

class RewardsDropsProcessor
{

    static async processRewardsDrops(roomScene, rewardEventData)
    {
        let params = RewardDropValidator.fetchValidParams({roomScene, rewardEventData});
        if(!params){
            return false;
        }
        let { targetObjectBody, itemRewards } = params;
        let rewards = await WorldDropHandler.createRewardItemObjectsOnRoom(targetObjectBody, itemRewards, roomScene);
        if(!rewards){
            return;
        }
        roomScene.disableAutoDispose();
        let dropsMappedData = RewardsDropsMapper.mapDropsData(rewards, roomScene);
        let eventResult = true;
        await roomScene.events.emit('reldens.afterProcessRewardsDropsBeforeBroadcast', dropsMappedData, eventResult);
        if(!eventResult){
            return;
        }
        roomScene.broadcast('*', dropsMappedData);
    }

}

module.exports.RewardsDropsProcessor = RewardsDropsProcessor;
