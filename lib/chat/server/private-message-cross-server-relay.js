/**
 *
 * Reldens - PrivateMessageCrossServerRelay
 *
 * Relays a private message to the other servers when its recipient is not in the chat room of this server (never for a
 * recipient name longer than the player names or with characters a player name can not have), and delivers the relayed
 * messages to the recipients of this server chat room.
 *
 */

const { SignedServerToServerMessenger } = require('../../game/server/signed-server-to-server-messenger');
const { MessageFactory } = require('../message-factory');
const { Cleaner } = require('../cleaner');
const { ChatConst } = require('../constants');
const { UsersConst } = require('../../users/constants');
const { sc } = require('@reldens/utils');

/**
 * @typedef {import('./room-chat').RoomChat} RoomChat
 * @typedef {import('../../game/server/signed-server-to-server-messenger').SignedServerToServerMessengerProps} MessengerProps
 *
 * @typedef {Object} PrivateMessageRelayProps
 * @property {number} characterLimit
 * @property {number} maximumPlayerNameLength
 */
class PrivateMessageCrossServerRelay extends SignedServerToServerMessenger
{

    /**
     * @param {MessengerProps & PrivateMessageRelayProps} props
     */
    constructor(props)
    {
        super(props);
        /** @type {number} */
        this.characterLimit = props.characterLimit;
        /** @type {number} */
        this.maximumPlayerNameLength = props.maximumPlayerNameLength;
        /** @type {RoomChat|boolean} */
        this.chatRoom = false;
    }

    /**
     * @param {string} toPlayerName
     * @param {string} fromPlayerName
     * @param {string} text
     * @returns {Promise<number|boolean>}
     */
    async relayPrivateMessage(toPlayerName, fromPlayerName, text)
    {
        if(
            this.maximumPlayerNameLength < toPlayerName.length
            || toPlayerName.replace(UsersConst.PLAYER_NAME_INVALID_CHARACTERS, '') !== toPlayerName
        ){
            return false;
        }
        let serversResponses = await this.sendToServers(
            this.otherServersUrls,
            ChatConst.SYNC.PRIVATE_MESSAGE,
            toPlayerName,
            {fromPlayerName, text}
        );
        let recipientPlayerId = false;
        for(let serverResponse of serversResponses){
            if(sc.isNumber(sc.get(serverResponse.response, 'toPlayerId', false))){
                recipientPlayerId = serverResponse.response.toPlayerId;
            }
        }
        return recipientPlayerId;
    }

    /**
     * @param {string} action
     * @param {string} toPlayerName
     * @param {Object} payload
     * @returns {Promise<{isSuccess: boolean, toPlayerId: number|boolean}>}
     */
    async receiveAction(action, toPlayerName, payload)
    {
        if(ChatConst.SYNC.PRIVATE_MESSAGE !== action){
            return {isSuccess: false, toPlayerId: false};
        }
        return {isSuccess: true, toPlayerId: this.deliverPrivateMessage(toPlayerName, payload)};
    }

    /**
     * @param {string} toPlayerName
     * @param {Object} payload
     * @returns {number|boolean}
     */
    deliverPrivateMessage(toPlayerName, payload)
    {
        if(
            !this.chatRoom
            || !sc.isString(payload.text)
            || !sc.isString(payload.fromPlayerName)
            || '' === payload.fromPlayerName
            || payload.fromPlayerName.replace(UsersConst.PLAYER_NAME_INVALID_CHARACTERS, '') !== payload.fromPlayerName
        ){
            return false;
        }
        let text = Cleaner.cleanMessage(payload.text, this.characterLimit);
        let activePlayerTo = this.chatRoom.activePlayerByPlayerName(toPlayerName, this.chatRoom.roomId);
        if(!activePlayerTo || '' === text.trim()){
            return false;
        }
        activePlayerTo.client.send('*', MessageFactory.create(ChatConst.TYPES.PRIVATE, text, {}, payload.fromPlayerName));
        return activePlayerTo.playerId;
    }

}

module.exports.PrivateMessageCrossServerRelay = PrivateMessageCrossServerRelay;
