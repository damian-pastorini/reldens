/**
 *
 * Reldens - TeamMessageListener
 *
 */

const { TeamMessageHandler } = require('./team-message-handler');
const { Logger, sc } = require('@reldens/utils');

class TeamMessageListener
{

    async executeClientMessageActions(props)
    {
        let message = sc.get(props, 'message', false);
        if(!message){
            Logger.error('Missing message data on TeamMessageListener.', props);
            return false;
        }
        let roomEvents = sc.get(props, 'roomEvents', false);
        if(!roomEvents){
            Logger.error('Missing RoomEvents on TeamMessageListener.', props);
            return false;
        }
        let tradeMessageHandler = new TeamMessageHandler({roomEvents, message});
        tradeMessageHandler.updateContents();
    }

}

module.exports.TeamMessageListener = TeamMessageListener;
