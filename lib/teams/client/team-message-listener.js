/**
 *
 * Reldens - TeamMessageListener
 *
 */

const { TeamMessageHandler } = require('./team-message-handler');
const { TeamsConst } = require('../constants');
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
        let teamMessageHandler = new TeamMessageHandler({roomEvents, message});
        if(!teamMessageHandler.validate()){
            if(this.isTeamMessage(message)){
                if(!roomEvents.teamMessagesQueue){
                    roomEvents.teamMessagesQueue = [];
                }
                roomEvents.teamMessagesQueue.push(message);
            }
            Logger.error('Invalid TeamMessageHandler', teamMessageHandler);
            return false;
        }
        if(!this.isTeamMessage(message)){
            return false;
        }
        return this.handleTeamMessage(message, teamMessageHandler);
    }

    handleTeamMessage(message, teamMessageHandler)
    {
        if(TeamsConst.ACTIONS.TEAM_INVITE === message.act){
            return teamMessageHandler.showTeamRequest();
        }
        if(TeamsConst.ACTIONS.TEAM_UPDATE === message.act){
            return teamMessageHandler.showTeamBox();
        }
        if(TeamsConst.ACTIONS.TEAM_LEFT === message.act){
            return teamMessageHandler.removeTeamUi();
        }
        return true;
    }

    isTeamMessage(message)
    {
        return 0 === message.act.indexOf(TeamsConst.TEAM_PREF);
    }
}

module.exports.TeamMessageListener = TeamMessageListener;
