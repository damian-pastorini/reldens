/**
 *
 * Reldens - RewardDropValidator
 *
 * Validates and extracts required parameters for reward drop handling in the world.
 *
 */

const { Logger, sc } = require('@reldens/utils');

class RewardDropValidator
{

    /**
     * @param {Object} params
     * @returns {Object|boolean}
     */
    static fetchValidParams(params)
    {
        let rewardEventData = sc.get(params, 'rewardEventData', false);
        if(!rewardEventData){
            Logger.critical('RewardEventData not found on WorldDropHandler.');
            return false;
        }
        let roomScene = sc.get(params, 'roomScene', false);
        if(!roomScene){
            Logger.critical('RoomScene not found on WorldDropHandler.');
            return false;
        }
        let targetObjectBody = sc.get(rewardEventData.targetObject, 'objectBody', false);
        if(!targetObjectBody){
            Logger.critical('Target object "objectBody" not found on reward event data.');
            return false;
        }
        let itemRewards = sc.get(rewardEventData, 'itemRewards', []);
        if(0 === itemRewards.length){
            Logger.critical('Items rewards not found on WorldDropHandler.');
            return false;
        }
        return {roomScene, itemRewards, targetObjectBody};
    }

}

module.exports.RewardDropValidator = RewardDropValidator;