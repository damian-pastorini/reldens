/**
 *
 * Reldens - MessagesProcessor
 *
 */

const { ClanMessageHandler } = require('./clan-message-handler');
const { TeamMessageHandler } = require('./team-message-handler');
const { sc } = require('@reldens/utils');

class MessagesProcessor
{

    static processClanMessagesQueue(roomEvents, clanMessageListener)
    {
        if(!sc.isArray(roomEvents.clanMessagesQueue)){
            return;
        }
        if(0 === roomEvents.clanMessagesQueue.length){
            return;
        }
        for(let message of roomEvents.clanMessagesQueue){
            clanMessageListener.handleClanMessage(message, new ClanMessageHandler({roomEvents, message}));
        }
        roomEvents.clanMessagesQueue = [];
    }

    static processTeamMessagesQueue(roomEvents, teamMessageListener)
    {
        if(!sc.isArray(roomEvents.teamMessagesQueue)){
            return;
        }
        if(0 === roomEvents.teamMessagesQueue.length){
            return;
        }
        for(let message of roomEvents.teamMessagesQueue){
            teamMessageListener.handleTeamMessage(message, new TeamMessageHandler({roomEvents, message}));
        }
        roomEvents.teamMessagesQueue = [];
    }

}

module.exports.MessageProcessor = MessagesProcessor;
