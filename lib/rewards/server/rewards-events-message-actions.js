/**
 *
 * Reldens - RewardsEventsMessageActions
 *
 */

const { RewardsConst } = require('../constants');
const { sc } = require('@reldens/utils');

class RewardsEventsMessageActions
{

    async executeMessageActions(client, message, room, playerSchema)
    {
        if(!sc.hasOwn(message, 'act')){
            return false;
        }
        if(-1 === message.act.indexOf(RewardsConst.PREFIX)){
            return false;
        }
        if(RewardsConst.ACTIONS.ACCEPT_REWARD === message.act){
            // @TODO - WIP
            // this.giveRewardsToPlayer(client, message, room, playerSchema);
        }
    }

}

module.exports.RewardsEventsMessageActions = RewardsEventsMessageActions;
