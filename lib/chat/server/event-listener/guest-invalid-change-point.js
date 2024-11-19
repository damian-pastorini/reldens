/**
 *
 * Reldens - GuestInvalidChangePoint
 *
 */

const { MessageFactory } = require('../../message-factory');
const { ChatConst } = require('../../constants');
const { Logger } = require('@reldens/utils');

class GuestInvalidChangePoint
{

    async sendMessage(event, chatManager)
    {
        let message = ChatConst.SNIPPETS.GUEST_INVALID_CHANGE_POINT;
        let messageObject = MessageFactory.create(ChatConst.TYPES.ERROR, message, {});
        event.contactClient.send('*', messageObject);
        await chatManager.saveMessage(
            MessageFactory.withDataToJson(message, {}),
            event.playerSchema.player_id,
            event.playerSchema.state.room_id,
            false,
            ChatConst.TYPES.ERROR
        ).catch((error) => {
            Logger.error('Save chat message error on player damage callback.', error);
        });
    }

}

module.exports.GuestInvalidChangePoint = GuestInvalidChangePoint;
