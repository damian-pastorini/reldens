/**
 *
 * Reldens - Chat Client Package.
 *
 */

const { ChatUi } = require('./chat-ui');
const { ChatConst } = require('../constants');
const { PackInterface } = require('../../features/pack-interface');
const { Logger, sc} = require('@reldens/utils');

class ChatPack extends PackInterface
{

    setupPack(props)
    {
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in ChatPack.');
        }
        this.joinRooms = [ChatConst.CHAT_GLOBAL];
        // chat messages are global for all rooms so we use the generic event for every joined room:
        this.events.on('reldens.joinedRoom', (room, gameManager) => {
            this.listenMessages(room, gameManager);
        });
        this.events.on('reldens.preloadUiScene', (preloadScene) => {
            preloadScene.load.html('chat', 'assets/features/chat/templates/ui-chat.html');
            preloadScene.load.html('chatMessage', 'assets/features/chat/templates/message.html');
        });
        this.events.on('reldens.createUiScene', (preloadScene) => {
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
            let output = gameManager.gameEngine.parseTemplate(messageTemplate, {
                from: message[ChatConst.CHAT_FROM],
                color: ChatConst.colors[message.t],
                message: message[ChatConst.CHAT_MESSAGE]
            });
            readPanel.innerHTML += output;
            // @TODO - BETA - Replace all the in-code styles by classes.
            if(uiChat.getChildByProperty('id', 'chat-ui').style.display === 'block'){
                readPanel.scrollTo(0, readPanel.scrollHeight);
            } else {
                if(gameManager.config.get('client/ui/chat/notificationBalloon')){
                    let chatBalloon = uiChat.getChildByProperty('id', ChatConst.CHAT_BALLOON);
                    chatBalloon.style.display = 'block';
                }
            }
        });
    }

}

module.exports.ChatPack = ChatPack;
