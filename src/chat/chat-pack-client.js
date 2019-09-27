/**
 *
 * Reldens - Chat Package.
 *
 */

const share = require('./constants');

// define the rooms:
let joinedRoomsOnMessage = {};
joinedRoomsOnMessage[share.CHAT_GLOBAL] = require('./message-observer');

module.exports = {
    joinRooms: [share.CHAT_GLOBAL],
    joinedRoomsOnMessage: joinedRoomsOnMessage
};
