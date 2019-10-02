/**
 *
 * Reldens - Chat Client Package.
 *
 */

const ChatMessageObserver = require('./message-observer');
const ChatRegister = require('../chat/register');
const chatConst = require('./constants');
const share = require('../utils/constants');

// define the rooms:
let joinedRoomsOnMessage = {};
joinedRoomsOnMessage[chatConst.CHAT_GLOBAL] = ChatMessageObserver;
joinedRoomsOnMessage[share.ROOM_EVENTS] = ChatMessageObserver;

module.exports = {
    // features name convention - joinRooms has to be the name of the room instance.
    joinRooms: [chatConst.CHAT_GLOBAL],
    // features name convention - joinedRoomsOnMessage are the listeners for the rooms received messages in the client.
    joinedRoomsOnMessage: joinedRoomsOnMessage,
    registerUi: ChatRegister
};
