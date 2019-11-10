/**
 *
 * Reldens - Chat Client Package.
 *
 */

const ObjectsMessageObserver = require('./message-observer');
const { GameConst } = require('../../game/constants');

// define the rooms:
let joinedRoomsOnMessage = {};
joinedRoomsOnMessage[GameConst.ROOM_EVENTS] = ObjectsMessageObserver;

// @TODO: - Seiyria - you can just do `module.exports = { joinedRoomsOnMessage }`
module.exports = {
    // features name convention - joinedRoomsOnMessage are the listeners for the rooms received messages in the client.
    joinedRoomsOnMessage: joinedRoomsOnMessage
};
