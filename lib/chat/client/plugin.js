/**
 *
 * Reldens - Chat Client Plugin.
 *
 */

const { ChatUi } = require('./chat-ui');
const { MessagesListener } = require('./messages-listener');
const { PluginInterface } = require('../../features/plugin-interface');
const { ChatConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

class ChatPlugin extends PluginInterface
{

    setup(props)
    {
        this.events = sc.get(props, 'events', false);
        this.messagesQueu = [];
        this.uiManager = false;
        if(!this.events){
            Logger.error('EventsManager undefined in ChatPlugin.');
        }
        this.joinRooms = [ChatConst.CHAT_GLOBAL];
        // chat messages are global for all rooms, so we use the generic event for every joined room:
        // eslint-disable-next-line no-unused-vars
        this.events.on('reldens.joinedRoom', async (room, gameManager) => {
            await MessagesListener.listenMessages(room, this);
        });

        this.events.on('reldens.preloadUiScene', (uiSceneManager) => {
            uiSceneManager.uiSceneDriver.loadHTML('chat', 'assets/features/chat/templates/ui-chat.html');
            uiSceneManager.uiSceneDriver.loadHTML('chatMessage', 'assets/features/chat/templates/message.html');
        });

        this.events.on('reldens.createUiScene', (uiSceneManager) => {
            this.uiManager = new ChatUi(uiSceneManager);
            this.uiManager.createUi();
            this.uiManager.processMessagesQueue(this.messagesQueu);
        });
    }

}

module.exports.ChatPlugin = ChatPlugin;
