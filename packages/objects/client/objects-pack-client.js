/**
 *
 * Reldens - Chat Client Package.
 *
 */

const { ObjectsMessageObserver } = require('./message-observer');
const { GameConst } = require('../../game/constants');

// @TODO: replace by events.
// define the rooms:
let joinedRoomsOnMessage = {};
joinedRoomsOnMessage[GameConst.ROOM_EVENTS] = ObjectsMessageObserver;

module.exports = { joinedRoomsOnMessage };
