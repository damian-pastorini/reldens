/**
 *
 * Reldens - ChatMessageObserver
 *
 * This class will listen the messages received by the room and run the related actions, for example show the received
 * messages in the interface.
 *
 */

const { ChatConst } = require('../constants');

class ChatMessageObserver
{

    observeMessage(message, gameManager)
    {
        // chat events:
        let uiScene = gameManager.gameEngine.uiScene;
        if(uiScene && message.act === ChatConst.CHAT_ACTION){
            let readPanel = uiScene.uiChat.getChildByProperty('id', ChatConst.CHAT_MESSAGES);
            if(readPanel){
                let messageTemplate = uiScene.cache.html.get('uiChatMessage');
                let output = gameManager.gameEngine.TemplateEngine.render(messageTemplate, {
                    from: message[ChatConst.CHAT_FROM],
                    color: ChatConst.colors[message.t],
                    message: message[ChatConst.CHAT_MESSAGE]
                });
                readPanel.innerHTML += output;
                readPanel.scrollTo(0, readPanel.scrollHeight);
            }
        }
    }

}

module.exports = ChatMessageObserver;
