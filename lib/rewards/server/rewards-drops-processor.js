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
        if(targetObjectBody.isDropping){
            return false;
        }
        targetObjectBody.isDropping = true;
        let rewards = await WorldDropHandler.createRewardItemObjectsOnRoom(targetObjectBody, itemRewards, roomScene);
        if(!rewards){
            return false;
        }
        roomScene.disableAutoDispose();
        let dropsMappedData = RewardsDropsMapper.mapDropsData(rewards, roomScene);
        let eventResult = true;
        await roomScene.events.emit('reldens.afterProcessRewardsDropsBeforeBroadcast', dropsMappedData, eventResult);
        if(!eventResult){
            return false;
        }
        roomScene.broadcast('*', dropsMappedData);
        targetObjectBody.isDropping = false;
        return true;
    }

}

module.exports.RewardsDropsProcessor = RewardsDropsProcessor;
