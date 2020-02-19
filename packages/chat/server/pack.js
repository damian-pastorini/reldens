/**
 *
 * Reldens - Chat Server Package
 *
 */

const { RoomChat } = require('./room');
const { ChatMessageActions } = require('./message-actions');
const { EventsManager } = require('../../game/events-manager');
const { PackInterface } = require('../../features/server/pack-interface');

class ChatPack extends PackInterface
{

    setupPack()
    {
        // rooms is the list of the current feature rooms names that later will be sent to the client and used to join.
        this.rooms = ['chat'];
        // then we can use the event manager to append the feature in every action required:
        EventsManager.on('reldens.roomsDefinition', (roomsList) => {
            // here we are adding the chat room to be defined in the game server:
            roomsList.push({roomName: 'chat', room: RoomChat});
        });
        // when the client sent a message to any room it will be checked by all the global messages defined:
        EventsManager.on('reldens.roomsMessageActionsGlobal', (roomMessageActions) => {
            roomMessageActions.chat = ChatMessageActions;
        });
    }

}

module.exports.ChatPack = ChatPack;
