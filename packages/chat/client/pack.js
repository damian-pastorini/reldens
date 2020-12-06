/**
 *
 * Reldens - Chat Client Package.
 *
 */

const { ChatUi } = require('./chat-ui');
const { ChatConst } = require('../constants');
const { Logger } = require('@reldens/utils');
const { EventsManagerSingleton } = require('@reldens/utils');

class ChatPack
{

    constructor()
    {
        this.joinRooms = [ChatConst.CHAT_GLOBAL];
        // chat messages are global for all rooms so we use the generic event for every joined room:
        EventsManagerSingleton.on('reldens.joinedRoom', (room, gameManager) => {
            this.listenMessages(room, gameManager);
        });
        EventsManagerSingleton.on('reldens.preloadUiScene', (preloadScene) => {
            preloadScene.load.html('chat', 'assets/features/chat/templates/ui-chat.html');
            preloadScene.load.html('chatMessage', 'assets/features/chat/templates/message.html');
        });
        EventsManagerSingleton.on('reldens.createUiScene', (preloadScene) => {
            this.uiManager = new ChatUi(preloadScene);
            this.uiManager.createUi();
        });
    }

    listenMessages(room, gameManager)
    {
        room.onMessage((message) => {
            if(message.act !== ChatConst.CHAT_ACTION){
                return;
            }
            let uiChat = gameManager.getUiElement('chat');
            if(!uiChat){
                Logger.error('Chat interface not found.');
                return;
            }
            let readPanel = uiChat.getChildByProperty('id', ChatConst.CHAT_MESSAGES);
            if(!readPanel){
                Logger.error('Chat UI not found.');
                return;
            }
            let messageTemplate = gameManager.gameEngine.uiScene.cache.html.get('chatMessage');
            // @TODO - BETA.16 - R16-4: implement chat notifications balloon.
            let output = gameManager.gameEngine.parseTemplate(messageTemplate, {
                from: message[ChatConst.CHAT_FROM],
                color: ChatConst.colors[message.t],
                message: message[ChatConst.CHAT_MESSAGE]
            });
            readPanel.innerHTML += output;
            readPanel.scrollTo(0, readPanel.scrollHeight);
        });
    }

}

module.exports.ChatPack = ChatPack;
