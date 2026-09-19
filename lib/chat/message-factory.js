/**
 *
 * Reldens - MessageFactory
 *
 * Creates standardized chat message objects for client-server communication.
 *
 */

const { GameConst } = require('../game/constants');
const { ChatConst } = require('./constants');
const { Logger, sc } = require('@reldens/utils');

class MessageFactory
{

    /**
     * @param {number} type
     * @param {string} message
     * @param {Object} [messageData]
     * @param {string} [from]
     * @param {string} [to]
     * @returns {Object|boolean}
     */
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
            messageSendModel[ChatConst.MESSAGE.FROM] = from;
        }
        if(to){
            messageSendModel[ChatConst.MESSAGE.TO] = to;
        }
        if(0 < Object.keys(messageData).length){
            messageSendModel[ChatConst.MESSAGE.DATA.KEY] = messageData;
        }
        return messageSendModel;
    }

    /**
     * @param {string} message
     * @param {Object} [messageData]
     * @returns {string}
     */
    static withDataToJson(message, messageData = {})
    {
        return sc.toJsonString(Object.assign({[ChatConst.MESSAGE.KEY]: message.toString()}, messageData));
    }

}

module.exports.MessageFactory = MessageFactory;
