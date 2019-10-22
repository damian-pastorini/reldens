/**
 *
 * Reldens - Chat Client Package.
 *
 */

const ObjectsMessageObserver = require('./message-observer');
const share = require('../utils/constants');

// define the rooms:
let joinedRoomsOnMessage = {};
joinedRoomsOnMessage[share.ROOM_EVENTS] = ObjectsMessageObserver;

module.exports = {
    // features name convention - joinedRoomsOnMessage are the listeners for the rooms received messages in the client.
    joinedRoomsOnMessage: joinedRoomsOnMessage
};
