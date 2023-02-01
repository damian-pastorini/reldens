/**
 *
 * Reldens - RewardCallback
 *
 */

const { Logger } = require('@reldens/utils');
const { ChatConst } = require('../../constants');

class RewardCallback
{

    static async sendMessage(props)
    {
        let { reward, item_name, player_id, room_id, client, chatManager } = props;
        if (null === client) {
            return false;
        }
        let sendMessage = ChatConst.MESSAGES.REWARD + reward.drop_quantity + ' ' + item_name;
        let messageObject = {
            act: ChatConst.CHAT_ACTION,
            f: 'Rewards',
            m: sendMessage,
            t: ChatConst.CHAT_TYPE_REWARD
        };
        client.send(messageObject);
        await chatManager.saveMessage(
            sendMessage,
            (player_id || null),
            (room_id || null),
            false,
            ChatConst.CHAT_REWARD
        ).catch((err) => {
            Logger.error('Save chat message error on NPC damage callback.', err);
        });
    }

}

module.exports.RewardCallback = RewardCallback;
