/**
 *
 * Reldens - MessagesProcessor
 *
 * Processes queued team and clan messages when the UI scene becomes ready.
 *
 */

const { ClanMessageHandler } = require('./clan-message-handler');
const { TeamMessageHandler } = require('./team-message-handler');
const { sc } = require('@reldens/utils');

/**
 * @typedef {import('../../rooms/client/room-events').RoomEvents} RoomEvents
 * @typedef {import('./clan-message-listener').ClanMessageListener} ClanMessageListener
 * @typedef {import('./team-message-listener').TeamMessageListener} TeamMessageListener
 */
class MessagesProcessor
{

    /**
     * @param {RoomEvents} roomEvents
     * @param {ClanMessageListener} clanMessageListener
     */
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

    /**
     * @param {RoomEvents} roomEvents
     * @param {TeamMessageListener} teamMessageListener
     */
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
