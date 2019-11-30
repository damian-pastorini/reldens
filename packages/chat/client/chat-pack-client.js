/**
 *
 * Reldens - Chat Client Package.
 *
 */

const { ChatMessageObserver } = require('./message-observer');
const { ChatUiCreate } = require('./ui-create');
const { ChatConst } = require('../constants');
const { GameConst } = require('../../game/constants');

// define the rooms:
let joinedRoomsOnMessage = {};
// @TODO: replace by events.
joinedRoomsOnMessage[ChatConst.CHAT_GLOBAL] = ChatMessageObserver;
joinedRoomsOnMessage[GameConst.ROOM_EVENTS] = ChatMessageObserver;

module.exports = {
    // features name convention - joinRooms has to be the name of the room instance.
    joinRooms: [ChatConst.CHAT_GLOBAL],
    // features name convention - joinedRoomsOnMessage are the listeners for the rooms received messages in the client.
    joinedRoomsOnMessage: joinedRoomsOnMessage,
    // @NOTE: check the share constants to see the assets types available (for now only 3, html, image, spritesheet),
    // the parameters for each asset will depend on the type (for example spritesheet requires the size data).
    // features name convention - preloadAssets hast to be an array of assets defined to be loaded.
    // @TODO: replace by events.
    preloadAssets: [
        {assetType: GameConst.PRELOAD_HTML, name: 'uiChat', path: 'assets/features/chat/templates/ui-chat.html'},
        {assetType: GameConst.PRELOAD_HTML, name: 'uiChatMessage', path: 'assets/features/chat/templates/message.html'}
    ],
    // features name convention - uiCreate has to be a class where the constructor should receive the scene-preloader
    // instance and should implement the uiCreate method.
    uiCreate: ChatUiCreate
};
