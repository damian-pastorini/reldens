/**
 *
 * Reldens - Chat Client Package.
 *
 */

const share = require('./constants');

// define the rooms:
let joinedRoomsOnMessage = {};
joinedRoomsOnMessage[share.CHAT_GLOBAL] = require('./message-observer');

module.exports = {
    // features name convention - joinRooms has to be the name of the room instance.
    joinRooms: [share.CHAT_GLOBAL],
    // features name convention - joinedRoomsOnMessage are the listeners for the rooms received messages in the client.
    joinedRoomsOnMessage: joinedRoomsOnMessage
};
