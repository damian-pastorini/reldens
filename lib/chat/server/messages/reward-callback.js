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
        let { itemRewards, player_id, room_id, client, chatManager } = props;
        if (null === client) {
            return false;
        }
        let sendMessage = '';
        for (let i = 0; i < itemRewards.length; i++) {
            let { reward, item } = itemRewards[i];
            let message = ChatConst.MESSAGES.REWARD + reward.drop_quantity + ' ' + item.label;
            if (itemRewards.length > 1 && i !== itemRewards.length - 1) {
                message += ' - ';
            }
            sendMessage += message;
        }
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
