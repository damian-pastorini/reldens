/**
 *
 * Reldens - RewardsEventsDataSender
 *
 */

const { RewardsToActionsMapper } = require('./mappers/rewards-to-actions-mapper');
const { RewardsConst } = require('../constants');
const { GameConst } = require('../../game/constants');
const { Logger } = require('@reldens/utils');

class RewardsEventsDataSender
{

    constructor()
    {
        this.rewardsActionsMapper = new RewardsToActionsMapper();
    }

    sendUpdates(room, playerSchema, rewards)
    {
        let client = room?.fetchPlayerClient(playerSchema);
        if(!client){
            Logger.error('Player missing client for "sendUpdates".', playerSchema?.player_id);
            return false;
        }
        if(!rewards){
            Logger.warning('Missing new total rewards data.');
            return false;
        }
        client.send('*', {
            [GameConst.ACTION_KEY]: RewardsConst.ACTIONS.UPDATE,
            rewards: this.rewardsActionsMapper.map(rewards),
            listener: RewardsConst.KEY
        });
        return true;
    }

    sendAcceptedRewardUpdate(room, rewardState, playerSchema)
    {
        let client = room?.fetchPlayerClient(playerSchema);
        if(!client){
            Logger.error('Player missing client for "sendAcceptedRewardUpdate".', playerSchema?.player_id);
            return false;
        }
        if(!rewardState){
            Logger.warning('Missing rewardState data.');
            return false;
        }
        let acceptedReward = this.rewardsActionsMapper.mapSingle(rewardState.reward);
        client.send('*', {
            [GameConst.ACTION_KEY]: RewardsConst.ACTIONS.ACCEPTED_REWARD,
            acceptedReward,
            listener: RewardsConst.KEY
        });
        return true;
    }

}

module.exports.RewardsEventsDataSender = RewardsEventsDataSender;