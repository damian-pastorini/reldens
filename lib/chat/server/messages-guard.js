/**
 *
 * Reldens - MessagesGuard
 *
 */

const { GameConst } = require('../../game/constants');
const { ChatConst } = require('../constants');
const { sc } = require('@reldens/utils');

class MessagesGuard
{

    static validate(message)
    {
        if(ChatConst.CHAT_ACTION !== sc.get(message, GameConst.ACTION_KEY, '')){
            return false;
        }
        return 0 !== sc.get(message, ChatConst.MESSAGE.KEY, '').trim().replace('#', '').replace('@', '').length;
    }

}

module.exports.MessagesGuard = MessagesGuard;
