/**
 *
 * Reldens - Chat Client Package.
 *
 */

const ChatMessageObserver = require('./message-observer');
const ChatUiCreate = require('./ui-create');
const chatConst = require('./constants');
const share = require('../utils/constants');

// define the rooms:
let joinedRoomsOnMessage = {};
// @TODO: - Seiyria - it's confusing that there are two places that these variables are coming from.
joinedRoomsOnMessage[chatConst.CHAT_GLOBAL] = ChatMessageObserver;
joinedRoomsOnMessage[share.ROOM_EVENTS] = ChatMessageObserver;

module.exports = {
    // features name convention - joinRooms has to be the name of the room instance.
    joinRooms: [chatConst.CHAT_GLOBAL],
    // features name convention - joinedRoomsOnMessage are the listeners for the rooms received messages in the client.
    joinedRoomsOnMessage: joinedRoomsOnMessage,
    // @NOTE: check the share constants to see the assets types available (for now only 3, html, image, spritesheet),
    // the parameters for each asset will depend on the type (for example spritesheet requires the size data).
    // features name convention - preloadAssets hast to be an array of assets defined to be loaded.
    preloadAssets: [
        {type: share.PRELOAD_HTML, name: 'uiChat', path: 'assets/features/chat/templates/ui-chat.html'},
        {type: share.PRELOAD_HTML, name: 'uiChatMessage', path: 'assets/features/chat/templates/message.html'}
    ],
    // features name convention - uiCreate has to be a class where the constructor should receive the scene-preloader
    // instance and should implement the uiCreate method.
    uiCreate: ChatUiCreate
};
