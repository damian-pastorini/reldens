/**
 *
 * Reldens - RewardsEventsSender
 *
 */

const { RewardsConst } = require('../constants');
const { Logger } = require('@reldens/utils');

class RewardsEventsSender
{

    sendUpdates(room, playerSchema, rewards)
    {
        let client = room?.fetchPlayerClient(playerSchema);
        if(!client){
            Logger.error('Player missing client.', playerSchema?.player_id);
            return false;
        }
        if(!rewards){
            Logger.warning('Missing new total rewards data.');
            return false;
        }
        client.send('*', {act: RewardsConst.ACTIONS.UPDATE, rewards, listener: RewardsConst.KEY});
        return true;
    }

}

module.exports.RewardsEventsSender = RewardsEventsSender;
