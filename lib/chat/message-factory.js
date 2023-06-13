/**
 *
 * Reldens - MessageFactory
 *
 */

const { GameConst } = require('../game/constants');
const { ChatConst } = require('./constants');
const { Logger } = require('@reldens/utils');

class MessageFactory
{

    static create(type, message, messageData = {}, from, to)
    {
        if(!type){
            Logger.error('Missing "type" on MessageFactory.', {type, message});
            return false;
        }
        if(!message){
            Logger.error('Missing "message" on MessageFactory.', {type, message});
            return false;
        }
        let messageSendModel = {
            [GameConst.ACTION_KEY]: ChatConst.CHAT_ACTION,
            [ChatConst.TYPES.KEY]: type,
            [ChatConst.MESSAGE.KEY]: message,
        };
        if(from){
            messageSendModel[ChatConst.MESSAGE.DATA.FROM] = from;
        }
        if(to){
            messageSendModel[ChatConst.MESSAGE.DATA.TO] = to;
        }
        if(0 < Object.keys(messageData).length){
            messageSendModel[ChatConst.MESSAGE.DATA.KEY] = messageData;
        }
        return messageSendModel;
    }

    static withDataToJson(message, messageData = {})
    {
        return JSON.stringify(Object.assign({[ChatConst.MESSAGE.KEY]: message.toString()}, messageData));
    }

}

module.exports.MessageFactory = MessageFactory;
