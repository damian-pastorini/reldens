/**
 *
 * Reldens - RewardsDropsProcessor
 *
 */

const { WorldDropHandler } = require('./world-drop-handler');
const { RewardsDropsMapper } = require('./rewards-drops-mapper');

class RewardsDropsProcessor
{

    static async processRewardsDrops(roomScene, rewardEventData)
    {
        let rewards = await WorldDropHandler.createRewardItemObjectsOnRoom({
            roomScene,
            rewardEventData
        });
        if(!rewards){
            return;
        }
        // @TODO - BETA - Add new event before dispose and broadcast.
        roomScene.disableOnDispose();
        roomScene.broadcast('*', RewardsDropsMapper.mapDropsData(rewards, roomScene));
    }
}

module.exports.RewardsDropsProcessor = RewardsDropsProcessor;
