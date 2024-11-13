/**
 *
 * Reldens - RewardsDropsProcessor
 *
 */

const { WorldDropHandler } = require('./world-drop-handler');
const { RewardsDropsMapper } = require('./rewards-drops-mapper');
const { RewardDropValidator } = require('./validator/reward-drop-validator');
const { Logger } = require('@reldens/utils');

class RewardsDropsProcessor
{

    static async processRewardsDrops(roomScene, rewardEventData)
    {
        let params = RewardDropValidator.fetchValidParams({roomScene, rewardEventData});
        if(!params){
            return false;
        }
        let { targetObjectBody, itemRewards } = params;
        let targetObjectString = 'TargetObject (ID: '+targetObjectBody.id+')';
        if(targetObjectBody.isDropping){
            Logger.debug(targetObjectString+' is already dropping items.');
            return false;
        }
        Logger.debug(targetObjectString+' is dropping: '+itemRewards.length);
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
