/**
 *
 * Reldens - ChatMessageObserver
 *
 * This class will listen the messages received by the room and run the related actions, for example show the received
 * messages in the interface.
 *
 */

const chatConst = require('./constants');

class ChatMessageObserver
{

    observeMessage(message, gameManager)
    {
        // chat events:
        let uiScene = gameManager.gameEngine.uiScene;
        if(uiScene && message.act === chatConst.CHAT_ACTION){
            let readPanel = uiScene.uiChat.getChildByProperty('id', chatConst.CHAT_MESSAGES);
            if(readPanel){
                readPanel.innerHTML += `${message[chatConst.CHAT_FROM]}: ${message[chatConst.CHAT_MESSAGE]}<br/>`;
                readPanel.scrollTo(0, readPanel.scrollHeight);
            }
        }
    }

}

module.exports = ChatMessageObserver;
